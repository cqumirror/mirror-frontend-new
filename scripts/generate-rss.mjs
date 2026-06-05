#!/usr/bin/env node
// scripts/generate-rss.mjs
// 构建后自动生成 RSS 2.0 feed
// 在 package.json 的 build 脚本中追加调用

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_ORIGIN = 'https://mirrors.cqu.edu.cn';
const DIST_DIR = resolve(__dirname, '..', 'dist');

/**
 * 从中文新闻 MDX 文件中解析 meta 导出
 * 格式：export const meta = { title: "...", date: "...", summary: "...", ... }
 */
function parseNewsMeta(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    // 匹配 export const meta = { ... } 块
    const metaMatch = content.match(/export\s+const\s+meta\s*=\s*\{([\s\S]*?)\}/);
    if (!metaMatch) return null;

    const metaStr = metaMatch[1];
    const get = (key) => {
      const m = metaStr.match(new RegExp(`${key}:\\s*"([^"]*)"`));
      return m ? m[1] : '';
    };

    return {
      title: get('title'),
      date: get('date'),
      summary: get('summary'),
    };
  } catch {
    return null;
  }
}

function generateRss() {
  const newsDir = resolve(__dirname, '..', 'content', 'news', 'mdx', 'zh');
  if (!existsSync(newsDir)) {
    console.warn('[rss] news directory not found, skipping');
    return;
  }

  const files = readdirSync(newsDir)
    .filter((f) => f.endsWith('.mdx'))
    .sort()
    .reverse(); // 最新在前

  const items = [];
  for (const file of files) {
    const meta = parseNewsMeta(resolve(newsDir, file));
    if (!meta || !meta.title || !meta.date) continue;

    const slug = file.replace('.mdx', '');
    const pubDate = new Date(meta.date + 'T00:00:00+08:00').toUTCString();

    items.push(`    <item>
      <title><![CDATA[${meta.title}]]></title>
      <link>${SITE_ORIGIN}/news/${slug}</link>
      <guid isPermaLink="true">${SITE_ORIGIN}/news/${slug}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${meta.summary || meta.title}]]></description>
    </item>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>CQU Mirror - 重庆大学开源软件镜像站</title>
    <link>${SITE_ORIGIN}</link>
    <description>重庆大学开源软件镜像站最新动态、维护通知与服务升级公告</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_ORIGIN}/feed.xml" rel="self" type="application/rss+xml"/>
${items.join('\n')}
  </channel>
</rss>
`;

  const outPath = resolve(DIST_DIR, 'feed.xml');
  writeFileSync(outPath, xml, 'utf-8');
  console.log(`[rss] Generated ${outPath} with ${items.length} items`);
}

if (!existsSync(DIST_DIR)) {
  console.warn('[rss] dist/ not found — run after vite build');
  process.exit(0);
}

generateRss();
