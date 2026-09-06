// src/types/index.ts
// 镜像站核心类型定义

/**
 * 镜像同步状态枚举
 */
export type MirrorStatus =
  | 'succeeded'
  | 'failed'
  | 'syncing'
  | 'cached'
  | 'paused'
  | 'disabled'
  | 'unknown';

/**
 * 镜像存储方式枚举
 * local 本地存储
 * campusProxy校内反代校外重定向
 * cache 校内外均反代
 * campusOnly 仅校内访问，校外无法访问
 * campusLocal 校内访问本地存储，校外访问反代
 * redirect 重定向
 */
export type ItemType = 'mirror' | 'release';

export type MirrorStorageType =
  | 'local'
  | 'campusProxy'
  | 'cache'
  | 'campusOnly'
  | 'campusLocal'
  | 'redirect';
/**
 * 镜像文件信息
 */
export interface MirrorFile {
  name: string;
  url: string;
}

/**
 * 镜像数据结构
 */
export interface Mirror {
  id: string;
  url: string;
  name: string;
  desc: string;
  helpUrl: string;
  upstream: string;
  size: string;
  status: MirrorStatus;
  lastUpdated: string;
  nextScheduled: string;
  lastSuccess: string;
  type: string;
  files: MirrorFile[];
  popular: boolean;
  storageType: MirrorStorageType;
  gitRepo: boolean;
  message: string;
}

export interface ReleaseManifest {
  org: string;
  repo: string;
  name: string;
  desc: string;
  flat: boolean;
  tarball: boolean;
  pre_release: boolean;
  versions: number;
  popular: boolean;
  size: string;
  avatar_url: string;
  releases: ReleaseVersionInfo[];
  latest: ReleaseLatestInfo | null;
}

export interface ReleaseVersionInfo {
  version: string;
  tag: string;
  files: string[];
  published_at: string;
  pre_release: boolean;
}

export interface ReleaseLatestInfo {
  version: string;
  tag: string;
}

/**
 * 校园网检测响应
 * status: true = 校内 (is_cqu=1) | false = 校外
 * ipv6: true = 纯 IPv6 连接 | false = IPv4（含 IPv4-mapped "::ffff:"）
 */
export interface CampusNetworkStatus {
  status: boolean;
  ipv6: boolean;
}

/**
 * 主题模式
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * 语言选项
 */

/**
 * 按字母分组的镜像映射
 */
export type GroupedMirrors = Record<string, Mirror[]>;
