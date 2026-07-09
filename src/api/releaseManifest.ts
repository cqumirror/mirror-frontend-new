
import type {ReleaseManifest} from '@/types';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

export async function fetchReleaseManifestData(): Promise<ReleaseManifest[]> {
  try {
    const res = await fetch(`${API_BASE}/static/release-manifest.json`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`release-manifest.json HTTP ${res.status}`);
    const data = (await res.json()) as ReleaseManifest[];

    if (!Array.isArray(data)) {
      throw new Error('release-manifest.json: expected array, got object');
    }
    return data;
  } catch (e) {
    console.error('[BackendAdapter] release-manifest.json 加载失败:', e);
    return [] as ReleaseManifest[];
  }
}
