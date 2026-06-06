// src/api/directoryListing.ts
// nginx FancyIndex 目录列表解析 —— 提取自 GithubReleaseViewer.tsx

/** 目录条目 */
export interface DirEntry {
  name: string;
  href: string;
  size: string;
  date: string;
  isDir: boolean;
}

/** GitHub Release 项目 */
export interface GithubReleaseProject {
  org: string;
  repo: string;
}

// ─── 解析 fancyindex HTML ──────────────────────────────────────────────────────

export function parseFancyIndexHtml(html: string, baseUrl: string): DirEntry[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const table = doc.getElementById('list');
  if (!table) return [];

  return Array.from(table.querySelectorAll('tbody tr'))
    .map((row): DirEntry | null => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 2) return null;
      const anchor = cells[0].querySelector('a');
      if (!anchor) return null;
      const name = anchor.textContent?.trim() ?? '';
      const href = anchor.getAttribute('href') ?? '';
      if (!href || href === '../' || name === 'Parent Directory') return null;
      const size = cells[1]?.textContent?.trim() ?? '';
      const date = cells[2]?.textContent?.trim() ?? '';
      const isDir = href.endsWith('/');
      const absHref = href.startsWith('http') ? href : new URL(href, baseUrl).href;
      return { name: decodeURIComponent(name), href: absHref, size, date, isDir };
    })
    .filter((e): e is DirEntry => e !== null);
}

// ─── JS 质询处理 ──────────────────────────────────────────────────────────────

/**
 * 检测 503 质询页面，提取并设置 addr4 cookie，然后重试请求。
 * 服务器返回的质询页面包含：document.cookie='addr4=...;max-age=300;'
 */
async function fetchWithChallenge(url: string): Promise<string> {
  const fetchOpts: RequestInit = {
    headers: { Accept: 'text/html' },
    credentials: 'same-origin',
  };

  let res = await fetch(url, fetchOpts);
  if (!res.ok && res.status !== 503) throw new Error(`HTTP ${res.status}`);

  if (res.status === 503) {
    const html = await res.text();

    // 尝试从质询页面提取 addr4 cookie
    const match = html.match(/document\.cookie\s*=\s*'addr4=([^;]+)/);
    if (match) {
      // 校验 cookie 值不含分号、换行等注入字符，防止 cookie 注入
      const val = match[1];
      if (/[;\r\n]/.test(val)) throw new Error('HTTP 503 (invalid addr4 cookie value)');
      document.cookie = `addr4=${val};max-age=300;path=/;SameSite=Lax`;
      // 重试请求
      res = await fetch(url, fetchOpts);
      if (!res.ok) throw new Error(`HTTP ${res.status} (after challenge)`);
      return res.text();
    }

    throw new Error('HTTP 503 (challenge page, no addr4 cookie found)');
  }

  return res.text();
}

// ─── 获取目录列表 ──────────────────────────────────────────────────────────────

export async function fetchDirectoryListing(path: string): Promise<DirEntry[]> {
  const url = path.startsWith('http') ? path : `${window.location.origin}${path}`;
  const html = await fetchWithChallenge(url);
  return parseFancyIndexHtml(html, url);
}

// ─── 获取 GitHub Release 项目列表 ──────────────────────────────────────────────

export async function fetchGithubReleaseProjects(): Promise<GithubReleaseProject[]> {
  const rootPath = '/github-release/';
  const norm = rootPath.endsWith('/') ? rootPath : rootPath + '/';

  // Step1: 获取 org 列表
  const orgs = await fetchDirectoryListing(norm);
  const orgDirs = orgs.filter((e) => e.isDir);

  // Step2: 并行拉取每个 org 下的 repo
  const results = await Promise.allSettled(
    orgDirs.map(async (org) => {
      const repos = await fetchDirectoryListing(org.href);
      return repos
        .filter((r) => r.isDir)
        .map(
          (repo): GithubReleaseProject => ({
            org: org.name.replace(/\/$/, ''),
            repo: repo.name.replace(/\/$/, ''),
          })
        );
    })
  );

  return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
}
