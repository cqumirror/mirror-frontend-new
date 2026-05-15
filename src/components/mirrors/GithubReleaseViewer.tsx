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
  Tag as TagIcon,
  FolderOff as EmptyIcon,
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
} from '@mui/material';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

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
  platform: 'windows' | 'linux' | 'macos' | 'android' | 'other';
  arch: string;
}

// ─── 平台检测 ─────────────────────────────────────────────────────────────────

function detectPlatform(name: string): FileEntry['platform'] {
  const f = name.toLowerCase();
  if (
    f.includes('windows') ||
    f.includes('_win') ||
    f.endsWith('.exe') ||
    f.endsWith('.msi') ||
    f.endsWith('.msix')
  )
    return 'windows';
  if (
    f.includes('darwin') ||
    f.includes('macos') ||
    f.includes('osx') ||
    f.endsWith('.dmg') ||
    f.endsWith('.pkg')
  )
    return 'macos';
  if (
    f.includes('linux') ||
    f.endsWith('.deb') ||
    f.endsWith('.rpm') ||
    f.endsWith('.appimage') ||
    f.endsWith('.flatpak')
  )
    return 'linux';
  if (f.includes('android') || f.endsWith('.apk') || f.endsWith('.aab')) return 'android';
  return 'other';
}

function detectArch(name: string): string {
  const f = name.toLowerCase();
  if (f.includes('amd64') || f.includes('x86_64') || f.includes('x64')) return 'x64';
  if (f.includes('arm64') || f.includes('aarch64')) return 'arm64';
  if (f.includes('armv7') || f.includes('arm32') || f.includes('armv6') || f.includes('armv5'))
    return f.match(/arm(v\d)/)?.[1] ?? 'arm';
  if (f.includes('386') || f.includes('x86') || f.includes('i386')) return 'x86';
  if (f.includes('riscv64')) return 'riscv64';
  if (f.includes('ppc64')) return 'ppc64';
  if (f.includes('mips')) return f.match(/mips\w*/)?.[0] ?? 'mips';
  return '';
}

// ─── 常量 ────────────────────────────────────────────────────────────────────

const PLATFORM_LABEL: Record<FileEntry['platform'], string> = {
  windows: 'Windows',
  linux: 'Linux',
  macos: 'macOS',
  android: 'Android',
  other: '通用',
};

const PLATFORM_EMOJI: Record<FileEntry['platform'], string> = {
  windows: '🪟',
  linux: '🐧',
  macos: '',
  android: '🤖',
  other: '📦',
};

const PLATFORM_ORDER: FileEntry['platform'][] = ['windows', 'linux', 'macos', 'android', 'other'];

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
  const res = await fetch(url, { headers: { Accept: 'text/html' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  return parseDirEntries(html, url);
}

// ─── 子组件：项目卡片 ──────────────────────────────────────────────────────────

interface ProjectCardProps {
  project: Project;
  latestVersion?: string;
  onSelect: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, latestVersion, onSelect }) => {
  const [imgError, setImgError] = useState(false);
  const avatarUrl = `https://github.com/${project.org}.png?size=64`;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 2,
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: (theme) =>
            theme.palette.mode === 'dark'
              ? '0 4px 16px rgba(96,165,250,0.15)'
              : '0 4px 16px rgba(59,130,246,0.12)',
          transform: 'translateY(-2px)',
        },
      }}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
        <Avatar
          src={imgError ? undefined : avatarUrl}
          onError={() => setImgError(true)}
          sx={{ width: 40, height: 40, bgcolor: 'primary.main', fontSize: '1.1rem', flexShrink: 0 }}
        >
          {project.org[0]?.toUpperCase()}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              fontSize: '0.92rem',
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
              fontSize: '0.72rem',
            }}
          >
            {project.org}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        {latestVersion ? (
          <Chip
            icon={<TagIcon sx={{ fontSize: '12px !important' }} />}
            label={latestVersion}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.7rem', height: 22, maxWidth: '100%' }}
          />
        ) : (
          <Skeleton variant="rounded" width={80} height={22} />
        )}
        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem', flexShrink: 0 }}>
          {project.orgDate}
        </Typography>
      </Box>
    </Paper>
  );
};

// ─── 子组件：文件行 ──────────────────────────────────────────────────────────

interface FileRowProps {
  file: FileEntry;
}

const FileRow: React.FC<FileRowProps> = ({ file }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(file.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 0.8,
        borderRadius: 1,
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      {/* 文件名 */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Link
          href={file.href}
          target="_blank"
          rel="noopener noreferrer"
          underline="hover"
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.8rem',
            wordBreak: 'break-all',
            lineHeight: 1.4,
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
              ml: 0.75,
              fontSize: '0.65rem',
              height: 18,
              fontFamily: '"JetBrains Mono", monospace',
              verticalAlign: 'middle',
            }}
          />
        )}
      </Box>

      {/* 大小 */}
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.75rem',
          flexShrink: 0,
          minWidth: 60,
          textAlign: 'right',
        }}
      >
        {file.size}
      </Typography>

      {/* 操作按钮 */}
      <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0 }}>
        <Tooltip title={copied ? t('common.copied') : t('common.copyLink')}>
          <IconButton size="small" sx={{ p: 0.5 }} onClick={handleCopy} color={copied ? 'success' : 'default'}>
            {copied ? <CheckIcon sx={{ fontSize: 14 }} /> : <CopyIcon sx={{ fontSize: 14 }} />}
          </IconButton>
        </Tooltip>
        <Tooltip title={t('common.download')}>
          <IconButton
            size="small"
            sx={{ p: 0.5 }}
            component="a"
            href={file.href}
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
}

