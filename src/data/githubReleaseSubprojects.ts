// src/data/githubReleaseSubprojects.ts
// GitHub Release 子项目映射 —— 数据来自 public/data/github-release/subprojects.json
// 运行时通过 fetch() 加载，无需重新构建即可更新

import { useState, useEffect } from 'react';

interface SubProjectEntry {
  slug: string;
  repoPath: string;
}

let _cache: Record<string, string> | null = null;
let _promise: Promise<Record<string, string>> | null = null;

function fetchSubProjects(): Promise<Record<string, string>> {
  if (_cache) return Promise.resolve(_cache);
  if (_promise) return _promise;

  _promise = fetch('/data/github-release/subprojects.json')
    .then((res) => {
      if (!res.ok) throw new Error(`subprojects.json HTTP ${res.status}`);
      return res.json() as Promise<SubProjectEntry[]>;
    })
    .then((entries) => {
      _cache = Object.fromEntries(
        entries.map((e) => [`github-release-${e.slug}`, e.repoPath]),
      );
      return _cache;
    })
    .catch((e) => {
      console.warn('[githubReleaseSubprojects] 加载失败，子项目路径映射为空。', e);
      _cache = {};
      return _cache;
    });

  return _promise;
}

/**
 * 获取 github-release 子项目 slug → 服务器 org/repo 路径映射
 * 例：'github-release-office-tool' → 'YerongAI/Office-Tool'
 */
export function useGithubReleaseSubProjects(): {
  data: Record<string, string>;
  isLoading: boolean;
} {
  const [data, setData] = useState<Record<string, string>>(() => _cache ?? {});
  const [isLoading, setIsLoading] = useState(!_cache);

  useEffect(() => {
    if (_cache) return;
    fetchSubProjects().then((map) => {
      setData(map);
      setIsLoading(false);
    });
  }, []);

  return { data, isLoading };
}
