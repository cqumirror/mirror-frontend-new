// src/utils/urlWhitelist.ts
// 公告 / 警报链接白名单 —— 防止恶意 URL 注入

// 允许的外部域名（不含协议）
const ALLOWED_DOMAINS = new Set([
  'mirrors.cqu.edu.cn',
  'github.com',
  'www.github.com',
]);

// 允许的内部路由前缀
const ALLOWED_INTERNAL_PREFIXES = [
  '/mirrors/',
  '/news',
  '/status',
];

/** 检查外部 URL 是否在白名单内 */
export function isAllowedExternalUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return ALLOWED_DOMAINS.has(hostname);
  } catch {
    return false;
  }
}

/** 检查内部路由是否在白名单内 */
export function isAllowedInternalPath(path: string): boolean {
  return ALLOWED_INTERNAL_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/**
 * 安全跳转：外部链接校验域名，内部链接校验路由前缀。
 * 不在白名单内的链接静默忽略。
 */
export function safeNavigate(url: string, navigate: (path: string) => void): void {
  if (url.startsWith('http')) {
    if (isAllowedExternalUrl(url)) {
      window.open(url, '_blank', 'noopener');
    }
  } else {
    if (isAllowedInternalPath(url)) {
      navigate(url);
    }
  }
}