const GithubReleaseViewer: React.FC<GithubReleaseViewerProps> = ({ rootPath }) => {
  const { t } = useTranslation();

  // ── 状态 ──────────────────────────────────────────────────────────────────

  type ViewMode = 'projects' | 'project';
  const [viewMode, setViewMode] = useState<ViewMode>('projects');

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

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    setProjectsError(null);
    try {
      // Step1: 获取 org 列表
      const norm = rootPath.endsWith('/') ? rootPath : rootPath + '/';
      const orgs = await fetchDir(norm);
      const orgDirs = orgs.filter((e) => e.isDir);

      // Step2: 并行拉取每个 org 下的 repo
      const results = await Promise.allSettled(
        orgDirs.map(async (org) => {
          const repos = await fetchDir(org.href);
          return repos
            .filter((r) => r.isDir)
            .map((repo): Project => ({
              org: org.name.replace(/\/$/, ''),
              repo: repo.name.replace(/\/$/, ''),
              orgDate: org.date,
            }));
        })
      );

      const allProjects: Project[] = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
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
          const latest = versions
            .filter((v) => v.isDir && v.name.replace(/\/$/, '').toLowerCase() !== 'latestrelease')
            .sort((a, b) => b.date.localeCompare(a.date))[0];
          return { key: `${proj.org}/${proj.repo}`, version: latest?.name.replace(/\/$/, '') ?? '' };
        })
      );

      const map: Record<string, string> = {};
      versionResults.forEach((r) => {
        if (r.status === 'fulfilled' && r.value) {
          versionCache.current.set(r.value.key, r.value.version);
          map[r.value.key] = r.value.version;
        }
      });
      setVersionMap(map);
    } catch (err: unknown) {
      setProjectsError(err instanceof Error ? err.message : String(err));
    } finally {
      setProjectsLoading(false);
    }
  }, [rootPath]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // ── 加载选中项目的 releases ────────────────────────────────────────────

  const loadReleases = useCallback(async (proj: Project) => {
    setReleasesLoading(true);
    setReleases([]);
    setFiles([]);
    try {
      const norm = rootPath.endsWith('/') ? rootPath : rootPath + '/';
      const path = `${norm}${encodeURIComponent(proj.org)}/${encodeURIComponent(proj.repo)}/`;
      const entries = await fetchDir(path);
      const releaseList: Release[] = entries
        .filter((e) => e.isDir)
        .map((e) => {
          const name = e.name.replace(/\/$/, '');
          return {
            name,
            path: e.href,
            date: e.date,
            isLatest: name.toLowerCase() === 'latestrelease',
          };
        })
        // LatestRelease 始终排第一
        .sort((a, b) => {
          if (a.isLatest) return -1;
          if (b.isLatest) return 1;
          return b.date.localeCompare(a.date);
        });
      setReleases(releaseList);
      setSelectedReleaseIdx(0);
    } catch {
      setReleases([]);
    } finally {
      setReleasesLoading(false);
    }
  }, [rootPath]);

  // ── 加载 release 文件列表 ─────────────────────────────────────────────

  const loadFiles = useCallback(async (releasePath: string) => {
    setFilesLoading(true);
    setFiles([]);
    try {
      const entries = await fetchDir(releasePath);
      const fileEntries: FileEntry[] = entries
        .filter((e) => !e.isDir)
        .map((e): FileEntry => ({
          name: e.name,
          href: e.href,
          size: e.size,
          date: e.date,
          platform: detectPlatform(e.name),
          arch: detectArch(e.name),
        }));
      setFiles(fileEntries);
    } catch {
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

  const handleSelectProject = (proj: Project) => {
    setSelectedProject(proj);
    setViewMode('project');
    loadReleases(proj);
  };

  const handleBack = () => {
    setViewMode('projects');
    setSelectedProject(null);
    setReleases([]);
    setFiles([]);
  };

  // ── 按平台分组文件 ──────────────────────────────────────────────────────

  const filesByPlatform = PLATFORM_ORDER.reduce<Record<string, FileEntry[]>>((acc, p) => {
    const group = files.filter((f) => f.platform === p);
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
            <Button size="small" onClick={loadProjects} startIcon={<RefreshIcon />}>
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
            <IconButton size="small" onClick={loadProjects} disabled={projectsLoading}>
              <RefreshIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* 项目卡片网格 */}
        <Grid container spacing={2}>
          {projectsLoading
            ? Array.from({ length: 12 }).map((_, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
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
      {/* 返回按钮 */}
      <Button
        size="small"
        startIcon={<BackIcon />}
        onClick={handleBack}
        sx={{ mb: 2, color: 'text.secondary' }}
      >
        {t('githubRelease.backToProjects')}
      </Button>

      {/* 项目标题 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Avatar
          src={`https://github.com/${selectedProject?.org}.png?size=64`}
          sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}
        >
          {selectedProject?.org[0]?.toUpperCase()}
        </Avatar>
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
      ) : releases.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('githubRelease.noReleases')}
        </Alert>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          {/* 版本 Tabs */}
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
                <TagIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
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
                <Skeleton key={i} variant="rectangular" height={36} sx={{ mb: 0.5, borderRadius: 1 }} />
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
              PLATFORM_ORDER.filter((p) => filesByPlatform[p]).map((platform, idx) => (
                <Box key={platform}>
                  {idx > 0 && <Divider sx={{ my: 1 }} />}
                  {/* 平台标题 */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.5, mb: 0.25 }}>
                    <Typography sx={{ fontSize: '1rem', lineHeight: 1 }}>
                      {PLATFORM_EMOJI[platform]}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}
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
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default GithubReleaseViewer;
