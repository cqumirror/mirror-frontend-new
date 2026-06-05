// src/components/mirrors/GithubReleaseViewer.tsx
// Github Release 专用下载页面组件
// 目录结构：/github-release/{org}/{repo}/{version}/{files}

import {
  Download as DownloadIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckIcon,
  ArrowBack as BackIcon,
  OpenInNew as OpenIcon,
  Refresh as RefreshIcon,
  LocalOffer as LocalOfferIcon,
  FolderOff as EmptyIcon,
  VerifiedUser as ChecksumIcon,
  Search as SearchIcon,
  Close as ClearIcon,
} from '@mui/icons-material';
import {
  Box,
  Grid,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Button,
  Chip,
  Skeleton,
  Alert,
  Divider,
  Avatar,
  Link,
  Tab,
  Tabs,
  Card,
  CardActionArea,
  InputBase,
} from '@mui/material';
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { sanitizeUrl } from '@/utils/url';

// ─── 类型 ────────────────────────────────────────────────────────────────────

interface DirEntry {
  name: string;
  href: string;
  size: string;
  date: string;
  isDir: boolean;
}

interface Project {
  org: string;
  repo: string;
  orgDate: string;
}

interface Release {
  name: string;
  path: string;
  date: string;
  isLatest: boolean;
}

interface FileEntry {
  name: string;
  href: string;
  size: string;
  date: string;
  platform: 'windows' | 'linux' | 'macos' | 'android' | 'font' | 'archive' | 'checksum' | 'other';
  arch: string;
}

// ─── 平台检测 ─────────────────────────────────────────────────────────────────

function detectPlatform(name: string): FileEntry['platform'] {
  const f = name.toLowerCase();
  if (
    f.includes('windows') ||
    f.includes('_win') ||
    f.endsWith('.exe') ||
    f.endsWith('.msi') ||
    f.endsWith('.msix')
  )
    return 'windows';
  if (
    f.includes('darwin') ||
    f.includes('macos') ||
    f.includes('osx') ||
    f.endsWith('.dmg') ||
    f.endsWith('.pkg')
  )
    return 'macos';
  if (
    f.includes('linux') ||
    f.endsWith('.deb') ||
    f.endsWith('.rpm') ||
    f.endsWith('.appimage') ||
    f.endsWith('.flatpak')
  )
    return 'linux';
  if (f.includes('android') || f.endsWith('.apk') || f.endsWith('.aab')) return 'android';
  if (f.endsWith('.ttf') || f.endsWith('.otf') || f.endsWith('.woff') || f.endsWith('.woff2')) return 'font';
  if (
    f.endsWith('.zip') ||
    f.endsWith('.tar') ||
    f.endsWith('.tar.gz') ||
    f.endsWith('.tgz') ||
    f.endsWith('.tar.bz2') ||
    f.endsWith('.tar.xz') ||
    f.endsWith('.7z') ||
    f.endsWith('.rar') ||
    f.endsWith('.gz') ||
    f.endsWith('.bz2') ||
    f.endsWith('.xz')
  )
    return 'archive';
  // 校验文件：sha256、md5、sig、asc 等
  if (
    f.endsWith('.sha256') ||
    f.endsWith('.sha512') ||
    f.endsWith('.md5') ||
    f.endsWith('.sha1') ||
    f.endsWith('.sig') ||
    f.endsWith('.asc') ||
    f.includes('checksum') ||
    f.includes('sha256sum') ||
    f.includes('md5sum') ||
    f === 'shasums' ||
    f.startsWith('sha256sums') ||
    f.startsWith('md5sums') ||
    f.includes('hash')
  )
    return 'checksum';
  return 'other';
}

function detectArch(name: string): string {
  const f = name.toLowerCase();
  if (f.includes('amd64') || f.includes('x86_64') || f.includes('x64')) return 'x64';
  if (f.includes('arm64') || f.includes('aarch64')) return 'arm64';
  if (f.includes('armv7') || f.includes('arm32') || f.includes('armv6') || f.includes('armv5'))
    return f.match(/arm(v\d)/)?.[1] ?? 'arm';
  if (f.includes('386') || f.includes('x86') || f.includes('i386')) return 'x86';
  if (f.includes('riscv64')) return 'riscv64';
  if (f.includes('ppc64')) return 'ppc64';
  if (f.includes('mips')) return f.match(/mips\w*/)?.[0] ?? 'mips';
  return '';
}

// ─── 版本检测 ────────────────────────────────────────────────────────────────

function looksLikeVersion(name: string): boolean {
  const n = name.toLowerCase();
  if (n === 'latestrelease') return true;
  // semver: v1.2.3, 1.2.3, 1.2.3.4, v1, v1.2, 带 pre-release 标签
  if (/^v?\d+(\.\d+){0,3}([-._]?(rc|beta|alpha|pre|release|final)\d*)?$/i.test(n)) return true;
  // 日期格式: 2024-01-01, 20240101, 2024.01.01
  if (/^\d{4}[-.]?\d{2}[-.]?\d{2}$/.test(n)) return true;
  return false;
}

function extractVersion(name: string): number[] {
  const m = name.match(/^v?(\d+(?:[.-]\d+)*)/);
  if (!m) return [];
  return m[1]
    .split(/[.-]/)
    .map(Number)
    .filter((n) => !isNaN(n));
}

