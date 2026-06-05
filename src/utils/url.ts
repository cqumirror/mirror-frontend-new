// src/utils/url.ts
// URL 安全校验工具

/** 仅允许 https?:// 开头或 / 开头的相对路径，阻止 javascript: / data: / 协议相对 // */
export const SAFE_URL_RE = /^(https?:\/\/[^/]|\/[^/]|\/\s*$)/i;

/** 校验 URL 安全性，不合法返回 '#' */
export function sanitizeUrl(url: string): string {
  if (!url) return '#';
  return SAFE_URL_RE.test(url) ? url : '#';
}

/** 将相对路径转为完整 URL；若 sanitize 后为 # 则返回空串 */
export function toFullUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const safe = sanitizeUrl(url);
  return safe === '#' ? '' : `${window.location.origin}${safe}`;
}
