// src/components/common/Footer.tsx
// 页脚组件

import { GitHub as GitHubIcon, Email as EmailIcon } from '@mui/icons-material';
import {
  Box,
  Container,
  Typography,
  Link,
  Divider,
  Grid,
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocaleStore } from '../../stores/mirrorStore';

// 2x2 网格卡片数据
const GRID_CARDS = [
  {
    title: '指导单位',
    titleEn: 'Guided By',
    href: 'https://net.cqu.edu.cn/',
    imgLight: '/img/guide-placeholder.png',
    imgDark: '/img/guide-placeholder-dark.png',
    alt: '重庆大学信息化办公室',
  },
  {
    title: '运营维护',
    titleEn: 'Maintained By',
    href: 'https://lanunion.cqu.edu.cn/',
    imgLight: '/img/maintain-placeholder.png',
    imgDark: '/img/maintain-placeholder-dark.png',
    alt: '重庆大学蓝盟',
  },
  {
    title: '联系我们',
    titleEn: 'Contact Us',
    links: [
      { icon: <EmailIcon fontSize="small" />, label: 'Mail', href: 'mailto:cqumirror@gmail.com' },
      { icon: <GitHubIcon fontSize="small" />, label: 'GitHub', href: 'https://github.com/cqumirror/feedback' },
    ],
  },
  // {
  //   title: '赞助',
  //   titleEn: 'Sponsors',
  //   img: '/img/sponsor-1.jpg',
  //   alt: '上海睿尔智创网络科技有限公司',
  //   href: 'https://www.rezcwl.com',
  //   sponsorText: '感谢上海睿尔智创网络科技有限公司为本站提供部分存储设施。',
  // },
];

// 友情链接数据
const FRIEND_LINKS = [
  { label: { zh: '校园网联合镜像站', en: 'CERNET Mirror' }, href: 'https://mirrors.cernet.edu.cn' },
  { label: { zh: '清华 TUNA 镜像站', en: 'TUNA Mirror' }, href: 'https://mirrors.tuna.tsinghua.edu.cn' },
  { label: { zh: '重庆大学蓝盟', en: 'CQU Lanunion' }, href: 'https://lanunion.cqu.edu.cn/' },
];

/**
 * 站点页脚
 */
const Footer: React.FC = () => {
  const { t } = useTranslation();
  const { locale } = useLocaleStore();
  const theme = useTheme();
  const year = new Date().getFullYear();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        pt: 5,
        pb: 3,
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} sx={{ mb: 4 }}>
          {/* 左列：Logo + 简介 */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <img
                src="/favicon.svg"
                alt="CQU Mirror Logo"
                style={{ width: 22, height: 22 }}
              />
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '1rem',
                }}
              >
                CQU
                <Typography
                  component="span"
                  sx={{ color: 'primary.main', fontWeight: 800, fontSize: '1rem' }}
                >
                  Mirror
                </Typography>
              </Typography>
            </Box>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                lineHeight: 1.7,
                mb: 2,
                whiteSpace: 'pre-line',
              }}
            >
              {t('footer.description')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, mb: 2 }}>
              <Tooltip title="GitHub">
                <IconButton
                  size="small"
                  component="a"
                  href="https://github.com/cqumirror"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                >
                  <GitHubIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('footer.contact')}>
                <IconButton
                  size="small"
                  component="a"
                  href="mailto:cqumirror@gmail.com"
                  aria-label="联系邮箱"
                >
                  <EmailIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {/* 友情链接 */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mr: 0.5 }}>
                {t('footer.friendLinks')}
              </Typography>
              {FRIEND_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="caption"
                  underline="hover"
                  sx={{
                    color: 'text.secondary',
                    transition: 'color 0.2s',
                    px: 0.8,
                    py: 0.3,
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'action.hover', color: 'primary.main' },
                  }}
                >
                  {locale === 'en' ? link.label.en : link.label.zh}
                </Link>
              ))}
            </Box>
          </Grid>

          {/* 右列：2x2 网格 */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 3,
              }}
            >
              {GRID_CARDS.map((card) => (
                <Box key={card.title} sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 700, mb: 1 }}
                  >
                    {card.title}
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{ ml: 0.5, color: 'text.secondary', fontWeight: 400 }}
                    >
                      {card.titleEn}
                    </Typography>
                  </Typography>

                  {/* 图片卡片（指导单位、运营维护） */}
                  {card.imgLight && card.imgDark && (
                    <Link
                      href={card.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ display: 'inline-block' }}
                    >
                      <Box
                        component="img"
                        src={isDark ? card.imgDark : card.imgLight}
                        alt={card.alt}
                        sx={{
                          maxWidth: 160,
                          maxHeight: 80,
                          width: 'auto',
                          height: 'auto',
                          opacity: 0.85,
                          transition: 'opacity 0.2s',
                          '&:hover': { opacity: 1 },
                        }}
                      />
                    </Link>
                  )}

                  {/* 赞助商卡片 */}
                  {card.sponsorText && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Link
                        href={card.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ flexShrink: 0 }}
                      >
                        <Box
                          component="img"
                          src={card.img}
                          alt={card.alt}
                          sx={{
                            width: 80,
                            height: 40,
                            objectFit: 'contain',
                            opacity: 0.85,
                            transition: 'opacity 0.2s',
                            '&:hover': { opacity: 1 },
                          }}
                        />
                      </Link>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {card.sponsorText}
                      </Typography>
                    </Box>
                  )}

                  {/* 链接列表卡片 */}
                  {card.links && (
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 0.6,
                      }}
                    >
                      {card.links.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="body2"
                          underline="hover"
                          sx={{
                            color: 'text.secondary',
                            '&:hover': { color: 'primary.main' },
                            transition: 'color 0.2s',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5,
                          }}
                        >
                          {'icon' in link && link.icon}
                          {link.label}
                        </Link>
                      ))}
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ mb: 2 }} />

        {/* 版权信息 */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('footer.copyright', { year })}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('footer.poweredBy')}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
