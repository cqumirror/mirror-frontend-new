// src/api/oldBackendAdapter.ts
// 适配旧版后端（CQU tunasync）的静态 JSON 数据格式
//
// 旧后端数据源：
//   GET /static/tunasync.json  → OldTunasyncJob[]
//   GET /static/isoinfo.json   → OldIsoEntry[]
//   GET /static/notice.json    → OldNoticeData
//
// 与新版后端（tunasync-rs /jobs）的主要差异：
//   - 时间戳是 "YYYY-MM-DD HH:MM:SS" 字符串（UTC+8），不是 Unix 秒
//   - 状态值用 "success" 而非 "succeeded"
//   - 没有 next_schedule_ts / last_ended_ts / error_msg 字段

import type { LocalMeta } from './transform';

import type { Mirror, MirrorFile, MirrorStatus } from '@/types';

// 数据源地址：本地开发走 Vite proxy（相对路径），Cloudflare 等外部部署需指向 CQU 服务器
const API_BASE = import.meta.env.VITE_API_BASE ?? '';

// ── 旧后端原始类型 ─────────────────────────────────────────────────────────

/** 旧版 tunasync.json 条目 */
export interface OldTunasyncJob {
  name: string;
  last_update: string; // "YYYY-MM-DD HH:MM:SS" (UTC+8)
  status: 'success' | 'syncing' | 'paused' | 'failed' | 'pre-syncing' | string;
  upstream: string;
  size: string;
}

/** 旧版 isoinfo.json 条目 */
export interface OldIsoEntry {
  category: 'os' | 'app' | 'font' | string;
  distro: string;
  urls: { name: string; url: string }[];
}

/** 旧版 notice.json 根结构 */
export interface OldNoticeData {
  enabled: boolean;
  notice: {
    title: string;
    type: string;
    description: string;
    closable: boolean;
    center: boolean;
    showIcon: boolean;
    theme: string;
    callback?: string;
    action?: 'url' | 'news' | 'wiki';
  }[];
}

// ── 状态映射（旧后端状态值 → 前端 MirrorStatus）────────────────────────────

const OLD_STATUS_MAP: Record<string, MirrorStatus> = {
  success: 'succeeded',
  syncing: 'syncing',
  paused: 'paused',
  failed: 'failed',
  'pre-syncing': 'cached',
};

// ── 时间戳转换 ─────────────────────────────────────────────────────────────

/**
 * 将旧后端 "YYYY-MM-DD HH:MM:SS"（UTC+8）转换为 Unix 秒字符串
 * 旧前端的 timeConvert 方法：new Date(Date.UTC(y, m-1, d, h-8, min, sec))
 * 即把输入视为 UTC+8 并转为 UTC
 */
export function parseOldTimestamp(timeStr: string): string {
  if (!timeStr || typeof timeStr !== 'string') return '';

  // 匹配 "YYYY-MM-DD HH:MM:SS" 格式
  const match = timeStr.match(
    /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/
  );
  if (!match) {
    // 回退：尝试直接解析（可能是 ISO 格式或其他）
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) return Math.floor(d.getTime() / 1000).toString();
    return '';
  }

  const [, year, month, day, hour, min, sec] = match;
  // 构造 UTC 时间：输入是 UTC+8，减去 8 小时得到 UTC
  const utcDate = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour) - 8,
      Number(min),
      Number(sec)
    )
  );

  if (isNaN(utcDate.getTime())) return '';
  return Math.floor(utcDate.getTime() / 1000).toString();
}

// ── URL 安全校验 ───────────────────────────────────────────────────────────

const SAFE_URL_RE = /^(https?:\/\/[^/]|\/[^/]|\/\s*$)/i;

function sanitizeFileUrl(url: unknown): string | null {
  if (typeof url !== 'string' || !SAFE_URL_RE.test(url)) return null;
  return url;
}