function compareVersionDesc(a: string, b: string): number {
  const va = extractVersion(a);
  const vb = extractVersion(b);
  if (va.length === 0 && vb.length === 0) return 0;
  if (va.length === 0) return 1;
  if (vb.length === 0) return -1;
  for (let i = 0; i < Math.max(va.length, vb.length); i++) {
    const diff = (vb[i] ?? 0) - (va[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

interface ClassifyResult {
  versionDirs: DirEntry[];
  otherDirs: DirEntry[];
  files: DirEntry[];
  isVersioned: boolean;
}

function classifyEntries(entries: DirEntry[]): ClassifyResult {
  const dirs = entries.filter((e) => e.isDir);
  const files = entries.filter((e) => !e.isDir);
  const versionDirs = dirs.filter((d) => looksLikeVersion(d.name.replace(/\/$/, '')));
  const otherDirs = dirs.filter((d) => !looksLikeVersion(d.name.replace(/\/$/, '')));
  const isVersioned = dirs.length > 0 && versionDirs.length > dirs.length / 2;
  return { versionDirs, otherDirs, files, isVersioned };
}

function toFileEntry(e: DirEntry): FileEntry {
  return {
    name: e.name,
    href: e.href,
    size: e.size,
    date: e.date,
    platform: detectPlatform(e.name),
    arch: detectArch(e.name),
  };
}

/** 递归加载目录结构，自动检测版本目录 vs 扁平文件（depth 上限防死循环） */
async function loadDirectoryRecursive(
  path: string,
  depth = 0
): Promise<{ releases: Release[]; files: FileEntry[] }> {
  if (depth > 3) return { releases: [], files: [] };

  const entries = await fetchDir(path);
  const { versionDirs, otherDirs, files, isVersioned } = classifyEntries(entries);

  if (isVersioned) {
    // 大多数子目录是版本号 → 当作 releases
    const releases: Release[] = versionDirs
      .map((e) => {
        const n = e.name.replace(/\/$/, '');
        return { name: n, path: e.href, date: e.date, isLatest: n.toLowerCase() === 'latestrelease' };
      })
      .sort((a, b) => {
        if (a.isLatest) return -1;
        if (b.isLatest) return 1;
        return compareVersionDesc(a.name, b.name);
      });
    return { releases, files: [] };
  }

  if (files.length > 0 && otherDirs.length === 0) {
    // 纯文件目录 → 返回文件列表
    return { releases: [], files: files.map(toFileEntry) };
  }

  if (otherDirs.length > 0) {
    // 有非版本子目录 → 递归进入，合并结果
    const results = await Promise.all(
      otherDirs.map((d) => loadDirectoryRecursive(d.href, depth + 1))
    );
    const allReleases = results.flatMap((r) => r.releases);
    const allFiles = results.flatMap((r) => r.files);
    // 当前目录下的文件也合并进去
    if (files.length > 0) allFiles.push(...files.map(toFileEntry));
    return { releases: allReleases, files: allFiles };
  }

  return { releases: [], files: [] };
}

// ─── 常量 ────────────────────────────────────────────────────────────────────

const PLATFORM_LABEL: Record<FileEntry['platform'], string> = {
  windows: 'Windows',
  linux: 'Linux',
  macos: 'macOS',
  android: 'Android',
  font: '字体',
  archive: '压缩包',
  checksum: '校验文件',
  other: '跨平台 / 其他',
};

// macOS 用内联 SVG（Apple logo 版权原因不能用 emoji，unicode 私有区在非 Apple 系统不渲染）
const AppleIcon: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="currentColor"
    style={style}
    aria-hidden="true"
  >
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.15-2.2 1.28-2.18 3.81.03 3.02 2.65 4.03 2.68 4.04l-.05.17c-.1.36-.51 1.74-1.2 2.8M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

// Windows logo SVG
const WindowsIcon: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="currentColor"
    style={style}
    aria-hidden="true"
  >
    <path d="M3 12.5v-8l7-1v8.5H3zm8 0V3.2l10-1.5V12.5h-10zM3 13.5h7v8.5l-7-1v-7.5zm8 0h10v10.3l-10-1.5V13.5z" />
  </svg>
);

// Linux Tux SVG
const LinuxIcon: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 1024 1024" style={style} aria-hidden="true">
    <path d="M0 0h1024v1024H0z" fill="none" />
    <path fill="currentColor" fillRule="evenodd" d="M530.798 64c-5.786 0-11.759.299-17.88.784c-157.798 12.431-115.95 179.448-118.34 235.108c-2.874 40.803-11.198 72.945-39.234 112.776c-33.037 39.235-79.402 102.66-101.39 168.772c-10.378 31.06-15.305 62.865-10.714 92.916a15.8 15.8 0 0 0-4.143 5.04c-9.706 10.004-16.762 22.436-24.713 31.32c-7.429 7.43-18.106 9.968-29.753 14.933c-11.683 5.077-24.563 10.041-32.253 25.421c-3.36 7.018-5.077 14.67-4.928 22.435c0 7.43 1.008 14.97 2.053 20.01c2.165 14.895 4.33 27.214 1.456 36.21c-9.258 25.385-10.415 42.781-3.92 55.436c6.496 12.469 19.972 17.509 35.054 22.436c30.275 7.466 71.301 5.04 103.592 22.361c34.569 17.434 69.66 25.05 97.657 17.546a66.01 66.01 0 0 0 45.096-35.278c21.913-.112 45.917-10.042 84.367-12.468c26.094-2.165 58.759 9.967 96.239 7.429c.933 5.04 2.351 7.428 4.255 12.468l.112.112c14.597 29.043 41.55 42.258 70.331 39.981c28.782-2.24 59.43-20.01 84.255-48.754c23.556-28.558 62.828-40.466 88.773-56.108c12.99-7.429 23.48-17.508 24.227-31.843c.859-14.932-7.428-30.312-26.654-51.404v-3.621l-.112-.112c-6.346-7.466-9.332-19.972-12.617-34.568c-3.174-14.97-6.795-29.342-18.367-39.048h-.112c-2.203-2.016-4.592-2.501-7.018-5.04a13.33 13.33 0 0 0-7.093-2.389c16.09-47.709 9.855-95.193-6.458-137.9c-19.898-52.636-54.69-98.478-81.195-130.022c-29.715-37.517-58.833-73.056-58.273-125.767c1.008-80.335 8.848-228.948-132.3-229.172m19.748 127.11h.486c7.951 0 14.783 2.315 21.8 7.392c7.131 5.04 12.32 12.394 16.389 19.898c3.92 9.668 5.898 17.134 6.197 27.027c0-.747.224-1.493.224-2.203v3.883a3.2 3.2 0 0 1-.15-.784l-.149-.896a67.5 67.5 0 0 1-5.6 26.355a35.6 35.6 0 0 1-7.95 12.506a26.5 26.5 0 0 0-3.286-1.568c-3.92-1.68-7.429-2.389-10.64-4.965a49 49 0 0 0-8.175-2.463c1.83-2.203 5.413-4.965 6.795-7.392c1.978-4.778 3.06-9.855 3.285-15.007v-.71a45.2 45.2 0 0 0-2.277-14.931c-1.68-5.04-3.77-7.504-6.832-12.469c-3.136-2.464-6.234-4.928-9.967-4.928h-.598c-3.471 0-6.57 1.12-9.78 4.928a29.9 29.9 0 0 0-7.653 12.469a44 44 0 0 0-3.36 14.932v.71c.075 3.322.299 6.681.747 9.966c-7.205-2.5-16.351-5.04-22.66-7.54c-.375-2.46-.6-4.942-.672-7.43v-.746a66.15 66.15 0 0 1 5.6-28.707a40.46 40.46 0 0 1 16.052-19.897a36.77 36.77 0 0 1 22.174-7.43m-110.573 2.203h1.344c5.3 0 10.08 1.792 14.895 5.04c5.45 4.816 9.855 10.751 12.842 17.359c3.36 7.429 5.263 14.97 5.711 24.9v.149c.261 5.002.224 7.503-.074 9.93v2.986c-1.12.261-2.091.672-3.099.896c-5.674 2.053-10.229 5.04-14.67 7.466c.447-3.322.484-6.682.111-9.967v-.56c-.448-4.965-1.456-7.429-3.061-12.431a22.9 22.9 0 0 0-6.197-9.968a9.26 9.26 0 0 0-6.831-2.389h-.784c-2.65.224-4.853 1.53-6.944 4.928a20.6 20.6 0 0 0-4.48 10.08a35.2 35.2 0 0 0-.858 12.356v.522c.448 5.04 1.381 7.504 3.024 12.469c1.68 5.002 3.62 7.466 6.16 10.004c.41.336.783.672 1.268.896c-2.613 2.128-4.367 2.613-6.57 5.077a11.4 11.4 0 0 1-4.89 2.539a98 98 0 0 1-10.266-15.007a66.2 66.2 0 0 1-5.786-24.9a65.7 65.7 0 0 1 2.986-24.937a53.4 53.4 0 0 1 10.565-19.971c4.778-4.965 9.706-7.467 15.604-7.467M491.153 257c12.357 0 27.326 2.427 45.357 14.895c10.938 7.467 19.524 10.042 39.31 17.471h.111c9.52 5.077 15.12 9.93 17.844 14.895v-4.89a21.32 21.32 0 0 1 .598 17.545c-4.592 11.61-19.263 24.041-39.72 31.47v.075c-10.005 5.04-18.703 12.43-28.931 17.358c-10.304 5.04-21.95 10.9-37.78 9.968a42.5 42.5 0 0 1-16.723-2.502a133 133 0 0 1-12.02-7.391c-7.28-5.04-13.552-12.394-22.847-17.359v-.186h-.187c-14.932-9.184-22.995-19.114-25.609-26.542c-2.575-10.005-.186-17.509 7.205-22.399c8.362-5.04 14.186-10.116 18.031-12.543c3.882-2.762 5.338-3.808 6.57-4.89h.075v-.112c6.309-7.541 16.276-17.508 31.32-22.436c5.19-1.344 10.975-2.427 17.396-2.427m104.489 80c13.402 52.898 44.685 129.724 64.806 166.98c10.676 19.935 31.918 61.932 41.138 112.888c5.824-.187 12.282.672 19.15 2.39c24.116-62.38-20.382-129.426-40.652-148.054c-8.25-7.504-8.66-12.506-4.592-12.506c21.988 19.935 50.956 58.684 61.446 102.92c4.816 19.973 5.936 41.214.784 62.343c2.501 1.045 5.04 2.277 7.653 2.501c38.525 19.935 52.748 35.016 45.917 57.377v-1.605c-2.277-.112-4.48 0-6.757 0h-.56c5.637-17.433-6.794-30.798-39.757-45.693c-34.158-14.932-61.446-12.543-66.113 17.359c-.261 1.605-.448 2.464-.634 5.04c-2.539.858-5.19 1.978-7.802 2.389c-16.053 10.004-24.713 24.974-29.604 44.311c-4.853 19.898-6.346 43.155-7.652 69.771v.112c-.784 12.469-6.384 31.283-11.909 50.434c-55.996 40.018-133.644 57.415-199.682 12.468a98.7 98.7 0 0 0-15.007-19.897a54.1 54.1 0 0 0-10.265-12.468c6.794 0 12.617-1.083 17.358-2.501a22.96 22.96 0 0 0 11.722-12.469c4.032-9.967 0-26.02-12.879-43.415c-12.879-17.434-34.755-37.144-66.747-56.78c-23.518-14.895-36.808-32.478-42.93-52.114c-6.16-19.934-5.339-40.504-.56-61.409c9.146-39.944 32.59-78.767 47.559-103.144c3.994-2.427 1.381 5.04-15.231 36.36c-14.783 28.035-42.594 93.214-4.554 143.872a303.3 303.3 0 0 1 24.153-107.363c21.054-47.709 65.067-130.807 68.539-196.658c1.791 1.344 8.1 5.04 10.788 7.54c8.138 4.966 14.186 12.432 22.025 17.36c7.877 7.503 17.807 12.505 32.702 12.505c1.456.112 2.8.224 4.144.224c15.343 0 27.214-5.002 37.181-10.004c10.826-5.002 19.45-12.469 27.625-14.932h.186c17.434-5.04 31.209-15.007 39.01-26.132m81.605 334.408c1.38 22.436 12.804 46.477 32.925 51.404c21.95 5.003 53.532-12.43 66.86-28.558l7.876-.336c11.76-.298 21.54.374 31.62 9.968l.111.112c7.765 7.429 11.386 19.822 14.597 32.701c3.173 14.97 5.749 29.118 15.268 39.795c18.143 19.673 24.078 33.821 23.742 42.557l.112-.224v.672l-.112-.448c-.56 9.78-6.906 14.783-18.59 22.212c-23.519 14.97-65.18 26.579-91.722 58.609c-23.07 27.512-51.18 42.52-76.005 44.46c-24.788 1.98-46.178-7.466-58.759-33.522l-.186-.112c-7.84-14.97-4.48-38.264 2.09-63.09c6.57-24.936 15.978-50.209 17.284-70.853c1.382-26.654 2.837-49.836 7.28-67.718c4.48-17.358 11.498-29.752 23.929-36.733l1.68-.821zm-403.731 1.83h.373c1.978 0 3.92.186 5.86.522c14.037 2.053 26.356 12.431 38.19 28.073l33.971 62.118l.112.112c9.071 19.897 28.147 39.72 44.386 61.147c16.202 22.324 28.745 42.221 27.214 58.61v.224c-2.128 27.774-17.881 42.855-41.997 48.305c-24.078 5.04-56.742.075-89.407-17.321c-36.136-20.01-79.066-17.508-106.653-22.473c-13.775-2.464-22.81-7.504-26.99-14.97c-4.144-7.428-4.219-22.435 4.591-45.916v-.112l.075-.112c4.368-12.469 1.12-28.11-1.008-41.773c-2.053-14.97-3.099-26.468 1.605-35.091c5.973-12.469 14.783-14.895 25.721-19.897c11.013-5.04 23.929-7.541 34.195-17.509h.075v-.111c9.556-10.005 16.612-22.436 24.936-31.284c7.093-7.503 14.186-12.543 24.75-12.543m267.25-338.74c-16.24 7.504-35.278 19.973-55.548 19.973c-20.233 0-36.211-9.967-47.746-17.396c-5.786-5.003-10.453-10.005-13.962-12.506c-6.122-5.002-5.375-12.468-2.762-12.468c4.069.597 4.815 5.04 7.429 7.503c3.583 2.464 8.026 7.429 13.476 12.431c10.863 7.466 25.385 17.434 43.527 17.434c18.106 0 39.31-9.968 52.189-17.397c7.28-5.04 16.612-12.468 24.19-17.433c5.824-5.114 5.562-10.005 10.415-10.005c4.816.598 1.27 5.003-5.487 12.432a302 302 0 0 1-25.759 17.47v-.037zm-40.392-59.13v-.822c-.224-.71.485-1.568 1.083-1.867c2.762-1.605 6.72-1.008 9.706.15c2.351 0 5.972 2.5 5.6 5.04c-.225 1.829-3.174 2.463-5.04 2.463c-2.054 0-3.435-1.605-5.264-2.538c-1.941-.672-5.45-.299-6.085-2.427m-20.57 0c-.746 2.164-4.218 1.828-6.196 2.463c-1.755.933-3.21 2.538-5.189 2.538c-1.904 0-4.89-.709-5.114-2.538c-.336-2.464 3.285-4.965 5.6-4.965c3.023-1.157 6.868-1.755 9.668-.187c.71.336 1.344 1.12 1.12 1.867v.784h.112z" />
  </svg>
);

// Android robot SVG
const AndroidIcon: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" style={style} aria-hidden="true">
    <path d="M0 0h24v24H0z" fill="none" />
    <path fill="currentColor" d="M11.115 4.667a.846.846 0 1 1-1.692 0a.846.846 0 0 1 1.692 0m2.539.846a.846.846 0 1 0 0-1.692a.846.846 0 0 0 0 1.692" />
    <path fill="currentColor" fillRule="evenodd" d="M6.354.47a.75.75 0 0 1 1.061 0l1.228 1.227a6.26 6.26 0 0 1 3.215-.883h.207c1.175 0 2.274.322 3.215.883L16.508.47a.75.75 0 0 1 1.06 1.06l-1.091 1.092a6.27 6.27 0 0 1 1.853 3.943q.323-.108.683-.11a2.16 2.16 0 0 1 2.16 2.16v5.077a2.16 2.16 0 0 1-2.82 2.058v1.865c0 .913-.445 1.721-1.129 2.222v1.47a2.442 2.442 0 1 1-4.884 0v-.942h-.757v.943a2.442 2.442 0 1 1-4.884 0v-1.471a2.75 2.75 0 0 1-1.128-2.222V15.75a2.16 2.16 0 0 1-2.82-2.058V8.615a2.16 2.16 0 0 1 2.842-2.05a6.27 6.27 0 0 1 1.853-3.943L6.354 1.53a.75.75 0 0 1 0-1.06m.965 7.485a.25.25 0 0 0-.248.25v9.41a1.25 1.25 0 0 0 1.245 1.25h7.291a1.25 1.25 0 0 0 1.245-1.25v-9.41a.25.25 0 0 0-.248-.25zm9.287-1.5h.203a4.79 4.79 0 0 0-4.744-4.14h-.207a4.79 4.79 0 0 0-4.744 4.14zM13.84 21.308v-.943h1.884v.943a.942.942 0 1 1-1.884 0m-5.526-.943h1.769v.943a.942.942 0 1 1-1.884 0v-.943zm10.699-6.012a.66.66 0 0 1-.66-.658V8.612a.66.66 0 0 1 1.32.003v5.077a.66.66 0 0 1-.66.66M5.57 8.61a.66.66 0 0 0-1.32.004v5.077a.66.66 0 0 0 1.32.005z" clipRule="evenodd" />
  </svg>
);

// 通用/跨平台包 SVG
const PackageIcon: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" style={style} aria-hidden="true">
    <path d="M0 0h24v24H0z" fill="none" />
    <path fill="currentColor" d="M5 8v11h14V8h-3v8l-4-2l-4 2V8zm0 13q-.825 0-1.412-.587T3 19V6.525q0-.35.113-.675t.337-.6L4.7 3.725q.275-.35.687-.538T6.25 3h11.5q.45 0 .863.188t.687.537l1.25 1.525q.225.275.338.6t.112.675V19q0 .825-.587 1.413T19 21zm.4-15h13.2l-.85-1H6.25zM10 8v4.75l2-1l2 1V8zM5 8h14z" />
  </svg>
);

