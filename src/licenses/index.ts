// src/licenses/index.ts
// 许可证文档 - 使用 Vite import.meta.glob 自动发现 MDX 文件

import type React from 'react';

/**
 * 使用 Vite 的 import.meta.glob 自动发现许可证 MDX 文档
 * 只需将 .mdx 文件放入 content/licenses/{zh,en}/ 目录，无需手动注册
 */
const licensesRaw = import.meta.glob<{ default: React.FC }>('../../content/licenses/*.mdx', {
  eager: false,
}) as Record<string, () => Promise<{ default: React.FC }>>;
// 转换为 mirrorId -> importFn 映射
const licenses: Record<string, () => Promise<{ default: React.FC }>> = {};

Object.entries(licensesRaw).forEach(([path, importFn]) => {
  const mirrorId = path.replace(/.*\//, '').replace('.mdx', '');
  licenses[mirrorId] = importFn;
});

/**
 * 获取指定镜像的许可证组件
 * @param mirrorId 镜像 ID
 * @param locale 语言环境 'zh' 或 'en'
 * @returns Promise 返回 React 组件，不存在则返回 null
 */
export const loadLicense = async (
  mirrorId: string,
  locale: string = 'zh'
): Promise<React.FC | null> => {
  try {
    const importFn = licenses[mirrorId];
    if (importFn) {
      const module = await importFn();
      return module.default || null;
    }
    return null;
  } catch (error) {
    if (import.meta.env.DEV)
      console.warn(`Failed to load license for ${mirrorId} (${locale}):`, error);
    return null;
  }
};

/**
 * 检查指定镜像是否有许可证文件
 * @param mirrorId 镜像 ID
 * @returns boolean
 */
export const hasLicense = (mirrorId: string): boolean => {
  return !!licenses[mirrorId];
};

const licenseSlug = (value: string): string => value.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');

/**
 * Release 许可证文件约定：
 *   github-release-{org}-{repo}.mdx（优先，避免同名仓库冲突）
 *   github-release-{repo}.mdx（兼容已有文件）
 */
export const getReleaseLicenseId = (org: string, repo: string): string | null => {
  const orgSlug = licenseSlug(org);
  const repoSlug = licenseSlug(repo);
  const candidates = [`github-release-${orgSlug}-${repoSlug}`, `github-release-${repoSlug}`];
  return candidates.find(hasLicense) ?? null;
};
