// src/components/home/AnnouncementBanner.tsx
// 全宽细条公告横幅 —— system banner 风格
// · 从 public/announcements.json 加载，无需重新构建
// · 多条公告时用 1/N 翻页，不堆叠
// · 置顶公告左侧加粗色条，可逐条关闭

import {
  Close as CloseIcon,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  OpenInNew as LinkIcon,
  CampaignOutlined as MegaphoneIcon,
} from '@mui/icons-material';
import { Box, Typography, IconButton, Link, Chip } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useLocaleStore } from '../../stores/mirrorStore';
import { safeGetItem, safeSetItem } from '../../utils/storage';

type AnnouncementType = 'info' | 'warning' | 'error' | 'success';

interface AnnouncementLink {
  url: string;
  label: { zh: string; en: string };
}

interface Announcement {
  id: string;
  type: AnnouncementType;
  pinned: boolean;
  dismissible: boolean;
  date: string;
  title: { zh: string; en: string };
  content: { zh: string; en: string };
  link: AnnouncementLink | null;
}

const STORAGE_KEY = 'dismissed_announcements';
const RECENT_DAYS = 30;

function isRecent(dateStr: string) {
  return new Date(dateStr).getTime() >= Date.now() - RECENT_DAYS * 86400_000;
}
function loadDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(safeGetItem(STORAGE_KEY) ?? '[]'));
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[AnnouncementBanner] loadDismissed:', err);
    return new Set();
  }
}
function saveDismissed(ids: Set<string>) {
  safeSetItem(STORAGE_KEY, JSON.stringify([...ids]));
}

// severity → 颜色 token（用于背景色和强调色）
const SEVERITY_COLOR: Record<
  AnnouncementType,
  { bg: string; bgDark: string; accent: string; text: string }
> = {
  info: {
    bg: 'rgba(0,103,182,0.07)',
    bgDark: 'rgba(0,103,182,0.12)',
    accent: '#0067B6',
    text: '#004A87',
  },
  warning: {
    bg: 'rgba(245,158,11,0.08)',
    bgDark: 'rgba(245,158,11,0.13)',
    accent: '#F59E0B',
    text: '#92400E',
  },
  error: {
    bg: 'rgba(239,68,68,0.07)',
    bgDark: 'rgba(239,68,68,0.12)',
    accent: '#EF4444',
    text: '#991B1B',
  },
  success: {
    bg: 'rgba(34,197,94,0.07)',
    bgDark: 'rgba(34,197,94,0.11)',
    accent: '#22C55E',
    text: '#14532D',
  },
};

const AnnouncementBanner: React.FC = () => {
  const { t } = useTranslation();
  const { locale } = useLocaleStore();
  const navigate = useNavigate();

  const [items, setItems] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [index, setIndex] = useState(0);

  useEffect(() => {
    fetch('/announcements.json')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: Announcement[]) => {
        const dis = loadDismissed();
        const filtered = data
          .filter((a) => (a.pinned || isRecent(a.date)) && (a.dismissible ? !dis.has(a.id) : true))
          .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
        setItems(filtered);
        setDismissed(dis);
      })
      .catch(() => {
        /* 静默忽略 */
      });
  }, []);

  const visible = items.filter((a) => (a.dismissible ? !dismissed.has(a.id) : true));
  if (visible.length === 0) return null;

  const PAGE_SIZE = 2;
  const totalPages = Math.ceil(visible.length / PAGE_SIZE);
  const safeIndex = Math.min(index, totalPages - 1);
  const pageItems = visible.slice(safeIndex * PAGE_SIZE, safeIndex * PAGE_SIZE + PAGE_SIZE);

  const handleDismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    saveDismissed(next);
    setDismissed(next);
    setIndex((i) => Math.max(0, Math.min(i, Math.ceil((visible.length - 1) / PAGE_SIZE) - 1)));
  };

  const handleLink = (url: string) => {
    if (url.startsWith('http')) {
      window.open(url, '_blank', 'noopener');
    } else {
      navigate(url);
    }
  };

  const renderAnnouncement = (item: Announcement, idx: number) => {
    const c = SEVERITY_COLOR[item.type];
    return (
        <Box
          key={item.id}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            minWidth: 0,
            minHeight: 40,
            py: 0.3,
            px: { xs: 0.5, sm: 1 },
            bgcolor: (theme) => (theme.palette.mode === 'dark' ? c.bgDark : c.bg),
            borderLeft: `3px solid ${c.accent}`,
            mt: idx > 0 ? 0.5 : 0,
            borderRadius: 0.5,
          }}
        >
          {/* 图标 */}
          <MegaphoneIcon sx={{ fontSize: 15, color: c.accent, flexShrink: 0 }} />
          {/* 置顶徽章 */}
          {item.pinned && (
            <Chip
              label={t('news.pinned')}
              size="small"
              sx={{
                height: 18,
                fontSize: '0.62rem',
                fontWeight: 700,
                bgcolor: c.accent,
                color: '#fff',
                flexShrink: 0,
                '& .MuiChip-label': { px: 0.8 },
              }}
            />
          )}

          {/* 标题 + 正文 */}
          <Typography
            variant="body2"
            sx={{
              flex: 1,
              minWidth: 0,
              fontSize: '0.82rem',
              color: (theme) => (theme.palette.mode === 'dark' ? 'text.primary' : c.text),
              lineHeight: 1.4,
            }}
          >
            <Box component="span" sx={{ fontWeight: 700, mr: 0.8 }}>
              {item.title[locale]}
            </Box>
            <Box component="span" sx={{ opacity: 0.75 }}>
              {item.content[locale]}
            </Box>
          </Typography>

          {/* 详情链接 */}
          {item.link && (
            <Link
              component="button"
              onClick={() => handleLink(item.link?.url ?? '')}
              underline="hover"
              sx={{
                fontSize: '0.78rem',
                color: c.accent,
                fontWeight: 600,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 0.3,
                border: 'none',
                bgcolor: 'transparent',
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              {item.link.label[locale]}
              <LinkIcon sx={{ fontSize: 11 }} />
            </Link>
          )}

          {/* 关闭按钮 */}
          {item.dismissible && (
            <IconButton
              size="small"
              onClick={() => handleDismiss(item.id)}
              sx={{ p: 0.4, flexShrink: 0, opacity: 0.6, '&:hover': { opacity: 1 } }}
              aria-label="关闭公告"
            >
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          )}
        </Box>
    );
  };

  return (
    <Box
      sx={{
        width: '100%',
        position: 'relative',
      }}
    >
      <Box
        sx={{
          maxWidth: 1200,
          mx: 'auto',
          px: { xs: 2, md: 3 },
          py: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        {/* 公告列表（每页最多 2 条，纵向排列） */}
        <Box
          key={safeIndex}
          sx={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {pageItems.map((item, idx) => renderAnnouncement(item, idx))}
        </Box>

        {/* 多页翻页 */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2, flexShrink: 0 }}>
            <IconButton
              size="small"
              sx={{ p: 0.3 }}
              onClick={() => setIndex((i) => (i - 1 + totalPages) % totalPages)}
              aria-label="上一页公告"
            >
              <PrevIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.7rem',
                color: 'text.secondary',
                minWidth: 28,
                textAlign: 'center',
              }}
            >
              {safeIndex + 1}/{totalPages}
            </Typography>
            <IconButton
              size="small"
              sx={{ p: 0.3 }}
              onClick={() => setIndex((i) => (i + 1) % totalPages)}
              aria-label="下一页公告"
            >
              <NextIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default AnnouncementBanner;
