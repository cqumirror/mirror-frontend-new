// src/pages/AboutPage.tsx
// 关于我们页面

import {
  ArrowBack as BackIcon,
  Email as EmailIcon,
  GitHub as GitHubIcon,
  OpenInNew as LinkIcon,
} from '@mui/icons-material';
import {
  Box,
  Breadcrumbs,
  Button,
  Container,
  Divider,
  Link,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const FRIEND_LINKS = [
  { zh: 'CERNET 镜像', en: 'CERNET Mirror', url: 'https://mirrors.cernet.edu.cn' },
  {
    zh: '清华 TUNA 镜像',
    en: 'Tsinghua TUNA Mirror',
    url: 'https://mirrors.tuna.tsinghua.edu.cn/',
  },
  { zh: '重庆大学信息化办公室', en: 'Information Office of Chongqing University', url: 'https://net.cqu.edu.cn/' },
  { zh: '重庆大学蓝盟', en: 'CQU Lanunion', url: 'https://mirrors.cqu.edu.cn/introductions/' },
];

const AboutPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const navigate = useNavigate();

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
          {isEn ? 'About' : '关于我们'}
        </Typography>
      </Breadcrumbs>

      <Button
        startIcon={<BackIcon />}
        onClick={() => navigate('/')}
        size="small"
        sx={{ mb: 3, color: 'text.secondary' }}
      >
        {t('common.backToHome')}
      </Button>

      {/* 关于蓝盟 */}
      <Typography variant="h4" sx={{ fontWeight: 800 }} gutterBottom>
        {isEn ? 'About Lanunion' : '关于我们'}
      </Typography>

      <Paper variant="outlined" sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
          {isEn
            ? 'Chongqing University Lanunion (lanunion) is a university-level student organization established under the guidance of the Information Office of Chongqing University. It is a volunteer organization that provides free computer system, software, and network maintenance services for CQU faculty and students. "Blue Guests" are official members of Lanunion who use their computer expertise to provide free maintenance.'
            : '重庆大学蓝盟（英文名 lanunion）是在重庆大学信息化办公室指导下成立的校级学生社团，是一个为重庆大学师生免费提供计算机系统、软件与网络维护服务的志愿者组织。"蓝客"即蓝盟的正式成员，他们利用自己的电脑知识无偿为大家进行计算机系统、软件与网络维护。'}
        </Typography>
      </Paper>

      {/* 关于此站点 */}
      <Typography variant="h5" sx={{ fontWeight: 700 }} gutterBottom>
        {isEn ? 'About This Site' : '关于此站点'}
      </Typography>

      <Paper variant="outlined" sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {isEn ? 'Site Name' : '站点名称'}
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {isEn ? 'Chongqing University Open Source Software Mirror' : '重庆大学开源软件镜像站'}
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {isEn ? 'Purpose' : '建设目的'}
          </Typography>
          <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
            {isEn
              ? 'Provide high-speed, stable mirror and documentation services for research and development at CQU and southwest region universities.'
              : '为重大校内乃至于西南地区高校的科研和开发工作提供高速、稳定的镜像和镜像文档服务。'}
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {isEn ? 'Frontend Origin' : '前端来源'}
          </Typography>
          <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
            {isEn
              ? 'The frontend is forked from the open-source mirror site frontend project by Jingchu University of Technology (JCUT), and has been extensively redesigned and rebuilt with React 19 + TypeScript + Material UI for a modern, responsive experience.'
              : '本站前端 fork 自荆楚理工学院（JCUT）开源镜像站前端项目，并在此基础上使用 React 19 + TypeScript + Material UI 进行了全面的二次开发与重构。'}
          </Typography>
          <Link
            href="https://github.com/JCIOTeam/jcutmirror-new"
            target="_blank"
            rel="noopener noreferrer"
            variant="body2"
            sx={{ mt: 0.5, display: 'inline-block' }}
          >
            {isEn ? 'JCUT Mirror Frontend' : '荆楚理工学院镜像站前端'}
          </Link>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {isEn ? 'Infrastructure' : '相关设施'}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Link
              href="https://github.com/cqumirror/mirror-frontend-new"
              target="_blank"
              rel="noopener noreferrer"
              variant="body2"
            >
              Frontend (AGPL)
            </Link>
            <Link
              href="https://github.com/tuna/tunasync"
              target="_blank"
              rel="noopener noreferrer"
              variant="body2"
            >
              Backend — tunasync (MIT)
            </Link>
            <Link
              href="https://github.com/cqumirror/alter-fancy"
              target="_blank"
              rel="noopener noreferrer"
              variant="body2"
            >
              alter-fancy (MIT)
            </Link>
          </Box>
        </Box>
      </Paper>

      {/* 维护团队 */}
      <Typography variant="h5" sx={{ fontWeight: 700 }} gutterBottom>
        {isEn ? 'Maintainers' : '维护团队'}
      </Typography>

      <Paper variant="outlined" sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
          {isEn
            ? 'Maintained by the Operations Department of CQU Lanunion — a group of young people who love open source culture and software. We look forward to hearing from and being joined by those who share the same vision.'
            : '重庆大学蓝盟运维部，一群热爱开源文化开源软件的青年。我们期待有相同理念的人的回应和加入。'}
        </Typography>
      </Paper>

      {/* 联系方式 */}
      <Typography variant="h5" sx={{ fontWeight: 700 }} gutterBottom>
        {isEn ? 'Contact Us' : '联系我们'}
      </Typography>

      <Paper variant="outlined" sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <EmailIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
            <Link href="mailto:cqumirror@gmail.com" variant="body2">
              cqumirror@gmail.com
            </Link>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <GitHubIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
            <Link
              href="https://github.com/cqumirror/feedback"
              target="_blank"
              rel="noopener noreferrer"
              variant="body2"
            >
              github.com/cqumirror
            </Link>
          </Box>
        </Box>
      </Paper>

      {/* 友情链接 */}
      <Typography variant="h5" sx={{ fontWeight: 700 }} gutterBottom>
        {isEn ? 'Friend Links' : '友情链接'}
      </Typography>

      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <List disablePadding>
          {FRIEND_LINKS.map((link, i) => (
            <React.Fragment key={link.url}>
              {i > 0 && <Divider component="li" />}
              <ListItemButton
                component="a"
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ListItemText
                  primary={isEn ? link.en : link.zh}
                  slotProps={{ primary: { sx: { fontWeight: 500 } } }}
                />
                <ListItemIcon sx={{ minWidth: 36, justifyContent: 'flex-end' }}>
                  <LinkIcon fontSize="small" color="action" />
                </ListItemIcon>
              </ListItemButton>
            </React.Fragment>
          ))}
        </List>
      </Paper>
    </Container>
  );
};

export default AboutPage;
