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
 * distro 名称 → tunasync mirror id 映射
 * isoinfo.json 的 distro 字段与 tunasync.json 的 name 字段不一致，需要手动映射
 */
const DISTRO_TO_MIRROR_ID: Record<string, string> = {
  'Ubuntu': 'ubuntu-releases',
  'Debian': 'debian-cd',
  'Arch Linux': 'archlinux',
  'Fedora': 'fedora',
  'Deepin': 'deepin-cd',
  'CentOS': 'centos',
  'Proxmox': 'proxmox',
  'Kali': 'kali-images',
  'Alpine': 'alpine',
  'ZeroTier': 'zerotier',
  'Temurin by Adoptium': 'adoptium',
  'Cygwin': 'cygwin',
  '.NET': 'dotnet',
  'TeX 排版系统': 'CTAN',
  'Python': 'python',
  'Blender': 'blender',
  'OpenJDK': 'openjdk',
  'KiCad': 'kicad',
  'VLC': 'videolan-ftp',
  'MSYS2': 'msys2',
};

/**
 * 从 isoinfo.json 的 url 路径推断 mirror id
 * 例: /ubuntu-releases/noble/... → "ubuntu-releases"
 */
function inferMirrorIdFromUrl(url: string): string | null {
  const parts = url.split('/').filter(Boolean);
  return parts.length > 0 ? parts[0] : null;
}

/**
 * 将 isoinfo.json 条目转换为 local_data.json 的 files 字段，并按 mirror id 合并
 */
function mergeIsoInfo(
  base: Record<string, LocalMeta>,
  isoData: Array<{ category: string; distro: string; urls: Array<{ name: string; url: string }> }>
): Record<string, LocalMeta> {
  const result = { ...base };

  for (const entry of isoData) {
    // 1. 优先用映射表
    let mirrorId = DISTRO_TO_MIRROR_ID[entry.distro];
    // 2. 回退：从第一个 url 路径推断
    if (!mirrorId && entry.urls.length > 0) {
      mirrorId = inferMirrorIdFromUrl(entry.urls[0].url) ?? undefined as unknown as string;
    }
    // 3. 再回退：distro 名转小写
    if (!mirrorId) mirrorId = entry.distro.toLowerCase().replace(/\s+/g, '');

    if (!mirrorId) continue;

    const files = entry.urls.map((u) => ({ name: u.name, url: u.url }));

    if (result[mirrorId]) {
      // 已有元数据，只补充 files
      result[mirrorId] = { ...result[mirrorId], files };
    } else {
      // 没有元数据，创建基本条目
      result[mirrorId] = {
        name: { zh: entry.distro, en: entry.distro },
        desc: { zh: '', en: '' },
        type: entry.category,
        files,
      };
    }
  }

  return result;
}

/**
 * 失败时回到空对象作为兜底，但**保留** Promise 拒绝信息给上层 logger
 * 同时拉取 local_data.json（描述/类型/helpUrl）和 isoinfo.json（文件列表），合并输出
 */
function getLocalData(): Promise<Record<string, LocalMeta>> {
  if (_localDataPromise) return _localDataPromise;

  _localDataPromise = Promise.all([
    fetch('/local_data.json', { cache: 'no-cache' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`local_data.json HTTP ${res.status}`);
        const json = (await res.json()) as unknown;
        if (!json || typeof json !== 'object' || Array.isArray(json)) {
          throw new Error('local_data.json: invalid root, expected object');
        }
        return json as Record<string, LocalMeta>;
      })
      .catch((e) => {
        console.warn('[API] local_data.json 加载失败，镜像名称/描述将退回到默认值。', e);
        return {} as Record<string, LocalMeta>;
      }),
    fetch(`${import.meta.env.VITE_API_BASE ?? ''}/static/isoinfo.json`, { cache: 'no-cache' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`isoinfo.json HTTP ${res.status}`);
        const json = (await res.json()) as unknown;
        if (!Array.isArray(json)) throw new Error('isoinfo.json: expected array');
        return json as Array<{ category: string; distro: string; urls: Array<{ name: string; url: string }> }>;
      })
      .catch((e) => {
        console.warn('[API] isoinfo.json 加载失败，文件列表将不可用。', e);
        return [];
      }),
  ]).then(([base, isoData]) => mergeIsoInfo(base, isoData));

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
 * status: is_cqu=1 → "1" | 非校内且纯 IPv6 → "6" | 其他 → "0"
 * ipv6: 纯 IPv6 地址（排除 "::ffff:" 前缀的 IPv4-mapped）
 */
export const fetchCampusNetworkStatus = async (): Promise<CampusNetworkStatus> => {
  const API_BASE = import.meta.env.VITE_API_BASE ?? '';
  const res = await fetch(`${API_BASE}/api/getip`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`getip HTTP ${res.status}`);
  const json = (await res.json()) as { is_cqu?: number | string; remote_addr?: string };
  const addr = json.remote_addr ?? '';
  const ipv6 = addr.includes(':') && !addr.startsWith('::ffff:');
  const status: CampusNetworkStatus['status'] = Number(json.is_cqu) === 1 ? '1' : ipv6 ? '6' : '0';

  // 将 IP 写入 cookie，供目录浏览等请求通过 JS 质询
  if (addr) {
    document.cookie = `client_ip=${encodeURIComponent(addr)}; path=/; SameSite=Lax; max-age=86400`;
  }

  return { status, ipv6 };
};
