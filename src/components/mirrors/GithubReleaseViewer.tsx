// src/components/mirrors/GithubReleaseViewer.tsx
// Github Release 专用下载页面组件
// 目录结构：/github-release/{org}/{repo}/{version}/{files}

import {
  Download as DownloadIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckIcon,
  ArrowBack as BackIcon,
  OpenInNew as OpenIcon,
  Refresh as RefreshIcon,
  LocalOffer as LocalOfferIcon,
  FolderOff as EmptyIcon,
  VerifiedUser as ChecksumIcon,
  Search as SearchIcon,
  Close as ClearIcon,
} from '@mui/icons-material';
import {
  Box,
  Grid,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Button,
  Chip,
  Skeleton,
  Alert,
  Divider,
  Avatar,
  Link,
  Tab,
  Tabs,
  Card,
  CardActionArea,
  InputBase,
} from '@mui/material';
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import {
  detectPlatform,
  detectArch,
  PLATFORM_LABEL,
  PLATFORM_ICON,
  PLATFORM_ORDER,
  type Platform,
} from '@/utils/platform';
import { sanitizeUrl } from '@/utils/url';

// ─── 类型 ────────────────────────────────────────────────────────────────────

interface DirEntry {
  name: string;
  href: string;
  size: string;
  date: string;
  isDir: boolean;
}

interface Project {
  org: string;
  repo: string;
  orgDate: string;
}

interface Release {
  name: string;
  path: string;
  date: string;
  isLatest: boolean;
}

interface FileEntry {
  name: string;
  href: string;
  size: string;
  date: string;
  platform: Platform;
  arch: string;
}

// ─── 版本检测 ────────────────────────────────────────────────────────────────

function looksLikeVersion(name: string): boolean {
  const n = name.toLowerCase();
  if (n === 'latestrelease') return true;
  // semver: v1.2.3, 1.2.3, 1.2.3.4, v1, v1.2, 带 pre-release 标签
  if (/^v?\d+(\.\d+){0,3}([-._]?(rc|beta|alpha|pre|release|final)\d*)?$/i.test(n)) return true;
  // 日期格式: 2024-01-01, 20240101, 2024.01.01
  if (/^\d{4}[-.]?\d{2}[-.]?\d{2}$/.test(n)) return true;
  return false;
}

function extractVersion(name: string): number[] {
  const m = name.match(/^v?(\d+(?:[.-]\d+)*)/);
  if (!m) return [];
  return m[1]
    .split(/[.-]/)
    .map(Number)
    .filter((n) => !isNaN(n));
}

