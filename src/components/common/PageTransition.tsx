// src/components/common/PageTransition.tsx
// 路由切换时的全局遮罩过渡动画 + 居中 loading 指示器

import { Box, Typography, useTheme } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

type Phase = 'in' | 'out' | null;

const DURATION = 300;

const LoadingGrid: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="4em" height="4em" viewBox="0 0 24 24">
    <path d="M0 0h24v24H0z" fill="none" />
    <rect width="7.33" height="7.33" x="1" y="1" fill="currentColor">
      <animate
        id="SVGzjrPLenI"
        attributeName="x"
        begin="0;SVGXAURnSRI.end+0.2s"
        dur="0.6s"
        values="1;4;1"
      />
      <animate attributeName="y" begin="0;SVGXAURnSRI.end+0.2s" dur="0.6s" values="1;4;1" />
      <animate
        attributeName="width"
        begin="0;SVGXAURnSRI.end+0.2s"
        dur="0.6s"
        values="7.33;1.33;7.33"
      />
      <animate
        attributeName="height"
        begin="0;SVGXAURnSRI.end+0.2s"
        dur="0.6s"
        values="7.33;1.33;7.33"
      />
    </rect>
    <rect width="7.33" height="7.33" x="8.33" y="1" fill="currentColor">
      <animate
        attributeName="x"
        begin="SVGzjrPLenI.begin+0.1s"
        dur="0.6s"
        values="8.33;11.33;8.33"
      />
      <animate attributeName="y" begin="SVGzjrPLenI.begin+0.1s" dur="0.6s" values="1;4;1" />
      <animate
        attributeName="width"
        begin="SVGzjrPLenI.begin+0.1s"
        dur="0.6s"
        values="7.33;1.33;7.33"
      />
      <animate
        attributeName="height"
        begin="SVGzjrPLenI.begin+0.1s"
        dur="0.6s"
        values="7.33;1.33;7.33"
      />
    </rect>
    <rect width="7.33" height="7.33" x="1" y="8.33" fill="currentColor">
      <animate attributeName="x" begin="SVGzjrPLenI.begin+0.1s" dur="0.6s" values="1;4;1" />
      <animate
        attributeName="y"
        begin="SVGzjrPLenI.begin+0.1s"
        dur="0.6s"
        values="8.33;11.33;8.33"
      />
      <animate
        attributeName="width"
        begin="SVGzjrPLenI.begin+0.1s"
        dur="0.6s"
        values="7.33;1.33;7.33"
      />
      <animate
        attributeName="height"
        begin="SVGzjrPLenI.begin+0.1s"
        dur="0.6s"
        values="7.33;1.33;7.33"
      />
    </rect>
    <rect width="7.33" height="7.33" x="15.66" y="1" fill="currentColor">
      <animate
        attributeName="x"
        begin="SVGzjrPLenI.begin+0.2s"
        dur="0.6s"
        values="15.66;18.66;15.66"
      />
      <animate attributeName="y" begin="SVGzjrPLenI.begin+0.2s" dur="0.6s" values="1;4;1" />
      <animate
        attributeName="width"
        begin="SVGzjrPLenI.begin+0.2s"
        dur="0.6s"
        values="7.33;1.33;7.33"
      />
      <animate
        attributeName="height"
        begin="SVGzjrPLenI.begin+0.2s"
        dur="0.6s"
        values="7.33;1.33;7.33"
      />
    </rect>
    <rect width="7.33" height="7.33" x="8.33" y="8.33" fill="currentColor">
      <animate
        attributeName="x"
        begin="SVGzjrPLenI.begin+0.2s"
        dur="0.6s"
        values="8.33;11.33;8.33"
      />
      <animate
        attributeName="y"
        begin="SVGzjrPLenI.begin+0.2s"
        dur="0.6s"
        values="8.33;11.33;8.33"
      />
      <animate
        attributeName="width"
        begin="SVGzjrPLenI.begin+0.2s"
        dur="0.6s"
        values="7.33;1.33;7.33"
      />
      <animate
        attributeName="height"
        begin="SVGzjrPLenI.begin+0.2s"
        dur="0.6s"
        values="7.33;1.33;7.33"
      />
    </rect>
    <rect width="7.33" height="7.33" x="1" y="15.66" fill="currentColor">
      <animate attributeName="x" begin="SVGzjrPLenI.begin+0.2s" dur="0.6s" values="1;4;1" />
      <animate
        attributeName="y"
        begin="SVGzjrPLenI.begin+0.2s"
        dur="0.6s"
        values="15.66;18.66;15.66"
      />
      <animate
        attributeName="width"
        begin="SVGzjrPLenI.begin+0.2s"
        dur="0.6s"
        values="7.33;1.33;7.33"
      />
      <animate
        attributeName="height"
        begin="SVGzjrPLenI.begin+0.2s"
        dur="0.6s"
        values="7.33;1.33;7.33"
      />
    </rect>
    <rect width="7.33" height="7.33" x="15.66" y="8.33" fill="currentColor">
      <animate
        attributeName="x"
        begin="SVGzjrPLenI.begin+0.3s"
        dur="0.6s"
        values="15.66;18.66;15.66"
      />
      <animate
        attributeName="y"
        begin="SVGzjrPLenI.begin+0.3s"
        dur="0.6s"
        values="8.33;11.33;8.33"
      />
      <animate
        attributeName="width"
        begin="SVGzjrPLenI.begin+0.3s"
        dur="0.6s"
        values="7.33;1.33;7.33"
      />
      <animate
        attributeName="height"
        begin="SVGzjrPLenI.begin+0.3s"
        dur="0.6s"
        values="7.33;1.33;7.33"
      />
    </rect>
    <rect width="7.33" height="7.33" x="8.33" y="15.66" fill="currentColor">
      <animate
        attributeName="x"
        begin="SVGzjrPLenI.begin+0.3s"
        dur="0.6s"
        values="8.33;11.33;8.33"
      />
      <animate
        attributeName="y"
        begin="SVGzjrPLenI.begin+0.3s"
        dur="0.6s"
        values="15.66;18.66;15.66"
      />
      <animate
        attributeName="width"
        begin="SVGzjrPLenI.begin+0.3s"
        dur="0.6s"
        values="7.33;1.33;7.33"
      />
      <animate
        attributeName="height"
        begin="SVGzjrPLenI.begin+0.3s"
        dur="0.6s"
        values="7.33;1.33;7.33"
      />
    </rect>
    <rect width="7.33" height="7.33" x="15.66" y="15.66" fill="currentColor">
      <animate
        id="SVGXAURnSRI"
        attributeName="x"
        begin="SVGzjrPLenI.begin+0.4s"
        dur="0.6s"
        values="15.66;18.66;15.66"
      />
      <animate
        attributeName="y"
        begin="SVGzjrPLenI.begin+0.4s"
        dur="0.6s"
        values="15.66;18.66;15.66"
      />
      <animate
        attributeName="width"
        begin="SVGzjrPLenI.begin+0.4s"
        dur="0.6s"
        values="7.33;1.33;7.33"
      />
      <animate
        attributeName="height"
        begin="SVGzjrPLenI.begin+0.4s"
        dur="0.6s"
        values="7.33;1.33;7.33"
      />
    </rect>
  </svg>
);

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
