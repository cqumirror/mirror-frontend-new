// src/docs/index.ts
// 帮助文档 - 使用 Vite import.meta.glob 自动发现 MDX 文件

import type React from 'react';

/**
 * 使用 Vite 的 import.meta.glob 自动发现 MDX 文档
 * 只需将 .mdx 文件放入对应目录，无需手动注册
 */
const docsRaw = import.meta.glob<{ default: React.FC }>('../../content/docs/mdx/*.mdx', {
  eager: false,
}) as Record<string, () => Promise<{ default: React.FC }>>;

Object.entries(docsRaw).forEach(([path, importFn]) => {
  const mirrorId = path.replace(/.*\//, '').replace('.mdx', '');
  docsRaw[mirrorId] = importFn;
});

/**
 * 获取指定镜像的帮助文档组件
 * @param mirrorId 镜像 ID
 * @returns Promise 返回 React 组件，不存在则返回 null
 */
export const loadHelpDoc = async (
  mirrorId: string,
): Promise<React.FC | null> => {
  try {
    const importFn = docsRaw[mirrorId];
    if (importFn) {
      const module = await importFn();
      return module.default || null;
    }
    return null;
  } catch (error) {
    if (import.meta.env.DEV) console.warn(`Failed to load help doc for ${mirrorId}:`, error);
    return null;
  }
};

/**
 * 检查指定镜像是否有 MDX 文档
 * @param mirrorId 镜像 ID
 * @returns boolean
 */
export const hasMdxDoc = (mirrorId: string): boolean => {
  return !!docsRaw[mirrorId];
};
