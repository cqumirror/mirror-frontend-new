import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { IsoInfoEntry, ReleaseDownloadFile } from '@/api/isoInfo';
import { fetchIsoInfoData, getReleaseFiles } from '@/api/isoInfo';
import { fetchReleaseManifestData } from '@/api/releaseManifest.ts';
import type { ReleaseManifest } from '@/types';

const RELEASE_QUERY_KEY = ['release-manifests'] as const;
const ISO_INFO_QUERY_KEY = ['iso-info'] as const;

export const useRelease = () =>
  useQuery<ReleaseManifest[]>({
    queryKey: RELEASE_QUERY_KEY,
    queryFn: fetchReleaseManifestData,
    staleTime: 60_000,
  });

export const useReleaseDetail = (org = '', repo = '') =>
  useQuery<ReleaseManifest[], Error, ReleaseManifest | undefined>({
    queryKey: RELEASE_QUERY_KEY,
    queryFn: fetchReleaseManifestData,
    enabled: Boolean(org && repo),
    staleTime: 60_000,
    select: (releases) =>
      releases.find(
        (release) =>
          release.org.toLowerCase() === org.toLowerCase() &&
          release.repo.toLowerCase() === repo.toLowerCase()
      ),
  });

export const useReleaseFiles = (org = '', repo = '') =>
  useQuery<IsoInfoEntry[], Error, ReleaseDownloadFile[]>({
    queryKey: ISO_INFO_QUERY_KEY,
    queryFn: fetchIsoInfoData,
    enabled: Boolean(org && repo),
    staleTime: 60_000,
    select: (entries) => getReleaseFiles(entries, org, repo),
  });

export const useIsoInfo = () =>
  useQuery<IsoInfoEntry[]>({
    queryKey: ISO_INFO_QUERY_KEY,
    queryFn: fetchIsoInfoData,
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

    // 如果不足，按 manifest 顺序补全
    const result = [...popularReleases];
    const popularIds = new Set(result.map((r) => r.repo));

    const fallbacks = releases
      .filter((r) => !r.popular && !popularIds.has(r.repo))
      .slice(0, count - result.length);

    return [...result, ...fallbacks];
  }, [releases, count]);
};
