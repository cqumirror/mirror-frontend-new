import type { MirrorFile } from '@/types';
import { SAFE_URL_RE } from '@/utils/url';

export interface IsoInfoEntry {
  distro: string;
  category: string;
  urls: MirrorFile[];
}

export interface ReleaseDownloadFile extends MirrorFile {
  distro: string;
  category: string;
}

export interface ResolvedReleaseFile {
  fileName: string;
  displayName: string;
  url: string;
  category: string;
  available: boolean;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function parseIsoInfo(json: unknown): IsoInfoEntry[] {
  if (!Array.isArray(json)) throw new Error('isoinfo.json: expected array');

  return json.flatMap((item) => {
    if (!isObject(item) || !Array.isArray(item.urls)) return [];
    const urls = item.urls.flatMap((file) => {
      if (!isObject(file) || typeof file.name !== 'string' || typeof file.url !== 'string') {
        return [];
      }
      return SAFE_URL_RE.test(file.url) ? [{ name: file.name, url: file.url }] : [];
    });
    if (urls.length === 0) return [];

    return [
      {
        distro: typeof item.distro === 'string' ? item.distro : '',
        category: typeof item.category === 'string' ? item.category : '',
        urls,
      },
    ];
  });
}

export async function fetchIsoInfoData(): Promise<IsoInfoEntry[]> {
  const res = await fetch('/static/isoinfo.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`isoinfo.json HTTP ${res.status}`);
  return parseIsoInfo(await res.json());
}

export function getReleaseFiles(
  entries: IsoInfoEntry[],
  org: string,
  repo: string
): ReleaseDownloadFile[] {
  const prefix = `/github-release/${org}/${repo}/`.toLowerCase();

  return entries.flatMap((entry) =>
    entry.urls.flatMap((file) =>
      file.url.toLowerCase().startsWith(prefix)
        ? [{ ...file, distro: entry.distro, category: entry.category }]
        : []
    )
  );
}

function fileNameFromUrl(url: string): string {
  const segment = url.split(/[?#]/, 1)[0].split('/').pop() ?? '';
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

const fileSignature = (fileName: string): string => fileName.toLowerCase().replace(/\d+/g, '#');

function extractVersion(fileName: string): string | null {
  const withoutArchitectures = fileName.replace(/(?:x86_64|amd64|arm64|aarch64|x64|i686)/gi, '');
  const candidates = withoutArchitectures.match(/\d+(?:[._-]\d+)*/g) ?? [];
  return (
    candidates.sort((left, right) => {
      const leftParts = left.split(/[._-]/).length;
      const rightParts = right.split(/[._-]/).length;
      return rightParts - leftParts || right.length - left.length;
    })[0] ?? null
  );
}

function adaptDisplayName(label: string, sourceFile: string, targetFile: string): string {
  const sourceVersion = extractVersion(sourceFile);
  const targetVersion = extractVersion(targetFile);
  if (!sourceVersion || !targetVersion || sourceVersion === targetVersion) return label;
  return label.replace(sourceVersion, targetVersion);
}

/**
 * 将 manifest 的版本文件与 isoinfo 的可下载项按真实文件名合并。
 * 可下载文件保持 manifest 顺序并置顶，未被 isoinfo 收录的文件置底。
 */
export function resolveReleaseFiles(
  manifestFiles: string[],
  downloads: ReleaseDownloadFile[],
  includeUnlistedDownloads = false,
  fallbackDirectory = ''
): ResolvedReleaseFile[] {
  const downloadsByName = new Map(
    downloads.map((file) => [fileNameFromUrl(file.url).toLowerCase(), file])
  );
  const downloadsBySignature = new Map(
    downloads.map((file) => [fileSignature(fileNameFromUrl(file.url)), file])
  );
  const matchedDownload = manifestFiles
    .map((fileName) => downloadsByName.get(fileName.toLowerCase()))
    .find((file) => file !== undefined);
  const inferredDirectory = matchedDownload
    ? matchedDownload.url.slice(0, matchedDownload.url.lastIndexOf('/') + 1)
    : fallbackDirectory;
  const resolved = manifestFiles.map((fileName): ResolvedReleaseFile => {
    const exactDownload = downloadsByName.get(fileName.toLowerCase());
    const templateDownload = exactDownload ?? downloadsBySignature.get(fileSignature(fileName));
    const sourceFile = templateDownload ? fileNameFromUrl(templateDownload.url) : '';
    return templateDownload
      ? {
          fileName,
          displayName: adaptDisplayName(templateDownload.name, sourceFile, fileName),
          url: exactDownload
            ? exactDownload.url
            : `${inferredDirectory}${encodeURIComponent(fileName)}`,
          category: templateDownload.category,
          available: true,
        }
      : {
          fileName,
          displayName: fileName,
          url: `${inferredDirectory}${encodeURIComponent(fileName)}`,
          category: '',
          available: false,
        };
  });

  if (includeUnlistedDownloads) {
    const manifestNames = new Set(manifestFiles.map((fileName) => fileName.toLowerCase()));
    for (const download of downloads) {
      const fileName = fileNameFromUrl(download.url);
      if (manifestNames.has(fileName.toLowerCase())) continue;
      resolved.push({
        fileName,
        displayName: download.name,
        url: download.url,
        category: download.category,
        available: true,
      });
    }
  }

  return resolved.sort((left, right) => Number(right.available) - Number(left.available));
}
