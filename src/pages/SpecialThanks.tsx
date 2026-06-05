// src/pages/SpecialThanks.tsx
// 特别致谢页面 — 从 public/data/special-thanks.json 加载

import { ArrowBack as BackIcon, OpenInNew as LinkIcon } from '@mui/icons-material';
import { Container, Typography, Paper, List, ListItem, ListItemButton, ListItemText, ListItemIcon, Divider, Skeleton, Button, Breadcrumbs, Link } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface ThanksEntry {
  zh: string;
  en: string;
  url?: string;
}

const SpecialThanks: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const navigate = useNavigate();
  const [entries, setEntries] = useState<ThanksEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/data/special-thanks.json')
      .then((res) => res.json())
      .then((data: ThanksEntry[]) => setEntries(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      {/* 面包屑 */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate('/')}
          underline="hover"
          sx={{ color: 'text.secondary' }}
        >
          {t('nav.home')}
        </Link>
        <Typography variant="body2" color="text.primary">
          {isEn ? 'Special Thanks' : '特别致谢'}
        </Typography>
      </Breadcrumbs>

      {/* 返回按钮 */}
      <Button
        startIcon={<BackIcon />}
        onClick={() => navigate('/')}
        size="small"
        sx={{ mb: 3, color: 'text.secondary' }}
      >
        {t('common.backToHome')}
      </Button>

      <Typography variant="h4" sx={{ fontWeight: 800 }} gutterBottom>
        {isEn ? 'Special Thanks' : '特别致谢'}
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
        {isEn
          ? 'High tribute shall be paid to the individuals and communities listed below.'
          : '感谢所有为重大开源镜像站建设贡献力量的个人以及团体，没有你们的帮助我们无法将镜像站建设成为今天的模样。'}
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {isEn ? '(Order by timeline)' : '（按时间排序）'}
      </Typography>

      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        {loading ? (
          <List disablePadding>
            {Array.from({ length: 6 }).map((_, i) => (
              <React.Fragment key={i}>
                {i > 0 && <Divider component="li" />}
                <ListItem>
                  <Skeleton variant="text" width="60%" height={28} />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        ) : (
          <List disablePadding>
            {entries.map((entry, i) => {
              const primary = isEn ? entry.en : entry.zh;
              const secondary = isEn ? entry.zh : entry.en;

              return (
                <React.Fragment key={entry.zh}>
                  {i > 0 && <Divider component="li" />}
                  {entry.url ? (
                    <ListItemButton
                      component="a"
                      href={entry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ListItemText
                        primary={primary}
                        secondary={secondary}
                        slotProps={{ primary: { sx: { fontWeight: 600 } } }}
                      />
                      <ListItemIcon sx={{ minWidth: 36, justifyContent: 'flex-end' }}>
                        <LinkIcon fontSize="small" color="action" />
                      </ListItemIcon>
                    </ListItemButton>
                  ) : (
                    <ListItem>
                      <ListItemText
                        primary={primary}
                        secondary={secondary}
                        slotProps={{ primary: { sx: { fontWeight: 600 } } }}
                      />
                    </ListItem>
                  )}
                </React.Fragment>
              );
            })}
          </List>
        )}
      </Paper>
    </Container>
  );
};

export default SpecialThanks;
