import { useQuery } from '@tanstack/react-query';

import { fetchReleaseManifestData } from '@/api/releaseManifest.ts';
import type { Mirror, ReleaseManifest } from '@/types';
import { useMemo } from 'react';

export const useRelease = () =>
  useQuery<ReleaseManifest[]>({
    queryKey: ['release-manifests'],
    queryFn: fetchReleaseManifestData,
    staleTime: 60_000,
  });

export const usePopularRelease = (releases: ReleaseManifest[], count = 8): ReleaseManifest[] => {
  return useMemo(() => {
    // 先取所有 popular 为 true 的镜像
    const popularReleases = releases.filter((r) => r.popular);

    // 如果 popular 镜像足够，直接返回前 count 个
    if (popularReleases.length >= count) {
      return popularReleases.slice(0, count);
    }

    // 如果不足，随机填充
    const result = [...popularReleases];
    const popularIds = new Set(result.map((r) => r.repo));

    const fallbacks = releases
      .filter((r) => !r.popular && !popularIds.has(r.repo))
      .slice(0, count - result.length);

    return [...result, ...fallbacks];
  }, [releases, count]);
};