function sanitizeFiles(files: unknown): MirrorFile[] {
  if (!Array.isArray(files)) return [];
  return files
    .map((f): MirrorFile | null => {
      if (!f || typeof f !== 'object') return null;
      const name = 'name' in f ? (f as Record<string, unknown>).name : undefined;
      const rawUrl = 'url' in f ? (f as Record<string, unknown>).url : undefined;
      const url = sanitizeFileUrl(rawUrl);
      if (typeof name !== 'string' || !url) return null;
      return { name, url };
    })
    .filter((f): f is MirrorFile => f !== null);
}

// ── 数据获取 ───────────────────────────────────────────────────────────────

/**
 * 获取旧后端 tunasync.json
 * 失败时返回空数组（降级处理，避免整页崩溃）
 */
export async function fetchOldTunasyncData(): Promise<OldTunasyncJob[]> {
  try {
    const res = await fetch(`${API_BASE}/static/tunasync.json`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`tunasync.json HTTP ${res.status}`);
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) {
      throw new Error('tunasync.json: expected array');
    }
    return data as OldTunasyncJob[];
  } catch (e) {
    console.error('[oldBackendAdapter] tunasync.json 加载失败:', e);
    return [];
  }
}

/**
 * 获取旧后端 isoinfo.json
 */
export async function fetchOldIsoData(): Promise<OldIsoEntry[]> {
  try {
    const res = await fetch(`${API_BASE}/static/isoinfo.json`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`isoinfo.json HTTP ${res.status}`);
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) {
      throw new Error('isoinfo.json: expected array');
    }
    return data as OldIsoEntry[];
  } catch (e) {
    console.warn('[oldBackendAdapter] isoinfo.json 加载失败:', e);
    return [];
  }
}

/**
 * 获取旧后端 notice.json
 */
export async function fetchOldNoticeData(): Promise<OldNoticeData | null> {
  try {
    const res = await fetch(`${API_BASE}/static/notice.json`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`notice.json HTTP ${res.status}`);
    return (await res.json()) as OldNoticeData;
  } catch (e) {
    console.warn('[oldBackendAdapter] notice.json 加载失败:', e);
    return null;
  }
}

// ── 数据转换 ───────────────────────────────────────────────────────────────

/**
 * 将单条旧后端数据 + 本地元数据转换为前端 Mirror 对象
 */
function convertOldItem(raw: OldTunasyncJob, local: LocalMeta = {}): Mirror {
  const id = raw.name;
  const defaultLabel = id.charAt(0).toUpperCase() + id.slice(1);

  return {
    id,
    url: `/${id}/`,
    name: {
      zh: local.name?.zh ?? defaultLabel,
      en: local.name?.en ?? defaultLabel,
    },
    desc: {
      zh: local.desc?.zh ?? `${defaultLabel} 镜像`,
      en: local.desc?.en ?? `Mirror of ${defaultLabel}`,
    },
    helpUrl: local.helpUrl ?? `/docs/${id}`,
    upstream: raw.upstream ?? '',
    size: raw.size ?? '1G',
    status: local.status ?? OLD_STATUS_MAP[raw.status] ?? 'unknown',
    lastUpdated: parseOldTimestamp(raw.last_update),
    nextScheduled: '', // 旧后端不提供
    lastSuccess: '',   // 旧后端不提供（last_update 含义不同）
    type: local.type ?? 'none',
    files: sanitizeFiles(local.files),
  };
}

/**
 * 批量转换：将旧后端 OldTunasyncJob[] + LocalData 合并为 Mirror[]
 * 跳过非法条目而不是抛错，避免单个坏数据让整页崩溃
 */
export function transformOldJobs(
  jobs: OldTunasyncJob[],
  localData: Record<string, LocalMeta> = {}
): Mirror[] {
  const out: Mirror[] = [];
  for (const job of jobs) {
    if (!job || typeof job.name !== 'string' || !job.name) {
      console.warn('[oldBackendAdapter] skipping job with missing name:', job);
      continue;
    }
    out.push(convertOldItem(job, localData[job.name]));
  }
  return out;
}
