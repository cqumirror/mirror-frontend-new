// src/news/index.ts
// 新闻系统 —— 用 Vite import.meta.glob 自动发现 content/news/mdx/{zh,en}/*.mdx
// 每篇 MDX 文件需要 export const meta = { title, date, summary, tags? }
// 文件名即 slug，建议格式：YYYY-MM-DD-short-title.mdx

import type React from 'react';

export interface NewsMeta {
  slug: string;
  title: string;
  date: string; // YYYY-MM-DD
  summary: string;
  tags?: string[];
  author?: string;
}

// 一次 eager glob，同时拿到 meta（列表/首页）和 default（详情页正文）
const zhModules = import.meta.glob<{
  meta: Omit<NewsMeta, 'slug'>;
  default: React.FC;
}>('../../content/news/mdx/zh/*.mdx', { eager: true });

const enModules = import.meta.glob<{
  meta: Omit<NewsMeta, 'slug'>;
  default: React.FC;
}>('../../content/news/mdx/en/*.mdx', { eager: true });

// ── 元数据列表（同步，供列表页 / 首页 widget 使用）────────────────────────────
export const getNewsList = (locale: string = 'zh'): NewsMeta[] => {
  const modules = locale === 'en' ? enModules : zhModules;
  return Object.entries(modules)
    .map(([path, mod]) => ({
      slug: path.replace(/.*\//, '').replace('.mdx', ''),
      ...(mod.meta ?? { title: '(未命名)', date: '1970-01-01', summary: '' }),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
};

export const getNewsItem = (slug: string, locale: string = 'zh'): NewsMeta | undefined =>
  getNewsList(locale).find((n) => n.slug === slug);

// ── 正文组件（同步，详情页直接取，无需 async）────────────────────────────────
export const getNewsArticle = (slug: string, locale: string = 'zh'): React.FC | null => {
  const modules = locale === 'en' ? enModules : zhModules;
  const key = `../../content/news/mdx/${locale === 'en' ? 'en' : 'zh'}/${slug}.mdx`;
  return modules[key]?.default ?? null;
};
