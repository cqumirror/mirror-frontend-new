// src/pages/Home.tsx
// 首页

import {
  Wifi as WifiIcon,
  WifiTethering as Ipv6Icon,
  Star as StarIcon,
  Code as CodeIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import {
  Box,
  Container,
  Typography,
  Grid,
  Button,
  Chip,
  Skeleton,
  Paper,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { getNewsList } from '@/news';
import { SITE_ORIGIN, SITE_TITLE_ZH, KEYWORDS_ZH, DESC_ZH, canonicalUrl } from '@/utils/seo';

import RefreshButton from '../components/common/RefreshButton';
import AnnouncementBanner from '../components/home/AnnouncementBanner';
import NewsWidget from '../components/home/NewsWidget';
import DownloadModal from '../components/mirrors/DownloadModal';
import MirrorCard from '../components/mirrors/MirrorCard';
import MirrorList from '../components/mirrors/MirrorList';
import {
  useMirrors,
  useCampusNetwork,
  useFilteredMirrors,
  useGroupedMirrors,
  usePopularMirrors,
  sortedGroupKeys,
} from '../hooks/useMirrors';
import { useMirrorSearchStore, useFavoriteStore } from '../stores/mirrorStore';
import type { Mirror } from '../types';


// ── 字母索引导航子组件（roving tabindex）────────────────────────────────────
// 独立为组件以满足 Rules of Hooks（不能在 IIFE 或回调中调用 Hook）
interface LetterIndexNavProps {
  letters: string[];
  ariaLabel: string;
}

const LetterIndexNav: React.FC<LetterIndexNavProps> = ({ letters, ariaLabel }) => {
  const navRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const buttons = Array.from(
      navRef.current?.querySelectorAll<HTMLAnchorElement>('[data-letter-btn]') ?? []
    );
    const idx = buttons.findIndex((b) => b === document.activeElement);
    if (idx === -1) return;
    let next = idx;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      next = (idx + 1) % buttons.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      next = (idx - 1 + buttons.length) % buttons.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      next = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      next = buttons.length - 1;
    } else return;
    buttons.forEach((b, i) => {
      b.tabIndex = i === next ? 0 : -1;
    });
    buttons[next].focus();
  }, []);

  return (
    <Box
      ref={navRef}
      onKeyDown={handleKeyDown}
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 0.5,
        mb: 3,
        p: 1.5,
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
      }}
      role="navigation"
      aria-label={ariaLabel}
    >
      {letters.map((letter, i) => (
        <Button
          key={letter}
          size="small"
          href={`#group-${letter}`}
          data-letter-btn
          tabIndex={i === 0 ? 0 : -1}
          sx={{
            minWidth: 32,
            width: 32,
            height: 28,
            p: 0,
            fontFamily: '"JetBrains Mono", monospace',
            fontWeight: 700,
            fontSize: '0.8rem',
            borderRadius: 1,
            color: 'primary.main',
            '&:hover': { bgcolor: 'primary.main', color: 'white' },
            '&:focus-visible': {
              outline: '2px solid',
              outlineColor: 'primary.main',
              outlineOffset: '2px',
            },
          }}
        >
          {letter}
        </Button>
      ))}
    </Box>
  );
};

/**
 * DEV-only: 自定义错误码测试 ErrorPage
 */
const TestErrorPageButton: React.FC = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState('404');
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
        placeholder="404"
        style={{
          width: 36,
          fontSize: '0.7rem',
          textAlign: 'center',
          padding: '3px 2px',
          border: '1px solid #ccc',
          borderRadius: 4,
          fontFamily: '"JetBrains Mono", monospace',
        }}
      />
      <Button
        size="small"
        variant="outlined"
        color="warning"
        onClick={() => navigate(`/${code || 404}`)}
        sx={{ fontSize: '0.7rem', minWidth: 0, px: 1 }}
      >
        Test Page
      </Button>
    </Box>
  );
};

/**
 * 首页 - 展示镜像站概览
 */
