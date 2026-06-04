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
 * 镜像文件信息
 */
export interface MirrorFile {
  name: string;
  url: string;
}

/**
 * 镜像数据结构（与后端API严格对应）
 */
export interface Mirror {
  id: string;
  url: string;
  name: { zh: string; en: string };
  desc: { zh: string; en: string };
  helpUrl: string;
  upstream: string;
  size: string;
  status: MirrorStatus;
  lastUpdated: string;
  nextScheduled: string;
  lastSuccess: string;
  type: string;
  files: MirrorFile[];
}

/**
 * 校园网检测响应
 * status: "1" = 校内 (is_cqu=1) | "0" = 校外 | "6" = IPv6 (非校内且 remote_addr 为纯 IPv6)
 * ipv6: true = 纯 IPv6 连接 | false = IPv4（含 IPv4-mapped "::ffff:"）
 */
export interface CampusNetworkStatus {
  status: '1' | '0' | '6';
  ipv6: boolean;
}

/**
 * 主题模式
 */
export type ThemeMode = 'light' | 'dark';

/**
 * 语言选项
 */
export type Locale = 'zh' | 'en';

/**
 * 按字母分组的镜像映射
 */
export type GroupedMirrors = Record<string, Mirror[]>;
