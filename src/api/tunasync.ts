// 适配 tunasync 静态 JSON 与站点本地元数据。

import type { Mirror, MirrorFile, MirrorStatus, MirrorStorageType } from '@/types';
import { SAFE_URL_RE } from '@/utils/url';

export interface LocalMeta {
  name?: string;
  desc?: string;
  type?: string;
  files?: { name: string; url: string }[];
  helpUrl?: string;
  status?: MirrorStatus;
  popular?: boolean;
  storageType?: MirrorStorageType;
  upstream?: string;
  gitRepo?: boolean;
  message?: string;
}
// 数据源地址：本地开发走 Vite proxy（相对路径），Cloudflare 等外部部署需指向 CQU 服务器
const API_BASE = import.meta.env.VITE_API_BASE ?? '';

/** tunasync.json 条目 */
export interface TunasyncJob {
  name: string;
  last_update: string; // "YYYY-MM-DD HH:MM:SS +0800"
  last_update_ts: number; // Unix 秒
  last_started?: string;
  last_started_ts?: number;
  last_ended?: string;
  last_ended_ts?: number;
  next_schedule?: string;
  next_schedule_ts?: number;
  status: 'success' | 'syncing' | 'paused' | 'failed' | string;
  upstream: string;
  size: string;
}

const STATUS_MAP: Record<string, MirrorStatus> = {
  success: 'succeeded',
  syncing: 'syncing',
  paused: 'paused',
  failed: 'failed',
};

/**
 * 将tunasync "YYYY-MM-DD HH:MM:SS"（UTC+8）转换为 Unix 秒字符串
 * 旧前端的 timeConvert 方法：new Date(Date.UTC(y, m-1, d, h-8, min, sec))
 * 即把输入视为 UTC+8 并转为 UTC
 */
export function parseTimestamp(timeStr: string): string {
  if (!timeStr) return '';

  // 匹配 "YYYY-MM-DD HH:MM:SS" 格式，可选时区后缀 "+0800" / "+08:00"
  const match = timeStr.match(
    /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\s*([+-]\d{2}:?\d{2})?$/
  );
  if (!match) {
    // 回退：尝试直接解析（可能是 ISO 格式或其他）
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) return Math.floor(d.getTime() / 1000).toString();
    return '';
  }

  const [, year, month, day, hour, min, sec, tz] = match;

  let utcDate: Date;
  if (tz) {
    // 有时区信息，直接用 Date 解析（ISO 格式兼容）
    const normalizedTimezone = tz.includes(':') ? tz : `${tz.slice(0, 3)}:${tz.slice(3)}`;
    const iso = `${year}-${month}-${day}T${hour}:${min}:${sec}${normalizedTimezone}`;
    utcDate = new Date(iso);
  } else {
    // 无时区：假定 UTC+8，减去 8 小时得到 UTC
    utcDate = new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour) - 8,
        Number(min),
        Number(sec)
      )
    );
  }

  if (isNaN(utcDate.getTime())) return '';
  return Math.floor(utcDate.getTime() / 1000).toString();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJob(value: unknown): TunasyncJob | null {
  if (!isObject(value) || typeof value.name !== 'string' || !value.name.trim()) return null;

  const string = (key: string): string =>
    typeof value[key] === 'string' ? (value[key] as string) : '';
  const optionalNumber = (key: string): number | undefined =>
    typeof value[key] === 'number' && Number.isFinite(value[key])
      ? (value[key] as number)
      : undefined;

  return {
    name: value.name,
    last_update: string('last_update'),
    last_update_ts: optionalNumber('last_update_ts') ?? 0,
    last_started: string('last_started') || undefined,
    last_started_ts: optionalNumber('last_started_ts'),
    last_ended: string('last_ended') || undefined,
    last_ended_ts: optionalNumber('last_ended_ts'),
    next_schedule: string('next_schedule') || undefined,
    next_schedule_ts: optionalNumber('next_schedule_ts'),
    status: string('status') || 'unknown',
    upstream: string('upstream'),
    size: string('size'),
  };
}

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
 * 获取tunasync tunasync.json
 * 失败时抛出错误，由页面统一显示服务错误，避免把数据源故障误判成 404。
 */
export async function fetchTunasyncData(): Promise<TunasyncJob[]> {
  try {
    const res = await fetch(`${API_BASE}/static/tunasync.json`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`tunasync.json HTTP ${res.status}`);
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) {
      throw new Error('tunasync.json: expected array');
    }
    return data.flatMap((item) => {
      const job = parseJob(item);
      return job ? [job] : [];
    });
  } catch (e) {
    console.error('[BackendAdapter] tunasync.json 加载失败:', e);
    throw e;
  }
}

// ── 数据转换 ───────────────────────────────────────────────────────────────

/**
 * 将单条tunasync数据 + 本地元数据转换为前端 Mirror 对象
 */
function convertItem(raw: TunasyncJob, local: LocalMeta = {}): Mirror {
  const id = raw.name;
  const defaultLabel = id.charAt(0).toUpperCase() + id.slice(1);

  return {
    id,
    url: (local.gitRepo ? '/git' : '') + `/${id}/`,
    name: local.name ?? defaultLabel,
    desc: local.desc ?? `${defaultLabel} 镜像`,
    helpUrl: local.helpUrl ?? `/mirrors/${id}`,
    upstream: raw.upstream ?? '',
    size: raw.size,
    status: local.status ?? STATUS_MAP[raw.status] ?? 'unknown',
    lastUpdated: raw.last_update_ts ? String(raw.last_update_ts) : parseTimestamp(raw.last_update),
    nextScheduled: raw.next_schedule_ts ? String(raw.next_schedule_ts) : '',
    lastSuccess: raw.last_ended_ts ? String(raw.last_ended_ts) : '',
    type: local.type ?? 'none',
    files: sanitizeFiles(local.files),
    popular: local.popular ?? false,
    storageType: local.storageType ?? 'local',
    gitRepo: local.gitRepo ?? false,
    message: local.message ?? '',
  };
}

/**
 * 批量转换：将 tunasync 数据与 LocalData 合并为 Mirror[]
 * 跳过非法条目而不是抛错，避免单个坏数据让整页崩溃
 */
export function transformJobs(
  jobs: TunasyncJob[],
  localData: Record<string, LocalMeta> = {}
): Mirror[] {
  const out: Mirror[] = [];
  const seen = new Set<string>();

  for (const job of jobs) {
    seen.add(job.name);
    out.push(convertItem(job, localData[job.name]));
  }

  // local_data.json 中有但后端没有的条目
  for (const [id, local] of Object.entries(localData)) {
    if (seen.has(id)) continue;
    // 本地存储镜像没有同步任务时视为已下架；代理或缓存条目仍可展示。
    if (!local.storageType || local.storageType === 'local') continue;
    const defaultLabel = id.charAt(0).toUpperCase() + id.slice(1);
    out.push({
      id,
      url: (local.gitRepo ? '/git' : '') + `/${id}/`,
      name: local.name ?? defaultLabel,
      desc: local.desc ?? `${defaultLabel} 镜像`,
      helpUrl: local.helpUrl ?? `/mirrors/${id}`,
      upstream: local.upstream ?? '',
      size: '',
      status: local.status ?? 'cached',
      lastUpdated: '',
      nextScheduled: '',
      lastSuccess: '',
      type: local.type ?? 'none',
      files: sanitizeFiles(local.files),
      popular: local.popular ?? false,
      storageType: local.storageType ?? 'local',
      gitRepo: local.gitRepo ?? false,
      message: local.message ?? '',
    });
  }

  return out;
}