function compareVersionDesc(a: string, b: string): number {
  const va = extractVersion(a);
  const vb = extractVersion(b);
  if (va.length === 0 && vb.length === 0) return 0;
  if (va.length === 0) return 1;
  if (vb.length === 0) return -1;
  for (let i = 0; i < Math.max(va.length, vb.length); i++) {
    const diff = (vb[i] ?? 0) - (va[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

interface ClassifyResult {
  versionDirs: DirEntry[];
  otherDirs: DirEntry[];
  files: DirEntry[];
  isVersioned: boolean;
}

function classifyEntries(entries: DirEntry[]): ClassifyResult {
  const dirs = entries.filter((e) => e.isDir);
  const files = entries.filter((e) => !e.isDir);
  const versionDirs = dirs.filter((d) => looksLikeVersion(d.name.replace(/\/$/, '')));
  const otherDirs = dirs.filter((d) => !looksLikeVersion(d.name.replace(/\/$/, '')));
  const isVersioned = dirs.length > 0 && versionDirs.length > dirs.length / 2;
  return { versionDirs, otherDirs, files, isVersioned };
}

function toFileEntry(e: DirEntry): FileEntry {
  return {
    name: e.name,
    href: e.href,
    size: e.size,
    date: e.date,
    platform: detectPlatform(e.name),
    arch: detectArch(e.name),
  };
}

/** 递归加载目录结构，自动检测版本目录 vs 扁平文件（depth 上限防死循环） */
async function loadDirectoryRecursive(
  path: string,
  depth = 0
): Promise<{ releases: Release[]; files: FileEntry[] }> {
  if (depth > 3) return { releases: [], files: [] };

  const entries = await fetchDir(path);
  const { versionDirs, otherDirs, files, isVersioned } = classifyEntries(entries);

  if (isVersioned) {
    // 大多数子目录是版本号 → 当作 releases
    const releases: Release[] = versionDirs
      .map((e) => {
        const n = e.name.replace(/\/$/, '');
        return { name: n, path: e.href, date: e.date, isLatest: n.toLowerCase() === 'latestrelease' };
      })
      .sort((a, b) => {
        if (a.isLatest) return -1;
        if (b.isLatest) return 1;
        return compareVersionDesc(a.name, b.name);
      });
    return { releases, files: [] };
  }

  if (files.length > 0 && otherDirs.length === 0) {
    // 纯文件目录 → 返回文件列表
    return { releases: [], files: files.map(toFileEntry) };
  }

  if (otherDirs.length > 0) {
    // 有非版本子目录 → 递归进入，合并结果
    const results = await Promise.all(
      otherDirs.map((d) => loadDirectoryRecursive(d.href, depth + 1))
    );
    const allReleases = results.flatMap((r) => r.releases);
    const allFiles = results.flatMap((r) => r.files);
    // 当前目录下的文件也合并进去
    if (files.length > 0) allFiles.push(...files.map(toFileEntry));
    return { releases: allReleases, files: allFiles };
  }

  return { releases: [], files: [] };
}

// ─── 头像颜色：根据 org 名 hash 生成确定性色相 ──────────────────────────────

const AVATAR_COLORS = [
  { bg: '#DBEAFE', fg: '#1D4ED8' }, // blue
  { bg: '#D1FAE5', fg: '#065F46' }, // green
  { bg: '#FEF3C7', fg: '#92400E' }, // amber
  { bg: '#FCE7F3', fg: '#9D174D' }, // pink
  { bg: '#EDE9FE', fg: '#5B21B6' }, // violet
  { bg: '#FFEDD5', fg: '#9A3412' }, // orange
  { bg: '#CFFAFE', fg: '#155E75' }, // cyan
  { bg: '#F0FDF4', fg: '#166534' }, // emerald (light)
];
const AVATAR_COLORS_DARK = [
  { bg: '#1E3A5F', fg: '#93C5FD' },
  { bg: '#064E3B', fg: '#6EE7B7' },
  { bg: '#451A03', fg: '#FDE68A' },
  { bg: '#500724', fg: '#FBCFE8' },
  { bg: '#2E1065', fg: '#C4B5FD' },
  { bg: '#431407', fg: '#FDBA74' },
  { bg: '#083344', fg: '#67E8F9' },
  { bg: '#052E16', fg: '#86EFAC' },
];

function orgColorIndex(org: string): number {
  let h = 0;
  for (let i = 0; i < org.length; i++) h = (Math.imul(31, h) + org.charCodeAt(i)) >>> 0;
  return h % AVATAR_COLORS.length;
}

// ─── 解析 fancyindex HTML ─────────────────────────────────────────────────────

function parseDirEntries(html: string, baseUrl: string): DirEntry[] {
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

async function fetchDir(path: string): Promise<DirEntry[]> {
  const url = path.startsWith('http') ? path : `${window.location.origin}${path}`;
  const fetchOpts: RequestInit = {
    headers: { Accept: 'text/html' },
    credentials: 'same-origin',
  };

  let res = await fetch(url, fetchOpts);
  if (!res.ok && res.status !== 503) throw new Error(`HTTP ${res.status}`);

  let html: string;
  if (res.status === 503) {
    html = await res.text();
    const match = html.match(/document\.cookie\s*=\s*'addr4=([^;]+)/);
    if (match) {
      document.cookie = `addr4=${match[1]};max-age=300;path=/;SameSite=Lax`;
      res = await fetch(url, fetchOpts);
      if (!res.ok) throw new Error(`HTTP ${res.status} (after challenge)`);
      html = await res.text();
    } else {
      throw new Error('HTTP 503 (challenge page, no addr4 cookie found)');
    }
  } else {
    html = await res.text();
  }

  return parseDirEntries(html, url);
}

// ─── 子组件：项目头像（加载中/失败显示彩色首字母 fallback） ──────────────────────

interface ProjectAvatarProps {
  org: string;
  size?: number;
}

const ProjectAvatar: React.FC<ProjectAvatarProps> = ({ org, size = 44 }) => {
  const [imgStatus, setImgStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const avatarUrl = `https://github.com/${org}.png?size=64`;
  const colorIdx = orgColorIndex(org);

  return (
    <>
      {imgStatus === 'loaded' ? (
        <Box
          component="img"
          src={avatarUrl}
          alt={org}
          sx={{
            width: size,
            height: size,
            borderRadius: '6px',
            flexShrink: 0,
            objectFit: 'contain',
          }}
        />
      ) : (
        <Avatar
          variant="rounded"
          sx={{
            width: size,
            height: size,
            borderRadius: '6px',
            fontSize: size <= 36 ? '0.9rem' : '1.15rem',
            fontWeight: 700,
            flexShrink: 0,
            bgcolor: (theme) =>
              theme.palette.mode === 'dark'
                ? AVATAR_COLORS_DARK[colorIdx].bg
                : AVATAR_COLORS[colorIdx].bg,
            color: (theme) =>
              theme.palette.mode === 'dark'
                ? AVATAR_COLORS_DARK[colorIdx].fg
                : AVATAR_COLORS[colorIdx].fg,
          }}
        >
          {org[0]?.toUpperCase()}
        </Avatar>
      )}
      {imgStatus !== 'loaded' && (
        <Box
          component="img"
          src={avatarUrl}
          onLoad={() => setImgStatus('loaded')}
          onError={() => setImgStatus('error')}
          sx={{ display: 'none' }}
          alt=""
        />
      )}
    </>
  );
};

// ─── 子组件：项目卡片 ──────────────────────────────────────────────────────────

interface ProjectCardProps {
  project: Project;
  latestVersion?: string;
  onSelect: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, latestVersion, onSelect }) => {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: (theme) =>
            theme.palette.mode === 'dark'
              ? '0 4px 20px rgba(96,165,250,0.12)'
              : '0 4px 20px rgba(59,130,246,0.09)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardActionArea
        onClick={onSelect}
        sx={{
          borderRadius: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          height: '100%',
        }}
      >
        {/* 主体：头像左对齐 + 文字 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, pb: 1.5 }}>
          {/* 头像 */}
          <ProjectAvatar org={project.org} size={44} />

          {/* 名称区 */}
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                fontSize: '0.9rem',
                lineHeight: 1.25,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {project.repo}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.7rem',
                display: 'block',
                mt: 0.25,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {project.org}
            </Typography>
          </Box>
        </Box>

        {/* footer：版本 tag，细线隔开 */}
        <Box
          sx={{
            px: 2,
            py: 1,
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {latestVersion ? (
            <Chip
              icon={
                <LocalOfferIcon sx={{ fontSize: '11px !important', color: 'inherit !important' }} />
              }
              label={latestVersion}
              size="small"
              variant="outlined"
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.68rem',
                height: 20,
                maxWidth: '100%',
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(96,165,250,0.07)' : 'rgba(59,130,246,0.05)',
                borderColor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(96,165,250,0.22)' : 'rgba(59,130,246,0.18)',
                color: 'primary.main',
                '& .MuiChip-icon': { color: 'inherit' },
                '& .MuiChip-label': {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                },
              }}
            />
          ) : (
            <Skeleton variant="rounded" width={76} height={20} />
          )}
        </Box>
      </CardActionArea>
    </Card>
  );
};

// ─── 子组件：文件行 ──────────────────────────────────────────────────────────

interface FileRowProps {
  file: FileEntry;
}

const FileRow: React.FC<FileRowProps> = ({ file }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    },
    []
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(file.href);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[copy]', err);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 0.5, sm: 1 },
        px: 1.5,
        py: 0.8,
        borderRadius: 1,
        minWidth: 0,
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      {/* 文件名 + arch chip（xs 时 chip 换行到文件名下方） */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box
          sx={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 0.5, minWidth: 0 }}
        >
          <Link
            href={sanitizeUrl(file.href)}
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: { xs: '0.75rem', sm: '0.8rem' },
              wordBreak: 'break-all',
              lineHeight: 1.4,
              minWidth: 0,
            }}
          >
            {file.name}
          </Link>
          {file.arch && (
            <Chip
              label={file.arch}
              size="small"
              variant="outlined"
              sx={{
                fontSize: '0.65rem',
                height: 18,
                fontFamily: '"JetBrains Mono", monospace',
                flexShrink: 0,
              }}
            />
          )}
        </Box>
      </Box>

      {/* 大小：xs 时隐藏，避免撑破行 */}
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.75rem',
          flexShrink: 0,
          minWidth: { sm: 56 },
          textAlign: 'right',
          display: { xs: 'none', sm: 'block' },
        }}
      >
        {file.size}
      </Typography>

      {/* 操作按钮 */}
      <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0 }}>
        <Tooltip title={copied ? t('common.copied') : t('common.copyLink')}>
          <IconButton
            size="small"
            sx={{ p: 0.5 }}
            onClick={handleCopy}
            color={copied ? 'success' : 'default'}
          >
            {copied ? <CheckIcon sx={{ fontSize: 14 }} /> : <CopyIcon sx={{ fontSize: 14 }} />}
          </IconButton>
        </Tooltip>
        <Tooltip title={t('common.download')}>
          <IconButton
            size="small"
            sx={{ p: 0.5 }}
            component="a"
            href={sanitizeUrl(file.href)}
            target="_blank"
            rel="noopener noreferrer"
            color="primary"
          >
            <DownloadIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

