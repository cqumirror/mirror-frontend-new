// src/pages/GitMirrorsPage.tsx
// Git 仓库镜像 & GitHub Release 项目展示页

import {
  ArrowBack as BackIcon,
  Code as CodeIcon,
  GitHub as GitHubIcon,
} from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  Chip,
  Container,
  Grid,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import type { GithubReleaseProject } from '../api/directoryListing';
import StatusChip from '../components/mirrors/StatusChip';
import { hasMdxDoc } from '../docs';
import { useGithubReleaseProjects } from '../hooks/useGithubReleaseProjects';
import { useMirrors } from '../hooks/useMirrors';
import { useLocaleStore } from '../stores/mirrorStore';
import { canonicalUrl } from '../utils/seo';
import { formatRelativeTime } from '../utils/time';

// ── 头像颜色（复用 GithubReleaseViewer 的配色）─────────────────────────────────

const AVATAR_COLORS = [
  { bg: '#DBEAFE', fg: '#1D4ED8' },
  { bg: '#D1FAE5', fg: '#065F46' },
  { bg: '#FEF3C7', fg: '#92400E' },
  { bg: '#FCE7F3', fg: '#9D174D' },
  { bg: '#EDE9FE', fg: '#5B21B6' },
  { bg: '#FFEDD5', fg: '#9A3412' },
  { bg: '#CFFAFE', fg: '#155E75' },
  { bg: '#F0FDF4', fg: '#166534' },
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

// ── 项目头像 ──────────────────────────────────────────────────────────────────

const ProjectAvatar: React.FC<{ org: string; size?: number }> = ({ org, size = 40 }) => {
  const colorIdx = orgColorIndex(org);
  return (
    <Avatar
      variant="rounded"
      src={`https://github.com/${org}.png?size=64`}
      sx={{
        width: size,
        height: size,
        borderRadius: '6px',
        fontSize: '1rem',
        fontWeight: 700,
        flexShrink: 0,
        bgcolor: (theme) =>
          theme.palette.mode === 'dark' ? AVATAR_COLORS_DARK[colorIdx].bg : AVATAR_COLORS[colorIdx].bg,
        color: (theme) =>
          theme.palette.mode === 'dark' ? AVATAR_COLORS_DARK[colorIdx].fg : AVATAR_COLORS[colorIdx].fg,
      }}
    >
      {org.charAt(0).toUpperCase()}
    </Avatar>
  );
};

// ── GitHub Release 项目卡片 ───────────────────────────────────────────────────

/** 尝试将 repo 名映射到 github-release-* 帮助文档 slug */
function repoToDocId(repo: string, locale: string): string | null {
  const lower = repo.toLowerCase();
  const candidates = [`github-release-${lower}`];
  // repo 名含 '.' 时也尝试 '-' 版本（如 Smiley-Sans -> smiley-sans）
  if (lower.includes('.')) candidates.push(`github-release-${lower.replace(/\./g, '-')}`);
  for (const id of candidates) {
    if (hasMdxDoc(id, locale)) return id;
  }
  return null;
}

const ProjectCard: React.FC<{ project: GithubReleaseProject; locale: string }> = ({ project, locale }) => {
  const navigate = useNavigate();
  const handleClick = () => {
    const docId = repoToDocId(project.repo, locale);
    if (docId) {
      // 传递 org/repo 参数，使 GithubReleaseViewer 自动选中子项目
      navigate(`/mirrors/${docId}?org=${encodeURIComponent(project.org)}&repo=${encodeURIComponent(project.repo)}`);
    } else {
      navigate(`/mirrors/github-release?org=${encodeURIComponent(project.org)}&repo=${encodeURIComponent(project.repo)}`);
    }
  };
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
        onClick={handleClick}
        sx={{
          borderRadius: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          height: '100%',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2 }}>
          <ProjectAvatar org={project.org} />
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
      </CardActionArea>
    </Card>
  );
};

// ── 主页面 ────────────────────────────────────────────────────────────────────

