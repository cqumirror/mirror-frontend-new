// src/components/common/ErrorBoundary.tsx
// 全局错误边界 — 捕获子组件 render 异常，防止白屏

import { Button, Container, Typography, Box } from '@mui/material';
import React from 'react';

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
      return (
        <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
            页面出现异常
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            抱歉，页面渲染时发生了错误。您可以尝试刷新页面或返回首页。
          </Typography>
          {this.state.error && (
            <Typography
              variant="caption"
              component="pre"
              sx={{
                p: 2,
                mb: 4,
                bgcolor: 'action.hover',
                borderRadius: 1,
                textAlign: 'left',
                overflow: 'auto',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.75rem',
              }}
            >
              {this.state.error.message}
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button variant="contained" onClick={this.handleReload}>
              刷新页面
            </Button>
            <Button variant="outlined" onClick={this.handleGoHome}>
              返回首页
            </Button>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}
