// src/pages/MirrorDetail.tsx
// 镜像详情页

import {
  ArrowBack as BackIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckIcon,
  OpenInNew as OpenIcon,
  Download as DownloadIcon,
  FolderOpen as FolderIcon,
} from '@mui/icons-material';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Breadcrumbs,
  Link,
  Button,
  Tabs,
  Tab,
  Divider,
  Chip,
  Skeleton,
  Tooltip,
  IconButton,
} from '@mui/material';
import React, { useState, useRef, useEffect } from 'react';
// useSearchParams allows us to read ?tab=help from the URL
import { useParams, useNavigate, Link as RouterLink, useSearchParams } from 'react-router-dom';

import LicenseViewer from '@/components/docs/LicenseViewer';
import DistroLogo from '@/components/mirrors/DistroLogo.tsx';
import { hasHelpDoc } from '@/docs';
import { MirrorNotFoundError, useMirrorDetail } from '@/hooks/useMirrors';
import { hasLicense } from '@/licenses';
import ErrorPage from '@/pages/ErrorPage';
import { getHttpErrorCode } from '@/utils/httpError';
import { SITE_ORIGIN, canonicalUrl, mirrorJsonLd, breadcrumbJsonLd } from '@/utils/seo';

import DocViewer from '../components/docs/DocViewer';
import DirectoryListing from '../components/mirrors/DirectoryListing';
import StatusChip from '../components/mirrors/StatusChip';
import SyncTimeline from '../components/mirrors/SyncTimeline';

// ─── Tab 面板 ────────────────────────────────────────────────────────────────
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <Box role="tabpanel" hidden={value !== index} sx={{ pt: 3 }}>
    {value === index && children}
  </Box>
);

// ─── ISO 文件侧栏 ─────────────────────────────────────────────────────────────
// 固定高度可滚动列表，文件再多也不会撑破卡片
interface IsoFilesCardProps {
  files: Array<{ name: string; url: string }>;
  mirrorUrl: string;
}

// 比 Release 文件行更紧凑，预留约 5 行；超出部分滚动。
const LIST_MAX_HEIGHT = 48 * 5;

const fileNameFromUrl = (url: string): string => {
  const segment = url.split(/[?#]/, 1)[0].split('/').pop() ?? '';
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

const MIRROR_TYPE_LABELS: Record<string, string> = {
  os: '操作系统',
  tool: '工具软件',
};

const IsoFilesCard: React.FC<IsoFilesCardProps> = ({ files, mirrorUrl }) => {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
      {/* 标题行 */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <FolderIcon sx={{ fontSize: 16, color: 'primary.main' }} />
          {'下载文件'}
        </Typography>
        <Tooltip title={'在浏览器中打开'}>
          <IconButton
            size="small"
            component="a"
            href={toFullUrl(mirrorUrl)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={'在浏览器中打开'}
          >
            <OpenIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
      </Box>
      {/* 完整 URL 展示 */}
      <Box
        sx={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.75rem',
          color: 'primary.main',
          bgcolor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(96,165,250,0.08)' : 'rgba(59,130,246,0.06)',
          borderRadius: 1,
          px: 1,
          py: 0.6,
          mb: 1.5,
          wordBreak: 'break-all',
          lineHeight: 1.5,
        }}
      >
        {toFullUrl(mirrorUrl)}
      </Box>
      <Divider sx={{ mb: 1 }} />
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontWeight: 600,
          }}
        >
          {'安装镜像'}
        </Typography>
        {/* 文件数量角标，超过可视行数时提示"可滚动" */}
        <Typography
          variant="caption"
          sx={{
            color: 'text.disabled',
          }}
        >
          {`${files.length} 个文件`}
          {files.length > 5 ? ' · 可滚动' : ''}
        </Typography>
      </Box>
      {/* 固定高度 + 滚动区域 —— 5 行可见，更多文件直接向下滚动 */}
      <Box
        sx={{
          maxHeight: LIST_MAX_HEIGHT,
          overflowY: 'auto',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1.5,
          // 细滚动条，不影响整体风格
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'divider',
            borderRadius: 2,
            '&:hover': { bgcolor: 'text.disabled' },
          },
        }}
      >
        {files.map((file, index) => (
          <React.Fragment key={file.url}>
            {index > 0 && <Divider />}
            <Box
              component="a"
              href={toFullUrl(file.url)}
              download
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1,
                py: 0.7,
                color: 'inherit',
                textDecoration: 'none',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <DownloadIcon sx={{ color: 'primary.main', fontSize: 17, flexShrink: 0 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 650 }} noWrap>
                  {file.name}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', fontSize: '0.68rem', fontFamily: 'monospace' }}
                  noWrap
                >
                  {fileNameFromUrl(file.url)}
                </Typography>
              </Box>
            </Box>
          </React.Fragment>
        ))}
      </Box>
    </Paper>
  );
};

