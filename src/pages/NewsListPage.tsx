// src/pages/NewsListPage.tsx
// 新闻列表页 /news

import { ArrowForward as ArrowIcon } from '@mui/icons-material';
import { Box, Container, Typography, Chip, Divider, Breadcrumbs, Link, Pagination } from '@mui/material';
import React, { useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link as RouterLink } from 'react-router-dom';

import { getNewsList } from '@/news';

import { useLocaleStore } from '../stores/mirrorStore';
import { canonicalUrl } from '../utils/seo';


const NewsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { locale } = useLocaleStore();
  // getNewsList() 通过 import.meta.glob eager 在构建时固定，运行时不会变化，
  // 空依赖数组是有意为之
  const news = useMemo(() => getNewsList(locale), [locale]);

  const PER_PAGE = 10;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(news.length / PER_PAGE));
  const paged = useMemo(() => news.slice((page - 1) * PER_PAGE, page * PER_PAGE), [news, page]);
  const handlePageChange = useCallback((_: unknown, value: number) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const title = t('news.title') + ' - 重庆大学开源软件镜像站 CQU Mirror';

  return (
    <>
      <title>{title}</title>
      <meta name="description" content="重庆大学开源软件镜像站最新动态与公告。" />
      <link rel="canonical" href={canonicalUrl('/news')} />
      <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link
            component={RouterLink}
            to="/"
            underline="hover"
            sx={{
              color: 'text.secondary',
            }}
          >
            {t('nav.home')}
          </Link>
          <Typography
            sx={{
              color: 'text.primary',
              fontWeight: 500,
            }}
          >
            {t('news.breadcrumb')}
          </Typography>
        </Breadcrumbs>

        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            mb: 0.5,
          }}
        >
          {t('news.latestNews')}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            mb: 4,
          }}
        >
          {t('news.subtitle')}
        </Typography>

        <Box>
          {paged.map((item, idx) => (
            <React.Fragment key={item.slug}>
              <Box
                onClick={() => navigate(`/news/${item.slug}`)}
                sx={{
                  py: 2.5,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 2,
                  '&:hover .news-title': { color: 'primary.main' },
                  '&:hover .news-arrow': { opacity: 1, transform: 'translateX(3px)' },
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {/* 日期 + 作者 + 标签行 */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 0.8,
                      flexWrap: 'wrap',
                    }}
                  >
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
                    {item.tags?.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.65rem',
                          '& .MuiChip-label': { px: 0.8 },
                        }}
                      />
                    ))}
                  </Box>

                  {/* 标题 */}
                  <Typography
                    className="news-title"
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      fontSize: { xs: '1rem', md: '1.1rem' },
                      mb: 0.5,
                      transition: 'color 0.15s',
                    }}
                  >
                    {item.title}
                  </Typography>

                  {/* 摘要 */}
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      lineHeight: 1.6,
                      maxWidth: 600,
                    }}
                  >
                    {item.summary}
                  </Typography>
                </Box>

                {/* 箭头 */}
                <ArrowIcon
                  className="news-arrow"
                  sx={{
                    color: 'primary.main',
                    mt: 0.5,
                    flexShrink: 0,
                    opacity: 0,
                    transition: 'opacity 0.15s, transform 0.15s',
                  }}
                />
              </Box>
              {idx < paged.length - 1 && <Divider />}
            </React.Fragment>
          ))}

          {news.length === 0 && (
            <Typography
              sx={{
                color: 'text.secondary',
                py: 4,
                textAlign: 'center',
              }}
            >
              {t('news.noNews')}
            </Typography>
          )}
        </Box>

        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              color="primary"
              shape="rounded"
            />
          </Box>
        )}
      </Container>
    </>
  );
};

export default NewsListPage;