// ─── 主组件 ───────────────────────────────────────────────────────────────────

interface GithubReleaseViewerProps {
  /** 镜像根路径，如 /github-release/ */
  rootPath: string;
  /**
   * 子项目路径，如 /github-release/microsoft/OBS-Studio/
   * 设置后跳过项目列表，直接展示该子项目的 releases 和文件。
   */
  subProjectPath?: string;
  /**
   * rootPath 是否已定位到某个 org 目录（如 /github-release/obsproject/）。
   * 为 true 时，目录条目直接作为 repo 展示，不再向下探索 org→repo 层级。
   */
  isOrgView?: boolean;
}

const GithubReleaseViewer: React.FC<GithubReleaseViewerProps> = ({ rootPath, subProjectPath, isOrgView }) => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  // ── 状态 ──────────────────────────────────────────────────────────────────

  type ViewMode = 'projects' | 'project';
  const [viewMode, setViewMode] = useState<ViewMode>(subProjectPath ? 'project' : 'projects');

  // 项目列表
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  // 每个项目的最新版本号缓存
  const versionCache = useRef<Map<string, string>>(new Map()); // key: `{org}/{repo}`
  const [versionMap, setVersionMap] = useState<Record<string, string>>({});

  // 当前选中的项目
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [releases, setReleases] = useState<Release[]>([]);
  const [releasesLoading, setReleasesLoading] = useState(false);
  const [selectedReleaseIdx, setSelectedReleaseIdx] = useState(0);

  // 当前 release 的文件
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);

  // ── 加载项目列表 ────────────────────────────────────────────────────────

  const loadProjects = useCallback(
    async (signal?: AbortSignal) => {
      setProjectsLoading(true);
      setProjectsError(null);
      try {
        const norm = rootPath.endsWith('/') ? rootPath : rootPath + '/';

        if (isOrgView) {
          // isOrgView: rootPath 已是 org 目录，条目直接就是 repo
          const repoEntries = await fetchDir(norm);
          if (signal?.aborted) return;
          const repoDirs = repoEntries.filter((e) => e.isDir);
          // 从路径提取 org 名
          const parts = norm.replace(/\/+$/, '').split('/');
          const orgName = parts[parts.length - 1] ?? '';

          const allProjects: Project[] = repoDirs.map((r) => ({
            org: orgName,
            repo: r.name.replace(/\/$/, ''),
            orgDate: r.date,
          }));
          setProjects(allProjects);

          // 拉取每个 repo 的最新版本号
          const versionResults = await Promise.allSettled(
            repoDirs.map(async (r) => {
              const versions = await fetchDir(r.href);
              const versionDirs = versions
                .filter((v) => v.isDir && looksLikeVersion(v.name.replace(/\/$/, '')) && v.name.replace(/\/$/, '').toLowerCase() !== 'latestrelease')
                .sort((a, b) => compareVersionDesc(a.name.replace(/\/$/, ''), b.name.replace(/\/$/, '')));
              const latest = versionDirs[0];
              const repoName = r.name.replace(/\/$/, '');
              return {
                key: `${orgName}/${repoName}`,
                version: latest?.name.replace(/\/$/, '') ?? '',
              };
            })
          );
          if (signal?.aborted) return;

          const map: Record<string, string> = {};
          versionResults.forEach((r) => {
            if (r.status === 'fulfilled' && r.value) {
              versionCache.current.set(r.value.key, r.value.version);
              map[r.value.key] = r.value.version;
            }
          });
          setVersionMap(map);
        } else {
          // 标准模式：rootPath → orgs → repos
          // Step1: 获取 org 列表
          const orgs = await fetchDir(norm);
          if (signal?.aborted) return;
          const orgDirs = orgs.filter((e) => e.isDir);

          // Step2: 并行拉取每个 org 下的 repo
          const results = await Promise.allSettled(
            orgDirs.map(async (org) => {
              const repos = await fetchDir(org.href);
              return repos
                .filter((r) => r.isDir)
                .map(
                  (repo): Project => ({
                    org: org.name.replace(/\/$/, ''),
                    repo: repo.name.replace(/\/$/, ''),
                    orgDate: org.date,
                  })
                );
            })
          );
          if (signal?.aborted) return;

          const allProjects: Project[] = results.flatMap((r) =>
            r.status === 'fulfilled' ? r.value : []
          );
          setProjects(allProjects);

          // Step3: 并行拉取每个项目的版本列表，只取最新非LatestRelease版本号
          const versionResults = await Promise.allSettled(
            allProjects.map(async (proj) => {
              const rootOrg = orgs.find((o) => o.name.replace(/\/$/, '') === proj.org);
              if (!rootOrg) return null;
              const orgEntries = (await fetchDir(rootOrg.href)).filter((e) => e.isDir);
              const repoEntry = orgEntries.find((r) => r.name.replace(/\/$/, '') === proj.repo);
              if (!repoEntry) return null;
              const versions = await fetchDir(repoEntry.href);
              const versionDirs = versions
                .filter((v) => v.isDir && looksLikeVersion(v.name.replace(/\/$/, '')) && v.name.replace(/\/$/, '').toLowerCase() !== 'latestrelease')
                .sort((a, b) => compareVersionDesc(a.name.replace(/\/$/, ''), b.name.replace(/\/$/, '')));
              const latest = versionDirs[0];
              return {
                key: `${proj.org}/${proj.repo}`,
                version: latest?.name.replace(/\/$/, '') ?? '',
              };
            })
          );
          if (signal?.aborted) return;

          const map: Record<string, string> = {};
          versionResults.forEach((r) => {
            if (r.status === 'fulfilled' && r.value) {
              versionCache.current.set(r.value.key, r.value.version);
              map[r.value.key] = r.value.version;
            }
          });
          setVersionMap(map);
        }
      } catch (err: unknown) {
        if (signal?.aborted) return;
        setProjectsError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!signal?.aborted) setProjectsLoading(false);
      }
    },
    [rootPath, isOrgView]
  );

  useEffect(() => {
    if (subProjectPath) return; // 子项目模式：跳过项目列表加载
    const controller = new AbortController();
    loadProjects(controller.signal);
    return () => controller.abort();
  }, [loadProjects, subProjectPath]);

  // ── 子项目模式：递归加载 releases ──────────────────────────────────────────
  const subProjectLoaded = useRef(false);
  useEffect(() => {
    if (!subProjectPath || subProjectLoaded.current) return;
    subProjectLoaded.current = true;
    const norm = subProjectPath.endsWith('/') ? subProjectPath : subProjectPath + '/';
    // 从路径提取 org/repo 用于显示
    const parts = norm.replace(/\/+$/, '').split('/');
    const repo = parts[parts.length - 1] ?? '';
    const org = parts[parts.length - 2] ?? '';
    setSelectedProject({ org, repo, orgDate: '' });
    // 递归加载
    setReleasesLoading(true);
    loadDirectoryRecursive(norm)
      .then(({ releases: rels, files: f }) => {
        setReleases(rels);
        setFiles(f);
        if (rels.length > 0) setSelectedReleaseIdx(0);
      })
      .catch((err) => {
        if (import.meta.env.DEV) console.warn('[GithubReleaseViewer] subProject loadReleases:', err);
        setReleases([]);
      })
      .finally(() => setReleasesLoading(false));
  }, [subProjectPath]);

  // ── 加载选中项目的 releases ────────────────────────────────────────────

  const loadReleases = useCallback(
    async (proj: Project) => {
      setReleasesLoading(true);
      setReleases([]);
      setFiles([]);
      try {
        const norm = rootPath.endsWith('/') ? rootPath : rootPath + '/';
        // isOrgView 时 norm 已是 org 目录，直接拼 repo；否则拼 org/repo
        const path = isOrgView
          ? `${norm}${encodeURIComponent(proj.repo)}/`
          : `${norm}${encodeURIComponent(proj.org)}/${encodeURIComponent(proj.repo)}/`;
        const { releases: rels, files: f } = await loadDirectoryRecursive(path);
        setReleases(rels);
        setFiles(f);
        if (rels.length > 0) setSelectedReleaseIdx(0);
      } catch (err) {
        if (import.meta.env.DEV) console.warn('[GithubReleaseViewer] loadReleases:', err);
        setReleases([]);
      } finally {
        setReleasesLoading(false);
      }
    },
    [rootPath, isOrgView]
  );

  // ── 加载 release 文件列表 ─────────────────────────────────────────────

  const loadFiles = useCallback(async (releasePath: string) => {
    setFilesLoading(true);
    setFiles([]);
    try {
      const entries = await fetchDir(releasePath);
      const fileEntries: FileEntry[] = entries
        .filter((e) => !e.isDir)
        .map(
          (e): FileEntry => ({
            name: e.name,
            href: e.href,
            size: e.size,
            date: e.date,
            platform: detectPlatform(e.name),
            arch: detectArch(e.name),
          })
        );
      setFiles(fileEntries);
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[GithubReleaseViewer] loadFiles:', err);
      setFiles([]);
    } finally {
      setFilesLoading(false);
    }
  }, []);

  // 当 release 选择变化时加载文件
  useEffect(() => {
    if (releases.length > 0 && releases[selectedReleaseIdx]) {
      loadFiles(releases[selectedReleaseIdx].path);
    }
  }, [releases, selectedReleaseIdx, loadFiles]);

  // ── 项目选择 ────────────────────────────────────────────────────────────

  const handleSelectProject = useCallback(
    (proj: Project) => {
      setSelectedProject(proj);
      setViewMode('project');
      loadReleases(proj);
      setFileSearch('');
    },
    [loadReleases]
  );

  const handleBack = () => {
    setViewMode('projects');
    setSelectedProject(null);
    setReleases([]);
    setFiles([]);
    setFileSearch('');
  };

  // ── URL 参数自动选中项目 ──────────────────────────────────────────────────
  const autoSelectedRef = useRef(false);
  useEffect(() => {
    if (autoSelectedRef.current || projectsLoading || projectsError || projects.length === 0) return;
    const org = searchParams.get('org');
    const repo = searchParams.get('repo');
    if (!org || !repo) return;
    const match = projects.find((p) => p.org === org && p.repo === repo);
    if (match) {
      autoSelectedRef.current = true;
      handleSelectProject(match);
    }
  }, [projects, projectsLoading, projectsError, searchParams, handleSelectProject]);

  // ── 文件搜索 ─────────────────────────────────────────────────────────────
  const [fileSearch, setFileSearch] = useState('');
  const fileSearchRef = useRef<HTMLInputElement>(null);

  // 切换 release 时清空搜索
  useEffect(() => {
    setFileSearch('');
  }, [selectedReleaseIdx]);

  const filteredFiles = useMemo(() => {
    const q = fileSearch.trim().toLowerCase();
    return q ? files.filter((f) => f.name.toLowerCase().includes(q)) : files;
  }, [files, fileSearch]);

  // ── 按平台分组文件（基于过滤后的列表） ────────────────────────────────────
  const filesByPlatform = PLATFORM_ORDER.reduce<Record<string, FileEntry[]>>((acc, p) => {
    const group = filteredFiles.filter((f) => f.platform === p);
    if (group.length > 0) acc[p] = group;
    return acc;
  }, {});

  // ── 渲染：项目列表 ──────────────────────────────────────────────────────

  if (viewMode === 'projects') {
    if (projectsError) {
      return (
        <Alert
          severity="error"
          action={
            <Button size="small" onClick={() => loadProjects()} startIcon={<RefreshIcon />}>
              {t('common.retry')}
            </Button>
          }
        >
          {projectsError}
        </Alert>
      );
    }

    return (
      <Box>
        {/* 标题栏 */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            {projectsLoading
              ? t('githubRelease.loadingProjects')
              : t('githubRelease.projectCount', { count: projects.length })}
          </Typography>
          <Tooltip title={t('common.refresh')}>
            <IconButton size="small" onClick={() => loadProjects()} disabled={projectsLoading}>
              <RefreshIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* 项目卡片网格 */}
        <Grid container spacing={2}>
          {projectsLoading
            ? Array.from({ length: 12 }).map((_, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Skeleton variant="rounded" height={140} sx={{ borderRadius: 3 }} />
                </Grid>
              ))
            : projects.map((proj) => {
                const versionKey = `${proj.org}/${proj.repo}`;
                return (
                  <Grid key={versionKey} size={{ xs: 12, sm: 6, md: 4 }}>
                    <ProjectCard
                      project={proj}
                      latestVersion={versionMap[versionKey]}
                      onSelect={() => handleSelectProject(proj)}
                    />
                  </Grid>
                );
              })}
        </Grid>
      </Box>
    );
  }

  // ── 渲染：项目详情 ──────────────────────────────────────────────────────

  const selectedRelease = releases[selectedReleaseIdx];

  return (
    <Box>
      {/* 返回按钮（子项目模式下隐藏，由页面面包屑提供导航） */}
      {!subProjectPath && (
        <Button
          size="small"
          startIcon={<BackIcon />}
          onClick={handleBack}
          sx={{ mb: 2, color: 'text.secondary' }}
        >
          {t('githubRelease.backToProjects')}
        </Button>
      )}

      {/* 项目标题 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <ProjectAvatar org={selectedProject?.org ?? ''} size={32} />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {selectedProject?.repo}
          </Typography>
          <Typography
            variant="caption"
            component="a"
            href={`https://github.com/${selectedProject?.org}/${selectedProject?.repo}/releases`}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              color: 'text.secondary',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.72rem',
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            {selectedProject?.org}/{selectedProject?.repo} ↗
          </Typography>
        </Box>
      </Box>

      {/* Release 版本 Tabs */}
      {releasesLoading ? (
        <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1, mb: 2 }} />
      ) : releases.length === 0 && files.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('githubRelease.noReleases')}
        </Alert>
      ) : releases.length > 0 || files.length > 0 ? (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', minWidth: 0 }}>
          {/* 版本 Tabs（扁平结构时无 release 子目录，不显示） */}
          {releases.length > 0 ? (
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'action.hover', px: 1 }}>
              <Tabs
              value={selectedReleaseIdx}
              onChange={(_, v) => setSelectedReleaseIdx(v)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{
                minHeight: 40,
                '& .MuiTab-root': {
                  minHeight: 40,
                  py: 0,
                  fontSize: '0.8rem',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontWeight: 600,
                  textTransform: 'none',
                },
              }}
            >
              {releases.map((rel, idx) => (
                <Tab
                  key={rel.path}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {rel.isLatest && (
                        <Chip
                          label="Latest"
                          size="small"
                          color="success"
                          sx={{ fontSize: '0.6rem', height: 16, mr: 0.25 }}
                        />
                      )}
                      {rel.isLatest ? t('githubRelease.latestRelease') : rel.name}
                    </Box>
                  }
                  value={idx}
                />
              ))}
            </Tabs>
          </Box>
          ) : null}

          {/* 版本信息栏 */}
          {selectedRelease && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 2,
                py: 1,
                borderBottom: 1,
                borderColor: 'divider',
                gap: 1,
                flexWrap: 'wrap',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <LocalOfferIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    color: 'text.secondary',
                  }}
                >
                  {selectedRelease.isLatest
                    ? t('githubRelease.latestRelease')
                    : selectedRelease.name}
                </Typography>
                {selectedRelease.date && (
                  <>
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      ·
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      {selectedRelease.date}
                    </Typography>
                  </>
                )}
                {!filesLoading && files.length > 0 && (
                  <Chip
                    size="small"
                    label={t('githubRelease.fileCount', { count: files.length })}
                    variant="outlined"
                    sx={{ fontSize: '0.68rem', height: 20 }}
                  />
                )}
              </Box>
              <Tooltip title={t('common.openInBrowser')}>
                <IconButton
                  size="small"
                  component="a"
                  href={selectedRelease.path}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <OpenIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </Box>
          )}

          {/* 文件列表（按平台分组） */}
          <Box sx={{ p: 1.5 }}>
            {filesLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton
                  key={i}
                  variant="rectangular"
                  height={36}
                  sx={{ mb: 0.5, borderRadius: 1 }}
                />
              ))
            ) : files.length === 0 ? (
              <Box
                sx={{
                  py: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1,
                  color: 'text.disabled',
                }}
              >
                <EmptyIcon sx={{ fontSize: 36 }} />
                <Typography variant="body2">{t('githubRelease.noFiles')}</Typography>
              </Box>
            ) : (
              <>
                {/* 搜索栏（文件数 > 6 时才显示） */}
                {files.length > 6 && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                      mb: 1.5,
                      px: 1,
                      py: 0.5,
                      border: '1.5px solid',
                      borderColor: fileSearch ? 'primary.main' : 'divider',
                      borderRadius: 2,
                      bgcolor: 'background.paper',
                      transition: 'border-color 0.15s',
                      boxShadow: fileSearch ? '0 0 0 3px rgba(59,130,246,0.12)' : 'none',
                    }}
                  >
                    <SearchIcon sx={{ fontSize: 15, color: 'text.secondary', flexShrink: 0 }} />
                    <InputBase
                      inputRef={fileSearchRef}
                      value={fileSearch}
                      onChange={(e) => setFileSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Escape' && setFileSearch('')}
                      placeholder={t('githubRelease.searchFiles')}
                      inputProps={{ 'aria-label': t('githubRelease.searchFiles') }}
                      sx={{
                        flex: 1,
                        fontSize: '0.82rem',
                        fontFamily: '"JetBrains Mono", monospace',
                      }}
                    />
                    {fileSearch && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          flexShrink: 0,
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.72rem',
                        }}
                      >
                        {filteredFiles.length}/{files.length}
                      </Typography>
                    )}
                    {fileSearch && (
                      <IconButton
                        size="small"
                        onClick={() => {
                          setFileSearch('');
                          fileSearchRef.current?.focus();
                        }}
                        aria-label={t('common.clear')}
                        sx={{ p: 0.25 }}
                      >
                        <ClearIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    )}
                  </Box>
                )}

                {/* 无结果 */}
                {fileSearch && filteredFiles.length === 0 ? (
                  <Box sx={{ py: 3, textAlign: 'center', color: 'text.disabled' }}>
                    <Typography variant="body2">
                      {t('directory.noResults', { query: fileSearch })}
                    </Typography>
                  </Box>
                ) : (
                  PLATFORM_ORDER.filter((p) => filesByPlatform[p]).map((platform, idx) => (
                    <Box key={platform}>
                      {idx > 0 && <Divider sx={{ my: 1 }} />}
                      {/* 平台标题 */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.75,
                          px: 1.5,
                          py: 0.5,
                          mb: 0.25,
                        }}
                      >
                        {platform === 'checksum' ? (
                          <ChecksumIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                        ) : (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              color: 'text.secondary',
                              fontSize: '1rem',
                              lineHeight: 1,
                            }}
                          >
                            {PLATFORM_ICON[platform]}
                          </Box>
                        )}
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                            color: 'text.secondary',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          {PLATFORM_LABEL[platform]}
                        </Typography>
                        <Chip
                          size="small"
                          label={filesByPlatform[platform].length}
                          sx={{ height: 18, fontSize: '0.65rem' }}
                        />
                      </Box>
                      {/* 该平台的文件 */}
                      {filesByPlatform[platform].map((file) => (
                        <FileRow key={file.href} file={file} />
                      ))}
                    </Box>
                  ))
                )}
              </>
            )}
          </Box>
        </Paper>
      ) : null}
    </Box>
  );
};

export default GithubReleaseViewer;