// ─── URL 安全校验 ─────────────────────────────────────────────────────────────
// 仅允许 https?://（显式协议）或以单斜杠开头的相对路径
// 明确排除 // 开头的协议相对 URL（如 //evil.com）
const SAFE_URL_RE = /^(https?:\/\/[^/]|\/[^/]|\/\s*$)/i;

function sanitizeUrl(url: string): string {
  if (!url) return '#';
  return SAFE_URL_RE.test(url) ? url : '#';
}

/** 将镜像 url 转换为完整 URL；若 sanitize 后为 # 则返回空串，避免拼出 origin/# */
function toFullUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const safe = sanitizeUrl(url);
  return safe === '#' ? '' : `${window.location.origin}${safe}`;
}

// ─── 主页面 ───────────────────────────────────────────────────────────────────
const MirrorDetail: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: mirror, isLoading, error } = useMirrorDetail(name || '');

  const tabParam = searchParams.get('tab');
  const hasDoc = name ? hasHelpDoc(name) : false;
  const hasLicenseFile = name ? hasLicense(name) : false;
  const hasFiles = Array.isArray(mirror?.files) && (mirror?.files.length ?? 0) > 0;
  const tabKeys = [
    ...(hasDoc ? ['help' as const] : []),
    ...(hasLicenseFile ? ['license' as const] : []),
    'files' as const,
    ...(hasFiles ? ['downloads' as const] : []),
  ];
  const requestedTab = tabParam === '0' ? 'help' : tabParam;
  const requestedIndex = tabKeys.findIndex((key) => key === requestedTab);
  const tabValue = requestedIndex >= 0 ? requestedIndex : 0;

  // Tab 切换时同步到 URL，不产生历史记录（replace）
  const handleTabChange = (_: React.SyntheticEvent, v: number) => {
    setSearchParams({ tab: tabKeys[v] ?? tabKeys[0] }, { replace: true });
  };

  const [copiedUrl, setCopiedUrl] = useState(false);
  const copyUrlTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (copyUrlTimerRef.current) clearTimeout(copyUrlTimerRef.current);
    },
    []
  );

  const fullMirrorUrl = mirror ? toFullUrl(mirror.url) : '';

  const handleCopyUrl = async () => {
    if (!mirror) return;
    try {
      await navigator.clipboard.writeText(fullMirrorUrl);
      setCopiedUrl(true);
      if (copyUrlTimerRef.current) clearTimeout(copyUrlTimerRef.current);
      copyUrlTimerRef.current = setTimeout(() => setCopiedUrl(false), 2000);
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[copy]', err);
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Skeleton variant="text" width={200} height={24} sx={{ mb: 3 }} />
        <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2, mb: 3 }} />
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
      </Container>
    );
  }

  if (error) {
    const notFound = error instanceof MirrorNotFoundError;
    return (
      <ErrorPage
        code={notFound ? 404 : getHttpErrorCode(error)}
        data={notFound ? undefined : error.message}
      />
    );
  }

  if (!mirror) {
    return <ErrorPage code={404} />;
  }

  return (
    <>
      <title>{`${mirror.name} 镜像 - 重庆大学开源软件镜像站 CQU Mirror`}</title>
      <meta
        name="description"
        content={`${mirror.name} - ${mirror.desc} 由重庆大学开源软件镜像站（CQU Mirror）提供高速下载。`}
      />
      <meta
        name="keywords"
        content={`${mirror.name},${mirror.id},${mirror.name}镜像,${mirror.name}下载,CQU Mirror,重庆大学镜像站,开源软件镜像`}
      />
      <link rel="canonical" href={canonicalUrl(`/mirrors/${mirror.id}`)} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={`${mirror.name} - CQU Mirror`} />
      <meta property="og:description" content={mirror.desc} />
      <meta property="og:url" content={canonicalUrl(`/mirrors/${mirror.id}`)} />
      <meta property="og:image" content={`${SITE_ORIGIN}/favicon.svg`} />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={`${mirror.name} - CQU Mirror`} />
      <meta name="twitter:description" content={mirror.desc} />
      {/* 结构化数据：面包屑 */}
      <script type="application/ld+json">
        {breadcrumbJsonLd([
          { name: '首页', url: '/' },
          { name: mirror.name, url: `/mirrors/${mirror.id}` },
        ])}
      </script>
      {/* 结构化数据：软件应用 */}
      <script type="application/ld+json">
        {mirrorJsonLd(mirror.name, mirror.desc, `/mirrors/${mirror.id}`)}
      </script>
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        {/* 面包屑 */}
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link
            component={RouterLink}
            to="/"
            underline="hover"
            sx={{
              color: 'text.secondary',
            }}
          >
            {'首页'}
          </Link>
          <Typography
            sx={{
              color: 'text.primary',
              fontWeight: 500,
            }}
          >
            {mirror.name}
          </Typography>
        </Breadcrumbs>

        <Button
          startIcon={<BackIcon />}
          onClick={() => {
            navigate('/');
            // 跳回首页后滚动到镜像列表区，timer 在组件卸载后已无 setState，影响低但仍清理
            const t = window.setTimeout(() => {
              document.getElementById('mirrors')?.scrollIntoView({ behavior: 'smooth' });
            }, 150);
            // navigate 后组件即卸载，无需 ref 存储，浏览器会在页面卸载时自动清理
            return () => clearTimeout(t);
          }}
          size="small"
          sx={{ mb: 3, color: 'text.secondary' }}
        >
          {'返回列表'}
        </Button>

        {/* ── 顶部信息卡 ── */}
        <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 2, mb: 3 }}>
          <Grid
            container
            spacing={3}
            sx={{
              alignItems: 'flex-start',
            }}
          >
            {/* 左侧：名称 / 描述 / URL */}
            {/* 若没有文件，左侧占满 12 列；有文件时占 8 列，右侧 4 列给侧栏 */}
            <Grid size={{ xs: 12 }}>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5, flexWrap: 'wrap' }}
              >
                <DistroLogo id={mirror.id} size={30} />
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: '1.5rem', md: '2rem' },
                  }}
                >
                  {mirror.name}
                </Typography>
                <StatusChip status={mirror.status} size="medium" />
                {/* id 在详情页保留作为标签，因为详情页有充足空间展示 */}
                <Chip
                  label={mirror.id}
                  size="small"
                  variant="outlined"
                  color="primary"
                  sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.72rem' }}
                />
                {mirror.type && mirror.type !== 'none' && mirror.type !== mirror.id && (
                  <Chip
                    label={MIRROR_TYPE_LABELS[mirror.type] ?? mirror.type}
                    size="small"
                    variant="outlined"
                    sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.72rem' }}
                  />
                )}
              </Box>

              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.7,
                  mb: 2,
                }}
              >
                {mirror.desc}
              </Typography>

              {/* 完整 URL 行 */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1.5,
                  bgcolor: 'action.hover',
                  borderRadius: 1.5,
                  wordBreak: 'break-all',
                }}
              >
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                  <FolderIcon sx={{ fontSize: 16, color: 'primary.main', flexShrink: 0 }} />
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.83rem',
                      color: 'primary.main',
                      wordBreak: 'break-all',
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {fullMirrorUrl}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                  <Tooltip title={copiedUrl ? '已复制！' : '复制地址'}>
                    <Button
                      size="small"
                      onClick={handleCopyUrl}
                      color={copiedUrl ? 'success' : 'primary'}
                      startIcon={
                        copiedUrl ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />
                      }
                      sx={{ fontFamily: '"JetBrains Mono", monospace' }}
                    >
                      {copiedUrl ? '已复制！' : '复制地址'}
                    </Button>
                  </Tooltip>
                  <Tooltip title={'在浏览器中打开'}>
                    <IconButton
                      size="small"
                      component="a"
                      href={fullMirrorUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      color="primary"
                      aria-label={'在浏览器中打开'}
                    >
                      <OpenIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* 同步状态 */}
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              mb: 2,
            }}
          >
            {'同步状态'}
          </Typography>
          <SyncTimeline mirror={mirror} />
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* ── Tabs ── */}
        <Box>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': { fontWeight: 600, minWidth: { xs: 80, sm: 120 } },
            }}
          >
            {hasDoc && <Tab label={'使用说明'} />}
            {hasLicenseFile && <Tab label={'许可证'} />}
            <Tab label={'文件列表'} />
            {hasFiles && <Tab label={'安装镜像'} />}
          </Tabs>

          {hasDoc && (
            <TabPanel value={tabValue} index={tabKeys.indexOf('help')}>
              <DocViewer mirrorId={mirror.id} />
            </TabPanel>
          )}
          {hasLicenseFile && (
            <TabPanel value={tabValue} index={tabKeys.indexOf('license')}>
              <LicenseViewer licenseId={name ?? ''} />
            </TabPanel>
          )}
          <TabPanel value={tabValue} index={tabKeys.indexOf('files')}>
            <DirectoryListing mirrorUrl={mirror.url} mirrorName={mirror.name} />
          </TabPanel>

          {hasFiles && (
            <TabPanel value={tabValue} index={tabKeys.indexOf('downloads')}>
              <IsoFilesCard files={mirror.files} mirrorUrl={mirror.url} />
            </TabPanel>
          )}
        </Box>
      </Container>
    </>
  );
};

export default MirrorDetail;
