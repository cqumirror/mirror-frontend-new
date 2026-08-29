import {
  GitHub as GitHubIcon,
  Download as DownloadIcon,
  FolderOpen as FolderOpenIcon,
  InsertDriveFileOutlined as FileIcon,
  NewReleasesOutlined as ReleaseIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  Link,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import React from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';

import { resolveReleaseFiles } from '@/api/isoInfo';
import DocViewer from '@/components/docs/DocViewer';
import LicenseViewer from '@/components/docs/LicenseViewer';
import ReleaseLogo from '@/components/releases/ReleaseLogo';
import { getReleaseHelpDocId } from '@/docs/releases';
import { useReleaseDetail, useReleaseFiles } from '@/hooks/useRelease';
import { getReleaseLicenseId } from '@/licenses';
import type { ReleaseManifest } from '@/types';
import { canonicalUrl } from '@/utils/seo';
import { formatAbsoluteTime } from '@/utils/time';

const projectPath = (release: ReleaseManifest): string =>
  `/github-release/${encodeURIComponent(release.org)}/${encodeURIComponent(release.repo)}/`;

const ReleaseDetail: React.FC = () => {
  const { org = '', repo = '' } = useParams<{ org: string; repo: string }>();
  const [selectedVersionKey, setSelectedVersionKey] = React.useState('');
  const { data: release, isLoading } = useReleaseDetail(org, repo);
  const {
    data: files = [],
    isLoading: filesLoading,
    error: filesError,
  } = useReleaseFiles(org, repo);

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Skeleton width={240} height={28} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={210} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={280} />
      </Container>
    );
  }

  if (!release) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert
          severity="warning"
          action={
            <Button component={RouterLink} to="/" color="inherit" size="small">
              返回首页
            </Button>
          }
        >
          未在 Release Manifest 中找到 {org}/{repo}。
        </Alert>
      </Container>
    );
  }

  const routePath = `/release/${release.org}/${release.repo}`;
  const latestVersion = release.latest?.version || release.latest?.tag || '暂无稳定版本';
  const githubUrl = `https://github.com/${encodeURIComponent(release.org)}/${encodeURIComponent(release.repo)}`;
  const helpDocId = getReleaseHelpDocId(release.org, release.repo);
  const licenseDocId = getReleaseLicenseId(release.org, release.repo);
  const selectedVersion =
    release.releases.find(
      (version) => `${version.tag}:${version.version}` === selectedVersionKey
    ) ??
    release.releases.find((version) => version.tag === release.latest?.tag) ??
    release.releases[0];
  const resolvedFiles = resolveReleaseFiles(
    selectedVersion?.files ?? [],
    files,
    Boolean(release.latest?.tag && selectedVersion?.tag === release.latest.tag),
    selectedVersion
      ? `${projectPath(release)}${release.flat ? '' : `${encodeURIComponent(selectedVersion.version)}/`}`
      : projectPath(release)
  );

  return (
    <>
      <title>{`${release.name} - CQU Mirror`}</title>
      <meta name="description" content={release.desc || `${release.name} GitHub Release 镜像`} />
      <link rel="canonical" href={canonicalUrl(routePath)} />

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Breadcrumbs sx={{ mb: 2.5 }} aria-label="面包屑导航">
          <Link component={RouterLink} to="/" underline="hover" color="inherit">
            首页
          </Link>
          <Link component={RouterLink} to="/release" underline="hover" color="inherit">
            GitHub Releases
          </Link>
          <Typography color="text.primary">{release.name}</Typography>
        </Breadcrumbs>

        <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 3, mb: 3 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2.5}
            sx={{ alignItems: { sm: 'center' } }}
          >
            <ReleaseLogo avatarUrl={release.avatar_url} name={release.name} size={72} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="h3"
                sx={{ fontSize: { xs: '1.8rem', md: '2.35rem' }, fontWeight: 800 }}
              >
                {release.name}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: 'text.secondary', fontFamily: 'monospace', mt: 0.5 }}
              >
                {release.org}/{release.repo}
              </Typography>
              <Typography sx={{ color: 'text.secondary', lineHeight: 1.8, mt: 1.5 }}>
                {release.desc || '该项目暂未提供介绍。'}
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 2, flexWrap: 'wrap' }}>
                <Chip icon={<ReleaseIcon />} label={`最新版本 ${latestVersion}`} color="primary" />
                {release.pre_release && (
                  <Chip label="包含预发布版本" color="warning" variant="outlined" />
                )}
                {release.popular && <Chip label="常用项目" variant="outlined" />}
              </Stack>
            </Box>
          </Stack>

          <Divider sx={{ my: 3 }} />

          <Grid container spacing={2}>
            {[
              ['已同步版本', `${release.releases.length} 个`],
              ['保留版本', release.versions < 0 ? '不限制' : `${release.versions} 个`],
              ['存储大小', release.size || '未提供'],
              ['目录结构', release.flat ? '扁平目录' : '按版本分目录'],
              ['源码归档', release.tarball ? '已同步' : '未同步'],
              ['预发布版本', release.pre_release ? '已同步' : '未同步'],
            ].map(([label, value]) => (
              <Grid key={label} size={{ xs: 6, md: 4 }}>
                <Box sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {label}
                  </Typography>
                  <Typography sx={{ fontWeight: 700, mt: 0.25 }}>{value}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3 }}>
            <Button
              component="a"
              href={projectPath(release)}
              variant="contained"
              startIcon={<FolderOpenIcon />}
            >
              浏览镜像文件
            </Button>
            <Button
              component="a"
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
              startIcon={<GitHubIcon />}
            >
              查看 GitHub 仓库
            </Button>
          </Stack>
        </Paper>

        <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
          同步版本与下载文件
        </Typography>

        {release.releases.length === 0 ? (
          <Alert severity="info" sx={{ mb: 3 }}>
            Manifest 暂无可展示的版本。
          </Alert>
        ) : (
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', mb: 3 }}>
            <Grid container>
              <Grid
                size={{ xs: 12, md: 4 }}
                sx={{
                  borderRight: { md: '1px solid' },
                  borderBottom: { xs: '1px solid', md: 0 },
                  borderColor: 'divider',
                  bgcolor: 'action.hover',
                  p: 1.5,
                }}
              >
                <Typography variant="overline" color="text.secondary" sx={{ px: 1 }}>
                  选择版本
                </Typography>
                <Stack spacing={0.75} sx={{ mt: 0.5 }}>
                  {release.releases.map((version) => {
                    const key = `${version.tag}:${version.version}`;
                    const selected = selectedVersion === version;
                    const isLatest = Boolean(
                      release.latest?.tag && version.tag === release.latest.tag
                    );
                    return (
                      <Button
                        key={key}
                        variant={selected ? 'contained' : 'text'}
                        color={selected ? 'primary' : 'inherit'}
                        onClick={() => setSelectedVersionKey(key)}
                        sx={{
                          display: 'block',
                          textAlign: 'left',
                          textTransform: 'none',
                          px: 1.5,
                          py: 1.25,
                        }}
                      >
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 750 }}>
                            {version.version}
                          </Typography>
                          {isLatest && (
                            <Chip
                              label="最新"
                              size="small"
                              color={selected ? 'default' : 'primary'}
                              sx={{ height: 20 }}
                            />
                          )}
                        </Stack>
                        <Typography
                          variant="caption"
                          sx={{ display: 'block', opacity: 0.8, fontFamily: 'monospace' }}
                        >
                          {version.tag} · {formatAbsoluteTime(version.published_at, 'yyyy-MM-dd')}
                        </Typography>
                      </Button>
                    );
                  })}
                </Stack>
              </Grid>

              <Grid size={{ xs: 12, md: 8 }} sx={{ minWidth: 0 }}>
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography sx={{ fontWeight: 750 }}>{selectedVersion?.version}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {filesLoading
                      ? '正在匹配下载文件…'
                      : formatAbsoluteTime(selectedVersion?.published_at)}
                  </Typography>
                </Box>

                {filesError && (
                  <Alert severity="warning" sx={{ m: 2 }}>
                    无法加载 isoinfo.json，下载地址将根据 manifest 目录规则生成。
                  </Alert>
                )}

                {filesLoading ? (
                  <Stack spacing={1} sx={{ p: 2 }}>
                    {[...Array(4)].map((_, index) => (
                      <Skeleton key={index} variant="rounded" height={58} />
                    ))}
                  </Stack>
                ) : resolvedFiles.length === 0 ? (
                  <Alert severity="info" sx={{ m: 2 }}>
                    此版本没有文件信息。
                  </Alert>
                ) : (
                  <Box sx={{ maxHeight: { xs: 420, md: 560 }, overflowY: 'auto' }}>
                    {resolvedFiles.map((file, index) => (
                      <React.Fragment key={file.fileName}>
                        {index > 0 && <Divider />}
                        <Box
                          component="a"
                          href={file.url}
                          download
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            p: 1.5,
                            color: 'inherit',
                            textDecoration: 'none',
                            transition: 'background-color 0.15s',
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                        >
                          {file.available ? (
                            <DownloadIcon sx={{ color: 'primary.main', flexShrink: 0 }} />
                          ) : (
                            <FileIcon sx={{ color: 'text.secondary', flexShrink: 0 }} />
                          )}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontWeight: file.available ? 650 : 500 }}>
                              {file.displayName}
                            </Typography>
                            {file.available && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                  display: 'block',
                                  overflowWrap: 'anywhere',
                                  fontFamily: 'monospace',
                                }}
                              >
                                {file.fileName}
                              </Typography>
                            )}
                          </Box>
                          {file.available && (
                            <Chip label="可下载" size="small" color="success" variant="outlined" />
                          )}
                        </Box>
                      </React.Fragment>
                    ))}
                  </Box>
                )}
              </Grid>
            </Grid>
          </Paper>
        )}

        {helpDocId && (
          <>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
              使用帮助
            </Typography>
            <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}>
              <DocViewer mirrorId={helpDocId} />
            </Paper>
          </>
        )}

        {licenseDocId && (
          <>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 3, mb: 2 }}>
              许可证
            </Typography>
            <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}>
              <LicenseViewer licenseId={licenseDocId} />
            </Paper>
          </>
        )}
      </Container>
    </>
  );
};

export default ReleaseDetail;
