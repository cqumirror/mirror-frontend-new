// src/hooks/useGithubReleaseProjects.ts
// GitHub Release 项目列表 —— TanStack Query Hook

import { useQuery } from '@tanstack/react-query';

import { fetchGithubReleaseProjects } from '../api/directoryListing';
import type { GithubReleaseProject } from '../api/directoryListing';

export function useGithubReleaseProjects() {
  return useQuery<GithubReleaseProject[]>({
    queryKey: ['githubReleaseProjects'],
    queryFn: fetchGithubReleaseProjects,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