// 字体 SVG
const FontFileIcon: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 12 12" style={style} aria-hidden="true">
    <path d="M0 0h12v12H0z" fill="none" />
    <path fill="currentColor" d="M0 12h11V3h-1v1H8V2h1V1H0Zm1-1V2h6v3h3v6Zm4-2h1V6h1V5H4V4h1V3H2v1h1v3h1V6h1Zm2 1h1V9h1V8H8V7h1V6H7Zm2-7h1V2H9Zm0 0" />
  </svg>
);

// 压缩包 SVG
const ArchiveFileIcon: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" style={style} aria-hidden="true">
    <path d="M0 0h24v24H0z" fill="none" />
    <path fill="currentColor" d="M12 17v-2h2v2zm2-4v-2h-2v2zm0-4V7h-2v2zm-4 2h2V9h-2zm0 4h2v-2h-2zM21 5v14c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2m-2 0h-7v2h-2V5H5v14h14z" />
  </svg>
);

const PLATFORM_ICON: Record<FileEntry['platform'], React.ReactNode> = {
  windows: <WindowsIcon style={{ fontSize: '1rem', width: '1rem', height: '1rem' }} />,
  linux: <LinuxIcon style={{ fontSize: '1rem', width: '1rem', height: '1rem' }} />,
  macos: <AppleIcon style={{ fontSize: '1rem', width: '1rem', height: '1rem' }} />,
  android: <AndroidIcon style={{ fontSize: '1rem', width: '1rem', height: '1rem' }} />,
  font: <FontFileIcon style={{ fontSize: '1rem', width: '1rem', height: '1rem' }} />,
  archive: <ArchiveFileIcon style={{ fontSize: '1rem', width: '1rem', height: '1rem' }} />,
  checksum: null, // 用 MUI VerifiedUser 图标，在渲染处单独处理
  other: <PackageIcon style={{ fontSize: '1rem', width: '1rem', height: '1rem' }} />,
};

