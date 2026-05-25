// src/hooks/useCapabilities.ts
// 检测后端 tunasync manager/worker 是否支持新版功能
//
// 旧版 tunasync（Go 官方版）不支持：
// - GET /jobs/<name>           → 单镜像详情（含 error_msg）
// - GET /jobs/<name>/log/stream → SSE 实时日志流
//
// 新版 tunasync-rs 全部支持。
// 此 hook 在前端启动时探测一次，并把结果缓存到 React Query。
// 缺失能力时，前端隐藏对应入口（详情按钮 / 终端图标 / 日志窗口）。

import { useQuery } from '@tanstack/react-query';

export interface BackendCapabilities {
  /** GET /jobs/<name> 是否可用（详情/error_msg）*/
  jobDetail: boolean;
  /** GET /jobs/<name>/log/stream 是否可用（SSE 日志流）*/
  logStream: boolean;
}

/**
 * 用一个 HEAD 请求探测某个 endpoint 是否存在
 * - 2xx / 3xx → 存在
 * - 4xx（除 405 外）→ 不存在
 * - 405 Method Not Allowed → 老版不支持 HEAD，但 GET 可能可用 → 视为存在
 * - 网络错误 → 视为不存在
 *
 * 用 AbortController 在 5 秒后强制结束探测，避免某些代理对 HEAD 长挂。
 */
async function probeEndpoint(path: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(path, { method: 'HEAD', signal: controller.signal });
    // 200/2xx/3xx 直接通过；405 视为可用（GET 可能可用）
    if (res.ok || res.status === 405) return true;
    // 404 等 → 明确不存在
    return false;
  } catch {
    // 网络错误、超时、CORS 等 → 视为不存在，前端降级
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 探测后端能力。需要先从 /jobs 拿到至少一个 mirrorId 作为探测对象。
 * 如果 mirrors 为空，则跳过探测并返回全 false。
 */
async function detectCapabilities(probeMirrorId: string): Promise<BackendCapabilities> {
  const [jobDetail, logStream] = await Promise.all([
    probeEndpoint(`/jobs/${encodeURIComponent(probeMirrorId)}`),
    probeEndpoint(`/jobs/${encodeURIComponent(probeMirrorId)}/log/stream`),
  ]);
  return { jobDetail, logStream };
}

/**
 * useCapabilities — 在前端启动时探测一次，结果在整个会话内缓存。
 *
 * @param probeMirrorId 用作探测的镜像 ID。通常传第一个 mirror.id；
 *                       如果没有，则跳过探测。
 */
export function useCapabilities(probeMirrorId: string | undefined): BackendCapabilities {
  const { data } = useQuery<BackendCapabilities>({
    queryKey: ['backend-capabilities'],
    enabled: !!probeMirrorId,
    queryFn: () => detectCapabilities(probeMirrorId as string),
    // 同一会话不重新探测；保守用 1 小时 stale，刷新页面会重新拿
    staleTime: 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 0,
  });
  // 探测未完成时默认 false——保守降级，避免短暂闪现按钮
  return data ?? { jobDetail: false, logStream: false };
}
