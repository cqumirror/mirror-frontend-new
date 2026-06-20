// src/components/common/ThemeToggle.tsx
// 主题切换按钮组件 —— 浅色 → 深色 → 跟随系统 三态循环

import { DarkMode as DarkIcon, LightMode as LightIcon, BrightnessAuto as SystemIcon } from '@mui/icons-material';
import { IconButton, Tooltip } from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../hooks/useTheme';

const ICONS = {
  light: LightIcon,
  dark: DarkIcon,
  system: SystemIcon,
} as const;

const TOOLTIP_KEYS = {
  light: 'theme.light',
  dark: 'theme.dark',
  system: 'theme.system',
} as const;

/**
 * 主题切换按钮（浅色 → 深色 → 跟随系统）
 * 状态通过 localStorage['theme'] 与 FancyIndex 共享
 */
const ThemeToggle: React.FC = () => {
  const { t } = useTranslation();
  const { mode, cycleMode } = useTheme();

  const Icon = ICONS[mode];

  return (
    <Tooltip title={t(TOOLTIP_KEYS[mode])} placement="bottom">
      <IconButton
        onClick={cycleMode}
        color="inherit"
        size="small"
        aria-label={t('theme.toggle')}
        sx={{
          transition: 'transform 0.3s ease',
          '&:hover': { transform: 'rotate(20deg)' },
        }}
      >
        <Icon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;