const PLATFORM_ORDER: FileEntry['platform'][] = [
  'windows',
  'linux',
  'macos',
  'android',
  'font',
  'archive',
  'other',
  'checksum',
];

// ─── 头像颜色：根据 org 名 hash 生成确定性色相 ──────────────────────────────

const AVATAR_COLORS = [
  { bg: '#DBEAFE', fg: '#1D4ED8' }, // blue
  { bg: '#D1FAE5', fg: '#065F46' }, // green
  { bg: '#FEF3C7', fg: '#92400E' }, // amber
  { bg: '#FCE7F3', fg: '#9D174D' }, // pink
  { bg: '#EDE9FE', fg: '#5B21B6' }, // violet
  { bg: '#FFEDD5', fg: '#9A3412' }, // orange
  { bg: '#CFFAFE', fg: '#155E75' }, // cyan
  { bg: '#F0FDF4', fg: '#166534' }, // emerald (light)
];
const AVATAR_COLORS_DARK = [
  { bg: '#1E3A5F', fg: '#93C5FD' },
  { bg: '#064E3B', fg: '#6EE7B7' },
  { bg: '#451A03', fg: '#FDE68A' },
  { bg: '#500724', fg: '#FBCFE8' },
  { bg: '#2E1065', fg: '#C4B5FD' },
  { bg: '#431407', fg: '#FDBA74' },
  { bg: '#083344', fg: '#67E8F9' },
  { bg: '#052E16', fg: '#86EFAC' },
];

