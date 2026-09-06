import type { ReleaseManifest } from '@/types';

type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const stringValue = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const booleanValue = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;

const numberValue = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

function parseRelease(key: string, value: unknown): ReleaseManifest | null {
  const separator = key.indexOf('/');
  if (separator <= 0 || separator === key.length - 1 || !isObject(value)) return null;

  const org = key.slice(0, separator);
  const repo = key.slice(separator + 1);
  const config = isObject(value.config) ? value.config : {};
  const releases = Array.isArray(value.releases)
    ? value.releases.flatMap((item) => {
        if (!isObject(item)) return [];
        const version = stringValue(item.version);
        const tag = stringValue(item.tag);
        if (!version && !tag) return [];
        return [
          {
            version: version || tag,
            tag: tag || version,
            files: Array.isArray(item.files)
              ? item.files.filter((file): file is string => typeof file === 'string')
              : [],
            published_at: stringValue(item.published_at),
            pre_release: booleanValue(item.pre_release),
          },
        ];
      })
    : [];
  const latestSource = isObject(value.latest) ? value.latest : null;
  const latest = latestSource
    ? {
        version: stringValue(latestSource.version),
        tag: stringValue(latestSource.tag),
      }
    : null;

  return {
    org,
    repo,
    name: stringValue(config.name, key),
    desc: stringValue(config.desc),
    flat: booleanValue(config.flat),
    tarball: booleanValue(config.tarball),
    pre_release: booleanValue(config.pre_release),
    versions: numberValue(config.versions, -1),
    popular: booleanValue(config.popular),
    size: stringValue(config.size),
    avatar_url: stringValue(config.avatar_url),
    releases,
    latest: latest && (latest.version || latest.tag) ? latest : null,
  };
}

export function parseReleaseManifest(json: unknown): ReleaseManifest[] {
  if (!isObject(json)) throw new Error('release-manifest.json: expected object');

  return Object.entries(json).flatMap(([key, value]) => {
    const release = parseRelease(key, value);
    return release ? [release] : [];
  });
}

export async function fetchReleaseManifestData(): Promise<ReleaseManifest[]> {
  try {
    const res = await fetch('/static/release-manifest.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`release-manifest.json HTTP ${res.status}`);
    const json: unknown = await res.json();
    return parseReleaseManifest(json);
  } catch (e) {
    console.error('[BackendAdapter] release-manifest.json 加载失败:', e);
    throw e;
  }
}
