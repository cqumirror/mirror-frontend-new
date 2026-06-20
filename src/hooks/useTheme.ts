// src/hooks/useTheme.ts
// 主题切换 Hook

import { useMemo } from 'react';

import { useThemeStore } from '../stores/mirrorStore';
import { lightTheme, darkTheme } from '../theme/theme';

export const useTheme = () => {
  const { mode, effectiveMode, cycleMode, setMode } = useThemeStore();
  const theme = effectiveMode === 'light' ? lightTheme : darkTheme;
  const isDark = effectiveMode === 'dark';

  return useMemo(() => ({ mode, effectiveMode, theme, isDark, cycleMode, setMode }), [mode, effectiveMode, theme, isDark, cycleMode, setMode]);
};