function orgColorIndex(org: string): number {
  let h = 0;
  for (let i = 0; i < org.length; i++) h = (Math.imul(31, h) + org.charCodeAt(i)) >>> 0;
  return h % AVATAR_COLORS.length;
}

// ─── 解析 fancyindex HTML ─────────────────────────────────────────────────────

function parseDirEntries(html: string, baseUrl: string): DirEntry[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const table = doc.getElementById('list');
  if (!table) return [];

  return Array.from(table.querySelectorAll('tbody tr'))
    .map((row): DirEntry | null => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 2) return null;
      const anchor = cells[0].querySelector('a');
      if (!anchor) return null;
      const name = anchor.textContent?.trim() ?? '';
      const href = anchor.getAttribute('href') ?? '';
      if (!href || href === '../' || name === 'Parent Directory') return null;
      const size = cells[1]?.textContent?.trim() ?? '';
      const date = cells[2]?.textContent?.trim() ?? '';
      const isDir = href.endsWith('/');
      const absHref = href.startsWith('http') ? href : new URL(href, baseUrl).href;
      return { name: decodeURIComponent(name), href: absHref, size, date, isDir };
    })
    .filter((e): e is DirEntry => e !== null);
}

async function fetchDir(path: string): Promise<DirEntry[]> {
  const url = path.startsWith('http') ? path : `${window.location.origin}${path}`;
  const fetchOpts: RequestInit = {
    headers: { Accept: 'text/html' },
    credentials: 'same-origin',
  };

  let res = await fetch(url, fetchOpts);
  if (!res.ok && res.status !== 503) throw new Error(`HTTP ${res.status}`);

  let html: string;
  if (res.status === 503) {
    html = await res.text();
    const match = html.match(/document\.cookie\s*=\s*'addr4=([^;]+)/);
    if (match) {
      document.cookie = `addr4=${match[1]};max-age=300;path=/;SameSite=Lax`;
      res = await fetch(url, fetchOpts);
      if (!res.ok) throw new Error(`HTTP ${res.status} (after challenge)`);
      html = await res.text();
    } else {
      throw new Error('HTTP 503 (challenge page, no addr4 cookie found)');
    }
  } else {
    html = await res.text();
  }

  return parseDirEntries(html, url);
}

// ─── 子组件：项目头像（加载中/失败显示彩色首字母 fallback） ──────────────────────

interface ProjectAvatarProps {
  org: string;
  size?: number;
}

const ProjectAvatar: React.FC<ProjectAvatarProps> = ({ org, size = 44 }) => {
  const [imgStatus, setImgStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const avatarUrl = `https://github.com/${org}.png?size=64`;
  const colorIdx = orgColorIndex(org);

  return (
    <>
      {imgStatus === 'loaded' ? (
        <Box
          component="img"
          src={avatarUrl}
          alt={org}
          sx={{
            width: size,
            height: size,
            borderRadius: '6px',
            flexShrink: 0,
            objectFit: 'contain',
          }}
        />
      ) : (
        <Avatar
          variant="rounded"
          sx={{
            width: size,
            height: size,
            borderRadius: '6px',
            fontSize: size <= 36 ? '0.9rem' : '1.15rem',
            fontWeight: 700,
            flexShrink: 0,
            bgcolor: (theme) =>
              theme.palette.mode === 'dark'
                ? AVATAR_COLORS_DARK[colorIdx].bg
                : AVATAR_COLORS[colorIdx].bg,
            color: (theme) =>
              theme.palette.mode === 'dark'
                ? AVATAR_COLORS_DARK[colorIdx].fg
                : AVATAR_COLORS[colorIdx].fg,
          }}
        >
          {org[0]?.toUpperCase()}
        </Avatar>
      )}
      {imgStatus !== 'loaded' && (
        <Box
          component="img"
          src={avatarUrl}
          onLoad={() => setImgStatus('loaded')}
          onError={() => setImgStatus('error')}
          sx={{ display: 'none' }}
          alt=""
        />
      )}
    </>
  );
};

// ─── 子组件：项目卡片 ──────────────────────────────────────────────────────────

interface ProjectCardProps {
  project: Project;
  latestVersion?: string;
  onSelect: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, latestVersion, onSelect }) => {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: (theme) =>
            theme.palette.mode === 'dark'
              ? '0 4px 20px rgba(96,165,250,0.12)'
              : '0 4px 20px rgba(59,130,246,0.09)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardActionArea
        onClick={onSelect}
        sx={{
          borderRadius: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          height: '100%',
        }}
      >
        {/* 主体：头像左对齐 + 文字 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, pb: 1.5 }}>
          {/* 头像 */}
          <ProjectAvatar org={project.org} size={44} />

          {/* 名称区 */}
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                fontSize: '0.9rem',
                lineHeight: 1.25,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {project.repo}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.7rem',
                display: 'block',
                mt: 0.25,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {project.org}
            </Typography>
          </Box>
        </Box>

        {/* footer：版本 tag，细线隔开 */}
        <Box
          sx={{
            px: 2,
            py: 1,
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {latestVersion ? (
            <Chip
              icon={
                <LocalOfferIcon sx={{ fontSize: '11px !important', color: 'inherit !important' }} />
              }
              label={latestVersion}
              size="small"
              variant="outlined"
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.68rem',
                height: 20,
                maxWidth: '100%',
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(96,165,250,0.07)' : 'rgba(59,130,246,0.05)',
                borderColor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(96,165,250,0.22)' : 'rgba(59,130,246,0.18)',
                color: 'primary.main',
                '& .MuiChip-icon': { color: 'inherit' },
                '& .MuiChip-label': {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                },
              }}
            />
          ) : (
            <Skeleton variant="rounded" width={76} height={20} />
          )}
        </Box>
      </CardActionArea>
    </Card>
  );
};

// ─── 子组件：文件行 ──────────────────────────────────────────────────────────

interface FileRowProps {
  file: FileEntry;
}

const FileRow: React.FC<FileRowProps> = ({ file }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    },
    []
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(file.href);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[copy]', err);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 0.5, sm: 1 },
        px: 1.5,
        py: 0.8,
        borderRadius: 1,
        minWidth: 0,
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      {/* 文件名 + arch chip（xs 时 chip 换行到文件名下方） */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box
          sx={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 0.5, minWidth: 0 }}
        >
          <Link
            href={sanitizeUrl(file.href)}
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: { xs: '0.75rem', sm: '0.8rem' },
              wordBreak: 'break-all',
              lineHeight: 1.4,
              minWidth: 0,
            }}
          >
            {file.name}
          </Link>
          {file.arch && (
            <Chip
              label={file.arch}
              size="small"
              variant="outlined"
              sx={{
                fontSize: '0.65rem',
                height: 18,
                fontFamily: '"JetBrains Mono", monospace',
                flexShrink: 0,
              }}
            />
          )}
        </Box>
      </Box>

      {/* 大小：xs 时隐藏，避免撑破行 */}
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.75rem',
          flexShrink: 0,
          minWidth: { sm: 56 },
          textAlign: 'right',
          display: { xs: 'none', sm: 'block' },
        }}
      >
        {file.size}
      </Typography>

      {/* 操作按钮 */}
      <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0 }}>
        <Tooltip title={copied ? t('common.copied') : t('common.copyLink')}>
          <IconButton
            size="small"
            sx={{ p: 0.5 }}
            onClick={handleCopy}
            color={copied ? 'success' : 'default'}
          >
            {copied ? <CheckIcon sx={{ fontSize: 14 }} /> : <CopyIcon sx={{ fontSize: 14 }} />}
          </IconButton>
        </Tooltip>
        <Tooltip title={t('common.download')}>
          <IconButton
            size="small"
            sx={{ p: 0.5 }}
            component="a"
            href={sanitizeUrl(file.href)}
            target="_blank"
            rel="noopener noreferrer"
            color="primary"
          >
            <DownloadIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

