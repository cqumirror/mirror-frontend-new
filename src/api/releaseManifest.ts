import type { ReleaseManifest } from '@/types';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

export async function fetchReleaseManifestData(): Promise<ReleaseManifest[]> {
  try {
    const res = await fetch(`${API_BASE}/static/release-manifest.json`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`release-manifest.json HTTP ${res.status}`);
    const json = await res.json();

    if (Array.isArray(json)) {
      return json as ReleaseManifest[];
    }

    const result: ReleaseManifest[] = [];
    for (const [key, value] of Object.entries(json)) {
      const [org, repo] = key.split('/');
      if (!org || !repo) continue; // 跳过格式错误的键
      const config = (value as any).config || {};
      const releases = (value as any).releases || [];
      const latest = (value as any).latest || { version: '', tag: '' };
      result.push({
        org,
        repo,
        name: config.name || org + "/" + repo,
        desc: config.desc || '',
        flat: config.flat ?? false,
        tarball: config.tarball ?? false,
        pre_release: config.pre_release ?? false,
        versions: config.versions ?? -1,
        popular: config.popular ?? false,
        size: config.size ?? 'unknown',
        releases: releases ?? [],
        latest: latest ?? [],
        avatar_url: config.avatar_url || '',
      });
    }
    return result;

  } catch (e) {
    console.error('[BackendAdapter] release-manifest.json 加载失败:', e);
    return [] as ReleaseManifest[];
  }
}
