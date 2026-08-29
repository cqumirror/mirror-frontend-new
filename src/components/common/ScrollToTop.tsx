// src/components/common/ScrollToTop.tsx
// 回到顶部悬浮按钮 —— 滚动超过 400px 后出现

import { KeyboardArrowUp as ArrowUpIcon } from '@mui/icons-material';
import { Fab, Zoom, Tooltip } from '@mui/material';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const SCROLL_THRESHOLD = 400;

const ScrollToTop: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const { pathname } = useLocation();

  // SPA 路由不会触发浏览器的常规页面滚动恢复，切换页面时显式回到顶部。
  // 只监听 pathname，避免详情页切换 tab/query 时打断用户阅读位置。
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > SCROLL_THRESHOLD);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Zoom in={visible}>
      <Tooltip title={'回到顶部'} placement="left">
        <Fab
          size="small"
          color="primary"
          onClick={handleClick}
          aria-label={'回到顶部'}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1200,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          <ArrowUpIcon fontSize="small" />
        </Fab>
      </Tooltip>
    </Zoom>
  );
};

export default ScrollToTop;
