// src/hooks/useMirrors.ts
// 镜像数据获取 Hook（TanStack Query）

import { useQuery } from '@tanstack/react-query';
import { useMemo, useEffect, useState } from 'react';


import { fetchMirrors, fetchCampusNetworkStatus } from '@/api';
import type { Mirror, GroupedMirrors, CampusNetworkStatus } from '@/types';

import { useMirrorSearchStore } from '../stores/mirrorStore';

// ── 基础查询 Hooks ────────────────────────────────────────────────────────────

export const useMirrors = () =>
  useQuery<Mirror[]>({
    queryKey: ['mirrors'],
    queryFn: fetchMirrors,
    staleTime: 60_000,
  });

export const useMirrorDetail = (name: string) =>
  useQuery<Mirror[], Error, Mirror>({
    // 与 useMirrors() 共享同一个缓存 key，首页已加载时进详情页无需重复请求
    queryKey: ['mirrors'],
    queryFn: fetchMirrors,
    enabled: !!name,
    staleTime: 60_000,
    select: (mirrors) => {
      const mirror = mirrors.find((m) => m.id.toLowerCase() === name.toLowerCase());
      if (!mirror) throw new Error(`Mirror not found: ${name}`);
      return mirror;
    },
  });

export const useCampusNetwork = () =>
  useQuery<CampusNetworkStatus>({
    queryKey: ['campusNetwork'],
    queryFn: fetchCampusNetworkStatus,
    staleTime: 300_000,
    retry: 1,
  });

// ── 搜索 / 过滤 ───────────────────────────────────────────────────────────────

export const useFilteredMirrors = (mirrors: Mirror[]): Mirror[] => {
  const { searchQuery } = useMirrorSearchStore();
  return useMemo(() => {
    if (!searchQuery.trim()) return mirrors;

    // 支持多关键词（空格分隔），每个关键词都必须匹配
    const keywords = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
    if (keywords.length === 0) return mirrors;

    const scored: Array<{ mirror: Mirror; score: number }> = [];

    for (const m of mirrors) {
      const id = m.id.toLowerCase();
      const nameZh = m.name.zh.toLowerCase();
      const nameEn = m.name.en.toLowerCase();
      const descZh = m.desc.zh.toLowerCase();
      const descEn = m.desc.en.toLowerCase();

      // 每个关键词都必须在至少一个字段中匹配
      let allMatch = true;
      let totalScore = 0;

      for (const kw of keywords) {
        let matched = false;
        let bestScore = 0;

        // id 精确匹配 > id 包含 > name 包含 > desc 包含
        if (id === kw) { matched = true; bestScore = Math.max(bestScore, 4); }
        else if (id.includes(kw)) { matched = true; bestScore = Math.max(bestScore, 3); }

        if (nameZh.includes(kw) || nameEn.includes(kw)) { matched = true; bestScore = Math.max(bestScore, 2); }

        if (descZh.includes(kw) || descEn.includes(kw)) { matched = true; bestScore = Math.max(bestScore, 1); }

        if (!matched) { allMatch = false; break; }
        totalScore += bestScore;
      }

      if (allMatch) scored.push({ mirror: m, score: totalScore });
    }

    // 按匹配度降序排列
    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.mirror);
  }, [mirrors, searchQuery]);
};

/**
 * 取分组键：A-Z 字母直接用，数字与其他符号统一归到 '#' 组
 * 这样字母索引导航就不会出现 0/1/2.../9 这些零散的数字按钮
 */
function getGroupKey(id: string): string {
  const ch = id[0]?.toUpperCase();
  if (!ch) return '#';
  return /^[A-Z]$/.test(ch) ? ch : '#';
}

export const useGroupedMirrors = (mirrors: Mirror[]): GroupedMirrors =>
  useMemo(() => {
    const groups: GroupedMirrors = {};
    mirrors.forEach((m) => {
      const key = getGroupKey(m.id);
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });
    // 组内按 id 字母升序排列，避免因后端返回顺序不定导致每次刷新乱序
    Object.values(groups).forEach((group) => group.sort((a, b) => a.id.localeCompare(b.id)));
    return groups;
  }, [mirrors]);

/**
 * 字母分组的展示顺序：A-Z 在前，'#' 兜底放最后
 * 避免 Object.keys().sort() 把 '#' 排到字母前面
 */
export function sortedGroupKeys(grouped: GroupedMirrors): string[] {
  return Object.keys(grouped).sort((a, b) => {
    if (a === '#') return 1;
    if (b === '#') return -1;
    return a.localeCompare(b);
  });
}

// ── 常用镜像 —— 从 public/data/popular-mirrors.json 读取，运行时可热更新 ─────

/** 内置兜底列表，当 JSON 文件不存在或加载失败时使用 */
const FALLBACK_POPULAR = [
  'ubuntu',
  'debian',
  'archlinux',
  'archlinuxcn',
  'kali',
  'rocky',
  'alpine',
  'openeuler',
];

export const usePopularMirrors = (mirrors: Mirror[], count = 8): Mirror[] => {
  const [popularIds, setPopularIds] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/data/popular-mirrors.json', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((ids: string[]) => {
        if (Array.isArray(ids) && ids.length > 0) setPopularIds(ids);
        else setPopularIds(FALLBACK_POPULAR);
      })
      .catch((err) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setPopularIds(FALLBACK_POPULAR);
      });
    return () => controller.abort();
  }, []);

  return useMemo(() => {
    // 先按 popular-mirrors.json 中的顺序取
    const ids = popularIds.length > 0 ? popularIds : FALLBACK_POPULAR;
    const result: Mirror[] = [];
    ids.forEach((id) => {
      const m = mirrors.find((m) => m.id === id);
      if (m) result.push(m);
    });
    // 不足 count 条时用 succeeded 状态的镜像补足
    if (result.length < count) {
      mirrors
        .filter((m) => m.status === 'succeeded' && !result.find((r) => r.id === m.id))
        .slice(0, count - result.length)
        .forEach((m) => result.push(m));
    }
    return result.slice(0, count);
  }, [mirrors, popularIds, count]);
};