// ─── 主组件 ───────────────────────────────────────────────────────────────────

interface GithubReleaseViewerProps {
  /** 镜像根路径，如 /github-release/ */
  rootPath: string;
  /**
   * 子项目路径，如 /github-release/microsoft/OBS-Studio/
   * 设置后跳过项目列表，直接展示该子项目的 releases 和文件。
   */
  subProjectPath?: string;
  /**
   * rootPath 是否已定位到某个 org 目录（如 /github-release/obsproject/）。
   * 为 true 时，目录条目直接作为 repo 展示，不再向下探索 org→repo 层级。
   */
  isOrgView?: boolean;
}

const GithubReleaseViewer: React.FC<GithubReleaseViewerProps> = ({ rootPath, subProjectPath, isOrgView }) => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  // ── 状态 ──────────────────────────────────────────────────────────────────

  type ViewMode = 'projects' | 'project';
  const [viewMode, setViewMode] = useState<ViewMode>(subProjectPath ? 'project' : 'projects');

  // 项目列表
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  // 每个项目的最新版本号缓存
  const versionCache = useRef<Map<string, string>>(new Map()); // key: `{org}/{repo}`
  const [versionMap, setVersionMap] = useState<Record<string, string>>({});

  // 当前选中的项目
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [releases, setReleases] = useState<Release[]>([]);
  const [releasesLoading, setReleasesLoading] = useState(false);
  const [selectedReleaseIdx, setSelectedReleaseIdx] = useState(0);

  // 当前 release 的文件
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);

  // ── 加载项目列表 ────────────────────────────────────────────────────────

  const loadProjects = useCallback(
    async (signal?: AbortSignal) => {
      setProjectsLoading(true);
      setProjectsError(null);
      try {
        const norm = rootPath.endsWith('/') ? rootPath : rootPath + '/';

        if (isOrgView) {
          // isOrgView: rootPath 已是 org 目录，条目直接就是 repo
          const repoEntries = await fetchDir(norm);
          if (signal?.aborted) return;
          const repoDirs = repoEntries.filter((e) => e.isDir);
          // 从路径提取 org 名
          const parts = norm.replace(/\/+$/, '').split('/');
          const orgName = parts[parts.length - 1] ?? '';

          const allProjects: Project[] = repoDirs.map((r) => ({
            org: orgName,
            repo: r.name.replace(/\/$/, ''),
            orgDate: r.date,
          }));
          setProjects(allProjects);

          // 拉取每个 repo 的最新版本号
          const versionResults = await Promise.allSettled(
            repoDirs.map(async (r) => {
              const versions = await fetchDir(r.href);
              const versionDirs = versions
                .filter((v) => v.isDir && looksLikeVersion(v.name.replace(/\/$/, '')) && v.name.replace(/\/$/, '').toLowerCase() !== 'latestrelease')
                .sort((a, b) => compareVersionDesc(a.name.replace(/\/$/, ''), b.name.replace(/\/$/, '')));
              const latest = versionDirs[0];
              const repoName = r.name.replace(/\/$/, '');
              return {
                key: `${orgName}/${repoName}`,
                version: latest?.name.replace(/\/$/, '') ?? '',
              };
            })
          );
          if (signal?.aborted) return;

          const map: Record<string, string> = {};
          versionResults.forEach((r) => {
            if (r.status === 'fulfilled' && r.value) {
              versionCache.current.set(r.value.key, r.value.version);
              map[r.value.key] = r.value.version;
            }
          });
          setVersionMap(map);
        } else {
          // 标准模式：rootPath → orgs → repos
          // Step1: 获取 org 列表
          const orgs = await fetchDir(norm);
          if (signal?.aborted) return;
          const orgDirs = orgs.filter((e) => e.isDir);

          // Step2: 并行拉取每个 org 下的 repo
          const results = await Promise.allSettled(
            orgDirs.map(async (org) => {
              const repos = await fetchDir(org.href);
              return repos
                .filter((r) => r.isDir)
                .map(
                  (repo): Project => ({
                    org: org.name.replace(/\/$/, ''),
                    repo: repo.name.replace(/\/$/, ''),
                    orgDate: org.date,
                  })
                );
            })
          );
          if (signal?.aborted) return;

          const allProjects: Project[] = results.flatMap((r) =>
            r.status === 'fulfilled' ? r.value : []
          );
          setProjects(allProjects);

          // Step3: 并行拉取每个项目的版本列表，只取最新非LatestRelease版本号
          const versionResults = await Promise.allSettled(
            allProjects.map(async (proj) => {
              const rootOrg = orgs.find((o) => o.name.replace(/\/$/, '') === proj.org);
              if (!rootOrg) return null;
              const orgEntries = (await fetchDir(rootOrg.href)).filter((e) => e.isDir);
              const repoEntry = orgEntries.find((r) => r.name.replace(/\/$/, '') === proj.repo);
              if (!repoEntry) return null;
              const versions = await fetchDir(repoEntry.href);
              const versionDirs = versions
                .filter((v) => v.isDir && looksLikeVersion(v.name.replace(/\/$/, '')) && v.name.replace(/\/$/, '').toLowerCase() !== 'latestrelease')
                .sort((a, b) => compareVersionDesc(a.name.replace(/\/$/, ''), b.name.replace(/\/$/, '')));
              const latest = versionDirs[0];
              return {
                key: `${proj.org}/${proj.repo}`,
                version: latest?.name.replace(/\/$/, '') ?? '',
              };
            })
          );
          if (signal?.aborted) return;

          const map: Record<string, string> = {};
          versionResults.forEach((r) => {
            if (r.status === 'fulfilled' && r.value) {
              versionCache.current.set(r.value.key, r.value.version);
              map[r.value.key] = r.value.version;
            }
          });
          setVersionMap(map);
        }
      } catch (err: unknown) {
        if (signal?.aborted) return;
        setProjectsError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!signal?.aborted) setProjectsLoading(false);
      }
    },
    [rootPath, isOrgView]
  );

  useEffect(() => {
    if (subProjectPath) return; // 子项目模式：跳过项目列表加载
    const controller = new AbortController();
    loadProjects(controller.signal);
    return () => controller.abort();
  }, [loadProjects, subProjectPath]);

  // ── 子项目模式：递归加载 releases ──────────────────────────────────────────
  const subProjectLoaded = useRef(false);
  useEffect(() => {
    if (!subProjectPath || subProjectLoaded.current) return;
    subProjectLoaded.current = true;
    const norm = subProjectPath.endsWith('/') ? subProjectPath : subProjectPath + '/';
    // 从路径提取 org/repo 用于显示
    const parts = norm.replace(/\/+$/, '').split('/');
    const repo = parts[parts.length - 1] ?? '';
    const org = parts[parts.length - 2] ?? '';
    setSelectedProject({ org, repo, orgDate: '' });
    // 递归加载
    setReleasesLoading(true);
    loadDirectoryRecursive(norm)
      .then(({ releases: rels, files: f }) => {
        setReleases(rels);
        setFiles(f);
        if (rels.length > 0) setSelectedReleaseIdx(0);
      })
      .catch((err) => {
        if (import.meta.env.DEV) console.warn('[GithubReleaseViewer] subProject loadReleases:', err);
        setReleases([]);
      })
      .finally(() => setReleasesLoading(false));
  }, [subProjectPath]);

  // ── 加载选中项目的 releases ────────────────────────────────────────────

  const loadReleases = useCallback(
    async (proj: Project) => {
      setReleasesLoading(true);
      setReleases([]);
      setFiles([]);
      try {
        const norm = rootPath.endsWith('/') ? rootPath : rootPath + '/';
        // isOrgView 时 norm 已是 org 目录，直接拼 repo；否则拼 org/repo
        const path = isOrgView
          ? `${norm}${encodeURIComponent(proj.repo)}/`
          : `${norm}${encodeURIComponent(proj.org)}/${encodeURIComponent(proj.repo)}/`;
        const { releases: rels, files: f } = await loadDirectoryRecursive(path);
        setReleases(rels);
        setFiles(f);
        if (rels.length > 0) setSelectedReleaseIdx(0);
      } catch (err) {
        if (import.meta.env.DEV) console.warn('[GithubReleaseViewer] loadReleases:', err);
        setReleases([]);
      } finally {
        setReleasesLoading(false);
      }
    },
    [rootPath, isOrgView]
  );

  // ── 加载 release 文件列表 ─────────────────────────────────────────────

  const loadFiles = useCallback(async (releasePath: string) => {
    setFilesLoading(true);
    setFiles([]);
    try {
      const entries = await fetchDir(releasePath);
      const fileEntries: FileEntry[] = entries
        .filter((e) => !e.isDir)
        .map(
          (e): FileEntry => ({
            name: e.name,
            href: e.href,
            size: e.size,
            date: e.date,
            platform: detectPlatform(e.name),
            arch: detectArch(e.name),
          })
        );
      setFiles(fileEntries);
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[GithubReleaseViewer] loadFiles:', err);
      setFiles([]);
    } finally {
      setFilesLoading(false);
    }
  }, []);

  // 当 release 选择变化时加载文件
  useEffect(() => {
    if (releases.length > 0 && releases[selectedReleaseIdx]) {
      loadFiles(releases[selectedReleaseIdx].path);
    }
  }, [releases, selectedReleaseIdx, loadFiles]);

  // ── 项目选择 ────────────────────────────────────────────────────────────

  const handleSelectProject = useCallback(
    (proj: Project) => {
      setSelectedProject(proj);
      setViewMode('project');
      loadReleases(proj);
      setFileSearch('');
    },
    [loadReleases]
  );

  const handleBack = () => {
    setViewMode('projects');
    setSelectedProject(null);
    setReleases([]);
    setFiles([]);
    setFileSearch('');
  };

  // ── URL 参数自动选中项目 ──────────────────────────────────────────────────
  const autoSelectedRef = useRef(false);
  useEffect(() => {
    if (autoSelectedRef.current || projectsLoading || projectsError || projects.length === 0) return;
    const org = searchParams.get('org');
    const repo = searchParams.get('repo');
    if (!org || !repo) return;
    const match = projects.find((p) => p.org === org && p.repo === repo);
    if (match) {
      autoSelectedRef.current = true;
      handleSelectProject(match);
    }
  }, [projects, projectsLoading, projectsError, searchParams, handleSelectProject]);

  // ── 文件搜索 ─────────────────────────────────────────────────────────────
  const [fileSearch, setFileSearch] = useState('');
  const fileSearchRef = useRef<HTMLInputElement>(null);

  // 切换 release 时清空搜索
  useEffect(() => {
    setFileSearch('');
  }, [selectedReleaseIdx]);

  const filteredFiles = useMemo(() => {
    const q = fileSearch.trim().toLowerCase();
    return q ? files.filter((f) => f.name.toLowerCase().includes(q)) : files;
  }, [files, fileSearch]);

  // ── 按平台分组文件（基于过滤后的列表） ────────────────────────────────────
  const filesByPlatform = PLATFORM_ORDER.reduce<Record<string, FileEntry[]>>((acc, p) => {
    const group = filteredFiles.filter((f) => f.platform === p);
    if (group.length > 0) acc[p] = group;
    return acc;
  }, {});

  // ── 渲染：项目列表 ──────────────────────────────────────────────────────

  if (viewMode === 'projects') {
    if (projectsError) {
      return (
        <Alert
          severity="error"
          action={
            <Button size="small" onClick={() => loadProjects()} startIcon={<RefreshIcon />}>
              {t('common.retry')}
            </Button>
          }
        >
          {projectsError}
        </Alert>
      );
    }

    return (
      <Box>
        {/* 标题栏 */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            {projectsLoading
              ? t('githubRelease.loadingProjects')
              : t('githubRelease.projectCount', { count: projects.length })}
          </Typography>
          <Tooltip title={t('common.refresh')}>
            <IconButton size="small" onClick={() => loadProjects()} disabled={projectsLoading}>
              <RefreshIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* 项目卡片网格 */}
        <Grid container spacing={2}>
          {projectsLoading
            ? Array.from({ length: 12 }).map((_, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Skeleton variant="rounded" height={140} sx={{ borderRadius: 3 }} />
                </Grid>
              ))
            : projects.map((proj) => {
                const versionKey = `${proj.org}/${proj.repo}`;
                return (
                  <Grid key={versionKey} size={{ xs: 12, sm: 6, md: 4 }}>
                    <ProjectCard
                      project={proj}
                      latestVersion={versionMap[versionKey]}
                      onSelect={() => handleSelectProject(proj)}
                    />
                  </Grid>
                );
              })}
        </Grid>
      </Box>
    );
  }

  // ── 渲染：项目详情 ──────────────────────────────────────────────────────

  const selectedRelease = releases[selectedReleaseIdx];

  return (
    <Box>
      {/* 返回按钮（子项目模式下隐藏，由页面面包屑提供导航） */}
      {!subProjectPath && (
        <Button
          size="small"
          startIcon={<BackIcon />}
          onClick={handleBack}
          sx={{ mb: 2, color: 'text.secondary' }}
        >
          {t('githubRelease.backToProjects')}
        </Button>
      )}

      {/* 项目标题 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <ProjectAvatar org={selectedProject?.org ?? ''} size={32} />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {selectedProject?.repo}
          </Typography>
          <Typography
            variant="caption"
            component="a"
            href={`https://github.com/${selectedProject?.org}/${selectedProject?.repo}/releases`}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              color: 'text.secondary',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.72rem',
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            {selectedProject?.org}/{selectedProject?.repo} ↗
          </Typography>
        </Box>
      </Box>

      {/* Release 版本 Tabs */}
      {releasesLoading ? (
        <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1, mb: 2 }} />
      ) : releases.length === 0 && files.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('githubRelease.noReleases')}
        </Alert>
      ) : releases.length > 0 || files.length > 0 ? (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', minWidth: 0 }}>
          {/* 版本 Tabs（扁平结构时无 release 子目录，不显示） */}
          {releases.length > 0 ? (
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'action.hover', px: 1 }}>
              <Tabs
              value={selectedReleaseIdx}
              onChange={(_, v) => setSelectedReleaseIdx(v)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{
                minHeight: 40,
                '& .MuiTab-root': {
                  minHeight: 40,
                  py: 0,
                  fontSize: '0.8rem',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontWeight: 600,
                  textTransform: 'none',
                },
              }}
            >
              {releases.map((rel, idx) => (
                <Tab
                  key={rel.path}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {rel.isLatest && (
                        <Chip
                          label="Latest"
                          size="small"
                          color="success"
                          sx={{ fontSize: '0.6rem', height: 16, mr: 0.25 }}
                        />
                      )}
                      {rel.isLatest ? t('githubRelease.latestRelease') : rel.name}
                    </Box>
                  }
                  value={idx}
                />
              ))}
            </Tabs>
          </Box>
          ) : null}

          {/* 版本信息栏 */}
          {selectedRelease && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 2,
                py: 1,
                borderBottom: 1,
                borderColor: 'divider',
                gap: 1,
                flexWrap: 'wrap',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <LocalOfferIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    color: 'text.secondary',
                  }}
                >
                  {selectedRelease.isLatest
                    ? t('githubRelease.latestRelease')
                    : selectedRelease.name}
                </Typography>
                {selectedRelease.date && (
                  <>
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      ·
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      {selectedRelease.date}
                    </Typography>
                  </>
                )}
                {!filesLoading && files.length > 0 && (
                  <Chip
                    size="small"
                    label={t('githubRelease.fileCount', { count: files.length })}
                    variant="outlined"
                    sx={{ fontSize: '0.68rem', height: 20 }}
                  />
                )}
              </Box>
              <Tooltip title={t('common.openInBrowser')}>
                <IconButton
                  size="small"
                  component="a"
                  href={selectedRelease.path}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <OpenIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </Box>
          )}

          {/* 文件列表（按平台分组） */}
          <Box sx={{ p: 1.5 }}>
            {filesLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton
                  key={i}
                  variant="rectangular"
                  height={36}
                  sx={{ mb: 0.5, borderRadius: 1 }}
                />
              ))
            ) : files.length === 0 ? (
              <Box
                sx={{
                  py: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1,
                  color: 'text.disabled',
                }}
              >
                <EmptyIcon sx={{ fontSize: 36 }} />
                <Typography variant="body2">{t('githubRelease.noFiles')}</Typography>
              </Box>
            ) : (
              <>
                {/* 搜索栏（文件数 > 6 时才显示） */}
                {files.length > 6 && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                      mb: 1.5,
                      px: 1,
                      py: 0.5,
                      border: '1.5px solid',
                      borderColor: fileSearch ? 'primary.main' : 'divider',
                      borderRadius: 2,
                      bgcolor: 'background.paper',
                      transition: 'border-color 0.15s',
                      boxShadow: fileSearch ? '0 0 0 3px rgba(59,130,246,0.12)' : 'none',
                    }}
                  >
                    <SearchIcon sx={{ fontSize: 15, color: 'text.secondary', flexShrink: 0 }} />
                    <InputBase
                      inputRef={fileSearchRef}
                      value={fileSearch}
                      onChange={(e) => setFileSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Escape' && setFileSearch('')}
                      placeholder={t('githubRelease.searchFiles')}
                      inputProps={{ 'aria-label': t('githubRelease.searchFiles') }}
                      sx={{
                        flex: 1,
                        fontSize: '0.82rem',
                        fontFamily: '"JetBrains Mono", monospace',
                      }}
                    />
                    {fileSearch && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          flexShrink: 0,
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.72rem',
                        }}
                      >
                        {filteredFiles.length}/{files.length}
                      </Typography>
                    )}
                    {fileSearch && (
                      <IconButton
                        size="small"
                        onClick={() => {
                          setFileSearch('');
                          fileSearchRef.current?.focus();
                        }}
                        aria-label={t('common.clear')}
                        sx={{ p: 0.25 }}
                      >
                        <ClearIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    )}
                  </Box>
                )}

                {/* 无结果 */}
                {fileSearch && filteredFiles.length === 0 ? (
                  <Box sx={{ py: 3, textAlign: 'center', color: 'text.disabled' }}>
                    <Typography variant="body2">
                      {t('directory.noResults', { query: fileSearch })}
                    </Typography>
                  </Box>
                ) : (
                  PLATFORM_ORDER.filter((p) => filesByPlatform[p]).map((platform, idx) => (
                    <Box key={platform}>
                      {idx > 0 && <Divider sx={{ my: 1 }} />}
                      {/* 平台标题 */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.75,
                          px: 1.5,
                          py: 0.5,
                          mb: 0.25,
                        }}
                      >
                        {platform === 'checksum' ? (
                          <ChecksumIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                        ) : (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              color: 'text.secondary',
                              fontSize: '1rem',
                              lineHeight: 1,
                            }}
                          >
                            {PLATFORM_ICON[platform]}
                          </Box>
                        )}
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                            color: 'text.secondary',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          {PLATFORM_LABEL[platform]}
                        </Typography>
                        <Chip
                          size="small"
                          label={filesByPlatform[platform].length}
                          sx={{ height: 18, fontSize: '0.65rem' }}
                        />
                      </Box>
                      {/* 该平台的文件 */}
                      {filesByPlatform[platform].map((file) => (
                        <FileRow key={file.href} file={file} />
                      ))}
                    </Box>
                  ))
                )}
              </>
            )}
          </Box>
        </Paper>
      ) : null}
    </Box>
  );
};

export default GithubReleaseViewer;
