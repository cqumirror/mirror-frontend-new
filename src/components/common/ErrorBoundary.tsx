// src/components/common/ErrorBoundary.tsx
// 全局错误边界 — 捕获子组件 render 异常，防止白屏
// 注意：此组件在 ThemeProvider 之外，需手动检测深色模式

import { Email as EmailIcon, GitHub as GitHubIcon } from '@mui/icons-material';
import { Button, Container, Typography, Box, Link } from '@mui/material';
import React from 'react';

import i18n from '../../i18n';

/** 检测当前是否为深色模式 */
function isDarkMode(): boolean {
  try {
    // 1. data-theme 属性
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'dark') return true;
    if (attr === 'light') return false;
    // 2. localStorage
    const stored = JSON.parse(localStorage.getItem('theme') ?? '{}');
    if (stored?.state?.mode === 'dark') return true;
    // 3. 系统偏好
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

const DARK = {
  bg: '#0F172A',
  paper: '#1E293B',
  text: '#E2E8F0',
  textSec: '#94A3B8',
  primary: '#3388CC',
  hover: '#334155',
  border: '#334155',
};

const LIGHT = {
  bg: '#F8FAFC',
  paper: '#FFFFFF',
  text: '#1E293B',
  textSec: '#64748B',
  primary: '#0067B6',
  hover: '#F1F5F9',
  border: '#E2E8F0',
};

const TEXT = {
  zh: {
    title: '页面出现异常',
    desc: '抱歉，页面加载失败，请尝试刷新页面。',
    reload: '刷新页面',
    home: '返回首页',
    contact: '如问题持续，请携带以上错误信息联系我们：',
  },
  en: {
    title: 'Something Went Wrong',
    desc: 'Sorry, the page failed to load. Please try refreshing.',
    reload: 'Refresh',
    home: 'Back to Home',
    contact: 'If the issue persists, contact us with the error information above:',
  },
} as const;

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const lang = i18n.language === 'en' ? 'en' : 'zh';
      const t = TEXT[lang];
      const dark = isDarkMode();
      const c = dark ? DARK : LIGHT;

      // CssBaseline 在 App 内部，ErrorBoundary 需要自己设置 body 背景
      document.body.style.backgroundColor = c.bg;
      document.body.style.margin = '0';

      return (
        <Box
          sx={{
            minHeight: '100vh',
            bgcolor: c.bg,
            color: c.text,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center' }}>
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center', mb: 3 }}
            >
              <img src="/favicon.svg" alt="CQU Mirror" style={{ width: 32, height: 32 }} />
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  fontSize: '1.2rem',
                  fontFamily: '"JetBrains Mono", monospace',
                  letterSpacing: '-0.02em',
                  color: c.text,
                }}
              >
                CQU
                <Box component="span" sx={{ color: c.primary, fontWeight: 800 }}>
                  Mirror
                </Box>
              </Typography>
            </Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: c.text }}>
              {t.title}
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, color: c.textSec }}>
              {t.desc}
            </Typography>
            {this.state.error && (
              <Box
                component="pre"
                sx={{
                  p: 2,
                  mb: 3,
                  bgcolor: c.hover,
                  borderRadius: 1,
                  textAlign: 'left',
                  overflow: 'auto',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.75rem',
                  color: c.text,
                  border: `1px solid ${c.border}`,
                }}
              >
                {this.state.error.message}
              </Box>
            )}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 4 }}>
              <Button
                variant="contained"
                onClick={this.handleReload}
                sx={{ bgcolor: c.primary, '&:hover': { bgcolor: dark ? '#1E4976' : '#004A87' } }}
              >
                {t.reload}
              </Button>
              <Button
                variant="outlined"
                onClick={this.handleGoHome}
                sx={{ borderColor: c.border, color: c.text, '&:hover': { borderColor: c.textSec } }}
              >
                {t.home}
              </Button>
            </Box>
            <Typography variant="body2" sx={{ color: c.textSec }}>
              {t.contact}
            </Typography>
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EmailIcon sx={{ fontSize: 18, color: c.textSec }} />
                <Link href="mailto:cqumirror@gmail.com" variant="body2" sx={{ color: c.primary }}>
                  cqumirror@gmail.com
                </Link>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GitHubIcon sx={{ fontSize: 18, color: c.textSec }} />
                <Link
                  href="https://github.com/cqumirror/feedback"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="body2"
                  sx={{ color: c.primary }}
                >
                  github.com/cqumirror/feedback
                </Link>
              </Box>
            </Box>
          </Container>
        </Box>
      );
    }

    return this.props.children;
  }
}
