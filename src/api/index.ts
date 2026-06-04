// src/api/index.ts
// API 请求封装 — 对接旧版后端（CQU tunasync）静态 JSON 接口
//
// 数据流：
//   GET /static/tunasync.json       → OldTunasyncJob[]（旧后端静态 JSON）
//   GET /local_data.json            → LocalMeta（本地补充元数据，随前端构建发布）
//   transformOldJobs()              → Mirror[]（前端完成格式转换）
//   GET /api/getip                  → { is_cqu: 1|0 } 校园网检测

import type { Mirror, CampusNetworkStatus } from '../types';

import { fetchOldTunasyncData, transformOldJobs } from './oldBackendAdapter';
import type { LocalMeta } from './transform';

// ── 本地元数据缓存（只需加载一次）────────────────────────────────────────────
// 缓存 Promise 本身而非结果，避免并发请求时重复发起网络请求（竞态）
let _localDataPromise: Promise<Record<string, LocalMeta>> | null = null;

/**
 * 失败时回到空对象作为兜底，但**保留** Promise 拒绝信息给上层 logger
 * （上次实现把 catch 吞掉了 —— 现在保留警告并允许一次性重试）
 */
function getLocalData(): Promise<Record<string, LocalMeta>> {
  if (_localDataPromise) return _localDataPromise;

  _localDataPromise = fetch('/local_data.json', { cache: 'no-cache' })
    .then(async (res) => {
      if (!res.ok) throw new Error(`local_data.json HTTP ${res.status}`);
      const json = (await res.json()) as unknown;
      // 防御：必须是非数组的对象
      if (!json || typeof json !== 'object' || Array.isArray(json)) {
        throw new Error('local_data.json: invalid root, expected object');
      }
      return json as Record<string, LocalMeta>;
    })
    .catch((e) => {
      // 失败时清空缓存，下一次调用会重试（避免一次失败导致整次会话都没补充信息）
      _localDataPromise = null;
      console.warn(
        '[API] local_data.json 加载失败，镜像名称/描述将退回到默认值。重试将在下次请求触发。',
        e
      );
      return {};
    });
  return _localDataPromise;
}

// ── 公开 API ──────────────────────────────────────────────────────────────────

/**
 * 获取所有镜像列表
 * 从旧后端 /static/tunasync.json 获取同步状态，与本地 local_data.json 合并
 */
export const fetchMirrors = async (): Promise<Mirror[]> => {
  const [jobs, localData] = await Promise.all([
    fetchOldTunasyncData(),
    getLocalData(),
  ]);
  return transformOldJobs(jobs, localData);
};

/**
 * 获取单个镜像详情（从全量列表查找，不额外发请求）
 */
export const fetchMirrorByName = async (name: string): Promise<Mirror> => {
  const mirrors = await fetchMirrors();
  const mirror = mirrors.find((m) => m.id.toLowerCase() === name.toLowerCase());
  if (!mirror) throw new Error(`Mirror not found: ${name}`);
  return mirror;
};

/**
 * 判断客户端网络类型
 * GET /api/getip → { is_cqu: 1|0, remote_addr: "..." }
 * is_cqu=1 → 校内 "1" | 非校内且 remote_addr 为纯 IPv6 → "6" | 其他 → "0"
 * 注：IPv4 地址在 IPv6 环境下显示为 "::ffff:x.x.x.x"，不算 IPv6
 */
export const fetchCampusNetworkStatus = async (): Promise<CampusNetworkStatus> => {
  const API_BASE = import.meta.env.VITE_API_BASE ?? '';
  const res = await fetch(`${API_BASE}/api/getip`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`getip HTTP ${res.status}`);
  const json = (await res.json()) as { is_cqu?: number; remote_addr?: string };
  if (json.is_cqu === 1) return '1';
  const addr = json.remote_addr ?? '';
  // 纯 IPv6：含 ":" 但不是 "::ffff:" 开头的 IPv4-mapped 地址
  if (addr.includes(':') && !addr.startsWith('::ffff:')) return '6';
  return '0';
};
