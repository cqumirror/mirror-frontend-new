// src/stores/mirrorStore.ts
// Zustand 全局状态管理
//
// 使用 persist 中间件统一管理本地存储：
//   - 自带版本迁移（version 字段）
//   - 自带异常隔离（storage 失败不影响 state）
//   - 自带选择性持久化（partialize）

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { Mirror, ThemeMode, Locale } from '../types';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/storage';

// ── persist 自定义存储：复用 safeGetItem 的兜底逻辑（Safari 隐私模式等）──
const safeStorage = createJSONStorage(() => ({
  getItem: (key) => safeGetItem(key),
  setItem: (key, value) => safeSetItem(key, value),
  removeItem: (key) => safeRemoveItem(key),
}));

// ---- 主题 Store ----
interface ThemeState {
  mode: ThemeMode;
  /** 有效模式：'system' 解析为 'light' 或 'dark' */
  effectiveMode: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  cycleMode: () => void;
}

/** 检测系统深色偏好 */
function getSystemPreference(): 'light' | 'dark' {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

/** 解析模式为有效 light/dark */
function resolveMode(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'system' ? getSystemPreference() : mode;
}

/** 将有效模式写入 data-theme 属性 */
function applyThemeAttr(mode: 'light' | 'dark') {
  try {
    document.documentElement.setAttribute('data-theme', mode);
  } catch {
    /* SSR 兜底 */
  }
}

// matchMedia 监听器（system 模式下自动响应系统偏好变化）
let mediaQuery: MediaQueryList | null = null;
let mediaHandler: ((e: MediaQueryListEvent) => void) | null = null;

function setupSystemListener(set: (partial: Partial<ThemeState>) => void) {
  cleanupSystemListener();
  try {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaHandler = (e: MediaQueryListEvent) => {
      const mode = e.matches ? 'dark' : 'light';
      applyThemeAttr(mode);
      set({ effectiveMode: mode });
    };
    mediaQuery.addEventListener('change', mediaHandler);
  } catch {
    /* SSR 兜底 */
  }
}

function cleanupSystemListener() {
  if (mediaQuery && mediaHandler) {
    mediaQuery.removeEventListener('change', mediaHandler);
    mediaQuery = null;
    mediaHandler = null;
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      effectiveMode: getSystemPreference(),
      setMode: (mode) => {
        const effective = resolveMode(mode);
        applyThemeAttr(effective);
        set({ mode, effectiveMode: effective });
        if (mode === 'system') {
          setupSystemListener(set);
        } else {
          cleanupSystemListener();
        }
      },
      cycleMode: () => {
        const order: ThemeMode[] = ['light', 'dark', 'system'];
        const next = order[(order.indexOf(get().mode) + 1) % order.length];
        get().setMode(next);
      },
    }),
    {
      name: 'theme',
      storage: safeStorage,
      version: 2,
      partialize: (s) => ({ mode: s.mode }),
      migrate: (persisted, version) => {
        const p = persisted as Record<string, unknown>;
        const raw = p?.mode;
        if (raw === 'light' || raw === 'dark' || raw === 'system') {
          return { mode: raw as ThemeMode };
        }
        return { mode: 'system' as ThemeMode };
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          const effective = resolveMode(state.mode);
          applyThemeAttr(effective);
          state.effectiveMode = effective;
          if (state.mode === 'system') {
            setupSystemListener((partial) => state.setMode((partial as { mode?: ThemeMode }).mode ?? state.mode));
          }
        }
      },
    }
  )
);

// 初始化时如果 mode 是 system，设置监听器
try {
  const initial = useThemeStore.getState();
  if (initial.mode === 'system') {
    setupSystemListener((partial) => {
      const state = useThemeStore.getState();
      if (partial.effectiveMode !== undefined) {
        // 只更新 effectiveMode，不触发 setMode
        useThemeStore.setState({ effectiveMode: partial.effectiveMode as 'light' | 'dark' });
      }
    });
  }
} catch {
  /* SSR 兜底 */
}

// ---- 语言 Store ----
interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: 'zh',
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: 'locale-store',
      storage: safeStorage,
      version: 1,
      partialize: (s) => ({ locale: s.locale }),
    }
  )
);

// ---- 搜索 Store（不持久化）----
interface MirrorSearchState {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useMirrorSearchStore = create<MirrorSearchState>((set) => ({
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
}));

// ---- 镜像缓存 Store（运行时缓存，不持久化）----
interface MirrorCacheState {
  mirrors: Mirror[];
  setMirrors: (mirrors: Mirror[]) => void;
}

export const useMirrorCacheStore = create<MirrorCacheState>((set) => ({
  mirrors: [],
  setMirrors: (mirrors) => set({ mirrors }),
}));

// ---- 收藏 Store ----
interface FavoriteState {
  favorites: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  clearFavorites: () => void;
}

export const useFavoriteStore = create<FavoriteState>()(
  persist(
    (set, get) => ({
      favorites: [],
      toggleFavorite: (id) => {
        const cur = get().favorites;
        set({ favorites: cur.includes(id) ? cur.filter((f) => f !== id) : [...cur, id] });
      },
      isFavorite: (id) => get().favorites.includes(id),
      clearFavorites: () => set({ favorites: [] }),
    }),
    {
      name: 'mirror_favorites',
      storage: safeStorage,
      version: 2,
      partialize: (s) => ({ favorites: s.favorites }),
      // 旧版本（v1，纯 JSON 数组写在 'mirror_favorites' key 下）的迁移
      migrate: (persisted, version) => {
        if (version < 2 && Array.isArray(persisted)) {
          return {
            favorites: (persisted as unknown[]).filter((v): v is string => typeof v === 'string'),
          };
        }
        // 运行时校验：persisted 可能来自格式异常的持久化数据
        const p = persisted as Record<string, unknown>;
        if (p && Array.isArray(p.favorites)) {
          return {
            favorites: (p.favorites as unknown[]).filter((v): v is string => typeof v === 'string'),
          };
        }
        return { favorites: [] };
      },
    }
  )
);
