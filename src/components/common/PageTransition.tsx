// src/components/common/PageTransition.tsx
// 路由切换时的全局遮罩过渡动画 + 居中 loading 指示器

import { Box, Typography, useTheme } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import LoadingGrid from './LoadingGrid';

type Phase = 'in' | 'out' | null;

const DURATION = 300;

const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname, search } = useLocation();
  const theme = useTheme();
  const [phase, setPhase] = useState<Phase>(null);

  useEffect(() => {
    setPhase('in');
    const t1 = setTimeout(() => setPhase('out'), DURATION);
    const t2 = setTimeout(() => setPhase(null), DURATION * 2);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pathname, search]);

  return (
    <>
      {children}
      {phase && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            bgcolor: theme.palette.background.default,
            opacity: phase === 'in' ? 1 : 0,
            transition: `opacity ${DURATION}ms ease`,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: theme.palette.primary.main }}>
            <LoadingGrid />
            <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.85rem' }}>
              Loading...
            </Typography>
          </Box>
        </Box>
      )}
    </>
  );
};

export default PageTransition;