const Home: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [triggerError, setTriggerError] = useState(false);
  const { searchQuery } = useMirrorSearchStore();

  if (triggerError) throw new Error('ErrorBoundary 测试错误');

  // 获取数据
  const { data: mirrors = [], isLoading, isFetching, error, refetch } = useMirrors();
  const { data: campusStatus } = useCampusNetwork();

  // 测量左侧常用镜像列高度，用于动态适配新闻条数
  const leftRef = useRef<HTMLDivElement>(null);
  const [leftHeight, setLeftHeight] = useState(0);
  useEffect(() => {
    const el = leftRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setLeftHeight(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 过滤和分组
  const filteredMirrors = useFilteredMirrors(mirrors);
  const groupedMirrors = useGroupedMirrors(filteredMirrors);
  const popularMirrors = usePopularMirrors(mirrors, 8);

  // 收藏镜像 — 按收藏先后顺序排列（favorites 数组保留了添加时序）
  const { favorites } = useFavoriteStore();
  const favoriteMirrors = useMemo(() => {
    const mirrorMap = new Map(mirrors.map((m) => [m.id, m]));
    return favorites.map((id) => mirrorMap.get(id)).filter((m): m is Mirror => m !== undefined);
  }, [mirrors, favorites]);

  // 新闻列表 —— 同步读取一次（import.meta.glob 静态分析），用 useMemo 防止每次 render 重算
  const newsList = useMemo(() => getNewsList(), []);
  const hasNews = newsList.length > 0;
  const mirrorCount = hasNews ? 6 : 8;

  return (
    <>
      <title>{SITE_TITLE_ZH} - CQU Mirror</title>
      <meta name="description" content={DESC_ZH} />
      <meta name="keywords" content={KEYWORDS_ZH} />
      <link rel="canonical" href={canonicalUrl('/')} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={`${SITE_TITLE_ZH} - CQU Mirror`} />
      <meta property="og:description" content={DESC_ZH} />
      <meta property="og:url" content={canonicalUrl('/')} />
      <meta property="og:image" content={`${SITE_ORIGIN}/favicon.svg`} />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={`${SITE_TITLE_ZH} - CQU Mirror`} />
      <meta name="twitter:description" content={DESC_ZH} />
      {/* Hero 区域 */}
      <Box
        sx={{
          // 多层径向渐变叠加：左上蓝光 + 右下紫光 + 纯底色，无方格干扰
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? [
                  'radial-gradient(ellipse 70% 55% at 15% 25%, rgba(59,130,246,0.13) 0%, transparent 65%)',
                  'radial-gradient(ellipse 55% 45% at 85% 75%, rgba(139,92,246,0.10) 0%, transparent 65%)',
                  '#0F172A',
                ].join(', ')
              : [
                  'radial-gradient(ellipse 70% 55% at 15% 25%, rgba(59,130,246,0.11) 0%, transparent 65%)',
                  'radial-gradient(ellipse 55% 45% at 85% 75%, rgba(139,92,246,0.07) 0%, transparent 65%)',
                  '#F8FAFF',
                ].join(', '),
          pt: { xs: 5, md: 8 },
          pb: { xs: 5, md: 8 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative' }}>
          {/* 公告/通知横幅 —— 从 public/data/announcements.json 读取，无需重新构建即可更新 */}
          <Box sx={{ mb: 3 }}>
            <AnnouncementBanner />
          </Box>
          <Box sx={{ maxWidth: 640 }}>
            {/* 网络状态胶囊 — 从 API 实时获取用户网络类型 */}
            {(() => {
              if (campusStatus === undefined) {
                return (
                  <Skeleton
                    variant="rounded"
                    width={110}
                    height={24}
                    sx={{ mb: 2, borderRadius: 6 }}
                  />
                );
              }
              const netConfig =
                campusStatus.status === '1'
                  ? {
                      icon: <WifiIcon sx={{ fontSize: 14 }} />,
                      label: t('network.campusChip'),
                      color: 'success' as const,
                      dot: '#22C55E',
                    }
                  : campusStatus.status === '6'
                    ? {
                        icon: <Ipv6Icon sx={{ fontSize: 14 }} />,
                        label: 'IPv6',
                        color: 'info' as const,
                        dot: '#3B82F6',
                      }
                    : {
                        icon: <WifiIcon sx={{ fontSize: 14 }} />,
                        label: t('network.externalLabel'),
                        color: 'default' as const,
                        dot: '#94A3B8',
                      };

              const tooltip =
                campusStatus.status === '1'
                  ? t('network.campus')
                  : campusStatus.status === '6'
                    ? t('network.ipv6')
                    : t('network.external');

              return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 2 }}>
                  <Tooltip title={tooltip} placement="right">
                    <Chip
                      icon={netConfig.icon}
                      label={netConfig.label}
                      color={netConfig.color}
                      size="small"
                      variant="outlined"
                      sx={{
                        fontWeight: 700,
                        '& .MuiChip-icon': { color: netConfig.dot },
                        position: 'relative',
                        '& .net-dot': {
                          display: 'inline-block',
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          bgcolor: netConfig.dot,
                          ml: 0.5,
                          animation:
                            campusStatus.status !== '0' ? 'net-pulse 2.4s ease-in-out infinite' : 'none',
                        },
                        '@keyframes net-pulse': {
                          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                          '50%': { opacity: 0.4, transform: 'scale(0.75)' },
                        },
                      }}
                    />
                  </Tooltip>
                  <Chip
                    label={campusStatus.ipv6 ? 'IPv6' : 'IPv4'}
                    size="small"
                    variant="outlined"
                    sx={{
                      fontWeight: 700,
                      borderColor: campusStatus.ipv6
                        ? 'oklch(74.6% 0.16 232.661)'
                        : 'oklch(79.2% 0.209 151.711)',
                      color: campusStatus.ipv6
                        ? 'oklch(74.6% 0.16 232.661)'
                        : 'oklch(79.2% 0.209 151.711)',
                    }}
                  />
                </Box>
              );
            })()}

            {/* 标题 + 快捷导航 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
              <img src="/img/CQU.svg" alt="CQU" style={{ width: 48, height: 48 }} />
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: '2rem', md: '3rem' },
                  fontFamily: '"JetBrains Mono", monospace',
                  letterSpacing: '-0.03em',
                }}
              >
                {t('home.hero.title')}
              </Typography>
              {import.meta.env.DEV && (
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => setTriggerError(true)}
                    sx={{ fontSize: '0.7rem', minWidth: 0, px: 1 }}
                  >
                    Test Boundary
                  </Button>
                  <TestErrorPageButton />
                </Box>
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Tooltip title={t('nav.gitMirrors')} placement="bottom">
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<CodeIcon sx={{ fontSize: 16 }} />}
                    onClick={() => navigate('/mirrors/git')}
                    sx={{ borderRadius: 6, fontSize: '0.8rem', px: 1.5, py: 0.4, fontWeight: 600, textTransform: 'none' }}
                  >
                    {t('nav.gitMirrors')}
                  </Button>
                </Tooltip>
                <Tooltip title={t('nav.download')} placement="bottom">
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
                    onClick={() => setDownloadOpen(true)}
                    sx={{ borderRadius: 6, fontSize: '0.8rem', px: 1.5, py: 0.4, fontWeight: 600, textTransform: 'none' }}
                  >
                    {t('nav.download')}
                  </Button>
                </Tooltip>
              </Box>
            </Box>

            <Typography
              variant="h5"
              sx={{
                color: 'text.secondary',
                mb: 2,
                fontWeight: 400,
                fontSize: { xs: '1rem', md: '1.25rem' },
              }}
            >
              {t('home.hero.subtitle')}
            </Typography>

            <Typography
              variant="body1"
              sx={{
                color: 'text.secondary',
                mb: 3,
                lineHeight: 1.8,
                maxWidth: 520,
              }}
            >
              {t('home.hero.description')}
            </Typography>

          </Box>
        </Container>
      </Box>
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        {/* 常用镜像 + 最新动态（无搜索时显示） */}
        {!searchQuery && (
          <Box sx={{ mb: 6 }}>
            <Grid
              container
              spacing={3}
              sx={{
                alignItems: 'flex-start',
              }}
            >
              {/* 新闻列 —— 移动端通过 order:-1 排到镜像上方，桌面端还原到右侧 */}
              {hasNews && (
                <Grid size={{ xs: 12, lg: 3 }} sx={{ order: { xs: -1, lg: 1 } }}>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      mb: 3,
                    }}
                  >
                    {t('home.news')}
                  </Typography>
                  <NewsWidget siblingHeight={leftHeight} />
                </Grid>
              )}

              {/* 常用镜像列 —— 有新闻时桌面 9 列，无新闻时全宽 */}
              <Grid ref={leftRef} size={{ xs: 12, lg: hasNews ? 9 : 12 }} sx={{ order: { xs: 1, lg: 0 } }}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    mb: 3,
                  }}
                >
                  {t('home.popularMirrors')}
                </Typography>
                {isLoading ? (
                  <Grid container spacing={2}>
                    {[...Array(mirrorCount)].map((_, i) => (
                      <Grid key={i} size={{ xs: 12, sm: 6, md: hasNews ? 4 : 3 }}>
                        <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2 }} />
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Grid container spacing={2}>
                    {popularMirrors.slice(0, mirrorCount).map((mirror) => (
                      <Grid key={mirror.id} size={{ xs: 12, sm: 6, md: hasNews ? 4 : 3 }}>
                        <MirrorCard mirror={mirror} />
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Grid>
            </Grid>
          </Box>
        )}

        {/* ── 收藏镜像区 —— 有收藏且未在搜索时显示 ── */}
        {!searchQuery && favoriteMirrors.length > 0 && (
          <Box sx={{ mb: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <StarIcon sx={{ color: 'warning.main', fontSize: '1.3rem' }} />
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                }}
              >
                {t('favorites.title')}
              </Typography>
              <Chip
                label={favoriteMirrors.length}
                size="small"
                color="warning"
                variant="outlined"
                sx={{ fontWeight: 700, height: 20, fontSize: '0.72rem' }}
              />
            </Box>
            <Grid container spacing={2}>
              {favoriteMirrors.map((mirror) => (
                <Grid key={mirror.id} size={{ xs: 12, sm: 6, md: 3 }}>
                  <MirrorCard mirror={mirror} />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* 所有镜像列表 */}
        <Box id="mirrors">
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
              }}
            >
              {searchQuery
                ? t('search.results', { count: filteredMirrors.length })
                : t('home.allMirrors')}
            </Typography>

            {/* 刷新按钮 */}
            <RefreshButton onClick={() => refetch()} />
          </Box>

          {/* 刷新进度条——仅在后台 refetch 时（非首次加载）显示 */}
          <LinearProgress
            sx={{
              mb: 1.5,
              borderRadius: 1,
              height: 3,
              opacity: isFetching && !isLoading ? 1 : 0,
              transition: 'opacity 0.3s',
            }}
          />

          {/* 加载失败 */}
          {error && (
            <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', borderRadius: 2, mb: 3 }}>
              <Typography color="error" gutterBottom>
                {t('error.loadFailed')}
              </Typography>
              <Button variant="contained" size="small" onClick={() => refetch()}>
                {t('error.retry')}
              </Button>
            </Paper>
          )}

          {/* 字母分组索引导航 — roving tabindex：整体一个 Tab 停，方向键在字母间移动 */}
          {!isLoading && Object.keys(groupedMirrors).length > 0 && (
            <LetterIndexNav
              letters={sortedGroupKeys(groupedMirrors)}
              ariaLabel={t('home.letterIndex')}
            />
          )}

          {/* 镜像列表 */}
          <Box
            sx={{
              opacity: isFetching && !isLoading ? 0.55 : 1,
              pointerEvents: isFetching && !isLoading ? 'none' : 'auto',
              transition: 'opacity 0.25s',
            }}
          >
            <MirrorList
              grouped={groupedMirrors}
              loading={isLoading}
              error={error ? String(error) : undefined}
            />
          </Box>
        </Box>
      </Container>
      <DownloadModal open={downloadOpen} onClose={() => setDownloadOpen(false)} />
    </>
  );
};

export default Home;
