// src/licenses/index.ts
// 许可证文档 - 使用 Vite import.meta.glob 自动发现 MDX 文件

import type React from 'react';

/**
 * 使用 Vite 的 import.meta.glob 自动发现许可证 MDX 文档
 * 只需将 .mdx 文件放入 content/licenses/{zh,en}/ 目录，无需手动注册
 */
const zhLicensesRaw = import.meta.glob<{ default: React.FC }>(
  '../../content/licenses/zh/*.mdx',
  { eager: false },
) as Record<string, () => Promise<{ default: React.FC }>>;

const enLicensesRaw = import.meta.glob<{ default: React.FC }>(
  '../../content/licenses/en/*.mdx',
  { eager: false },
) as Record<string, () => Promise<{ default: React.FC }>>;

// 转换为 mirrorId -> importFn 映射
const zhLicenses: Record<string, () => Promise<{ default: React.FC }>> = {};
const enLicenses: Record<string, () => Promise<{ default: React.FC }>> = {};

Object.entries(zhLicensesRaw).forEach(([path, importFn]) => {
  const mirrorId = path.replace(/.*\//, '').replace('.mdx', '');
  zhLicenses[mirrorId] = importFn;
});

Object.entries(enLicensesRaw).forEach(([path, importFn]) => {
  const mirrorId = path.replace(/.*\//, '').replace('.mdx', '');
  enLicenses[mirrorId] = importFn;
});

/**
 * 获取指定镜像的许可证组件
 * @param mirrorId 镜像 ID
 * @param locale 语言环境 'zh' 或 'en'
 * @returns Promise 返回 React 组件，不存在则返回 null
 */
export const loadLicense = async (
  mirrorId: string,
  locale: string = 'zh',
): Promise<React.FC | null> => {
  try {
    const licenseMap = locale === 'en' ? enLicenses : zhLicenses;
    const importFn = licenseMap[mirrorId];
    if (importFn) {
      const module = await importFn();
      return module.default || null;
    }
    return null;
  } catch (error) {
    if (import.meta.env.DEV) console.warn(`Failed to load license for ${mirrorId} (${locale}):`, error);
    return null;
  }
};

/**
 * 检查指定镜像是否有许可证文件
 * @param mirrorId 镜像 ID
 * @param locale 语言环境 'zh' 或 'en'
 * @returns boolean
 */
export const hasLicense = (mirrorId: string, locale: string = 'zh'): boolean => {
  const licenseMap = locale === 'en' ? enLicenses : zhLicenses;
  return !!licenseMap[mirrorId];
};