const GitMirrorsPage: React.FC = () => {
  const { t } = useTranslation();
  const { locale } = useLocaleStore();
  const navigate = useNavigate();

  // Git 仓库镜像（从已有数据中过滤）
  const { data: mirrors = [], isLoading: mirrorsLoading, error: mirrorsError } = useMirrors();
  const gitMirrors = useMemo(() => mirrors.filter((m) => m.id.endsWith('.git')), [mirrors]);

  // GitHub Release 项目（从服务器目录读取）
  const {
    data: projects = [],
    isLoading: projectsLoading,
    error: projectsError,
    refetch: refetchProjects,
  } = useGithubReleaseProjects();

  return (
    <>
      <title>{`${t('gitPage.title')} - 重庆大学开源软件镜像站 CQU Mirror`}</title>
      <meta name="description" content={t('gitPage.gitDesc')} />
      <link rel="canonical" href={canonicalUrl('/mirrors/git')} />

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        {/* 面包屑 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, flexWrap: 'wrap' }}>
          <Button
            startIcon={<BackIcon />}
            onClick={() => navigate('/')}
            size="small"
            sx={{ color: 'text.secondary' }}
          >
            {t('common.backToHome')}
          </Button>
          <Typography sx={{ color: 'text.disabled', display: { xs: 'none', sm: 'block' } }}>/</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('gitPage.title')}
          </Typography>
        </Box>

        {/* 页面标题 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
          <CodeIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            {t('gitPage.title')}
          </Typography>
        </Box>

        {/* ── Section 1: Git 仓库镜像 ────────────────────────────────────────── */}
        <Box sx={{ mb: 5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            {t('gitPage.gitSection')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            {t('gitPage.gitDesc')}
          </Typography>

          {mirrorsLoading ? (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <TableCell key={i}>
                        <Skeleton width={60} />
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[1, 2, 3].map((row) => (
                    <TableRow key={row}>
                      {[1, 2, 3, 4, 5].map((col) => (
                        <TableCell key={col}>
                          <Skeleton width={col === 1 ? 120 : 80} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : mirrorsError ? (
            <Alert severity="error">{String(mirrorsError)}</Alert>
          ) : gitMirrors.length === 0 ? (
            <Alert severity="info">{t('gitPage.noGitMirrors')}</Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>{t('gitPage.colName')}</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                      ID
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{t('gitPage.colStatus')}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{t('gitPage.colLastUpdated')}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{t('gitPage.colSize')}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{t('gitPage.colUpstream')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {gitMirrors.map((m) => (
                    <TableRow
                      key={m.id}
                      hover
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                      onClick={() => navigate(`/mirrors/${m.id}`)}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {m.name[locale]}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="caption"
                          sx={{ fontFamily: '"JetBrains Mono", monospace', color: 'text.secondary' }}
                        >
                          {m.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <StatusChip status={m.status} size="small" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                          {formatRelativeTime(m.lastUpdated, locale)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{m.size || '-'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'text.secondary',
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'block',
                          }}
                        >
                          {m.upstream || '-'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>

        {/* ── Section 2: GitHub Release 项目 ─────────────────────────────────── */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <GitHubIcon sx={{ fontSize: 20 }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {t('gitPage.githubSection')}
            </Typography>
            {!projectsLoading && !projectsError && (
              <Chip
                label={t('gitPage.projectCount', { count: projects.length })}
                size="small"
                variant="outlined"
                sx={{ ml: 1, fontSize: '0.75rem' }}
              />
            )}
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            {t('gitPage.githubDesc')}
          </Typography>

          {projectsLoading ? (
            <Grid container spacing={2}>
              {Array.from({ length: 8 }).map((_, i) => (
                <Grid size={{ xs: 6, sm: 4, md: 3 }} key={i}>
                  <Paper variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Skeleton variant="rounded" width={40} height={40} sx={{ borderRadius: '6px' }} />
                      <Box sx={{ flex: 1 }}>
                        <Skeleton width="70%" height={18} />
                        <Skeleton width="40%" height={14} sx={{ mt: 0.5 }} />
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          ) : projectsError ? (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => refetchProjects()}>
                  {t('common.refresh')}
                </Button>
              }
            >
              {String(projectsError)}
            </Alert>
          ) : projects.length === 0 ? (
            <Alert severity="info">{t('gitPage.noProjects')}</Alert>
          ) : (
            <Grid container spacing={2}>
              {projects.map((proj) => (
                <Grid size={{ xs: 6, sm: 4, md: 3 }} key={`${proj.org}/${proj.repo}`}>
                  <ProjectCard project={proj} locale={locale} />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Container>
    </>
  );
};

export default GitMirrorsPage;
