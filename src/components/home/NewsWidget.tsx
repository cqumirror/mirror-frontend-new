// src/components/home/NewsWidget.tsx
// 首页「最新动态」小组件 —— 桌面端根据左侧高度动态展示，移动端固定 5 条

import { ArrowForward as ArrowIcon, Article as ArticleIcon } from '@mui/icons-material';
import { Box, Typography, Button, Divider, Chip, useMediaQuery, useTheme } from '@mui/material';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { getNewsList } from '../../news';
import { useLocaleStore } from '../../stores/mirrorStore';

const MIN_ITEMS = 3;
const MAX_ITEMS_DESKTOP = 10;
const MAX_ITEMS_MOBILE = 5;
const HEADER_HEIGHT = 48; // 标题栏高度
const ITEM_HEIGHT = 76;   // 每条新闻约 76px（py:1.4 + 内容 + divider）

interface NewsWidgetProps {
  siblingHeight?: number; // 左侧列高度（px），桌面端用于动态计算条数
}

const NewsWidget: React.FC<NewsWidgetProps> = ({ siblingHeight }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { locale } = useLocaleStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const allNews = useMemo(() => getNewsList(locale), [locale]);

  // 自身容器高度测量（备用）
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const count = useMemo(() => {
    if (isMobile) return Math.min(MAX_ITEMS_MOBILE, allNews.length);
    // 桌面端：优先用兄弟列高度，否则用自身容器高度
    const h = (siblingHeight && siblingHeight > 0) ? siblingHeight : containerHeight;
    if (h <= 0) return Math.min(MAX_ITEMS_DESKTOP, allNews.length);
    const maxByHeight = Math.max(MIN_ITEMS, Math.floor((h - HEADER_HEIGHT) / ITEM_HEIGHT));
    return Math.min(maxByHeight, MAX_ITEMS_DESKTOP, allNews.length);
  }, [isMobile, siblingHeight, containerHeight, allNews.length]);

  const news = useMemo(() => allNews.slice(0, count), [allNews, count]);

  if (news.length === 0) return null;

  return (
    <Box
      ref={containerRef}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 标题栏 */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'action.hover',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <ArticleIcon sx={{ fontSize: 16, color: 'primary.main' }} />
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
            }}
          >
            {t('news.latestNews')}
          </Typography>
        </Box>
        <Button
          size="small"
          endIcon={<ArrowIcon sx={{ fontSize: 14 }} />}
          onClick={() => navigate('/news')}
          sx={{ fontSize: '0.75rem', p: '2px 6px', minHeight: 0 }}
        >
          {t('news.all')}
        </Button>
      </Box>
      {/* 新闻列表 */}
      <Box sx={{ flex: 1 }}>
        {news.map((item, idx) => (
          <React.Fragment key={item.slug}>
            <Box
              onClick={() => navigate(`/news/${item.slug}`)}
              sx={{
                px: 2,
                py: 1.4,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 0.4,
                transition: 'background-color 0.15s',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              {/* 标题 */}
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  lineHeight: 1.4,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  '&:hover': { color: 'primary.main' },
                  transition: 'color 0.15s',
                }}
              >
                {item.title}
              </Typography>

              {/* 日期 + 作者 + 标签 */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.disabled',
                    fontFamily: '"JetBrains Mono", monospace',
                  }}
                >
                  {item.date}
                </Typography>
                {item.author && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      fontWeight: 500,
                    }}
                  >
                    {item.author}
                  </Typography>
                )}
                {item.tags?.slice(0, 2).map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    sx={{
                      height: 16,
                      fontSize: '0.6rem',
                      '& .MuiChip-label': { px: 0.6 },
                      bgcolor: 'action.selected',
                    }}
                  />
                ))}
              </Box>
            </Box>
            {idx < news.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );
};

export default NewsWidget;
