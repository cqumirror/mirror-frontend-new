// src/components/mirrors/SyncTimeline.tsx

import {
  CheckCircle as SuccessIcon,
  InfoOutlineRounded as InfoIcon,
  Sync as SyncIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  History as HistoryIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { Box, Typography, Paper, Grid, Tooltip, IconButton, alpha } from '@mui/material';
import React, { useState, useRef, useEffect } from 'react';

import { storageTypeMap } from '@/components/mirrors/StatusChip.tsx';
import type { Mirror } from '@/types';
import { formatAbsoluteTime } from '@/utils/time.ts';

interface SyncTimelineProps {
  mirror: Mirror;
}

// ── 时间卡片 ──────────────────────────────────────────────────────────────────
const TimeCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: string;
}> = ({ icon, label, value, color }) => (
  <Paper
    variant="outlined"
    sx={{
      p: 2,
      borderRadius: 2,
      display: 'flex',
      alignItems: 'flex-start',
      gap: 1.5,
      height: '100%',
      width: '100%',
      boxSizing: 'border-box',
    }}
  >
    <Box sx={{ color: color ?? 'text.secondary', mt: 0.2, flexShrink: 0 }}>{icon}</Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          display: 'block',
          mb: 0.3,
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 600,
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.82rem',
        }}
      >
        {value}
      </Typography>
    </Box>
  </Paper>
);

// ── 上游地址卡片 ──────────────────────────────────────────────────────────────
const UpstreamCard: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const display = value && value !== '-' ? value : '—';
  const hasValue = display !== '—';
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    },
    []
  );

  const handleCopy = async () => {
    if (!hasValue) return;
    try {
      await navigator.clipboard.writeText(display);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[copy]', err);
    }
  };

  return (
    // width:'100%' + minWidth:0 是 flex 子项能截断文字的关键
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 2,
        height: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        width: '100%',
        minWidth: 0, // ← 必须，否则 Paper 会撑开而不是截断
        overflow: 'hidden', // ← 配合 minWidth:0 阻止溢出
        boxSizing: 'border-box',
      }}
    >
      <Box sx={{ color: 'text.secondary', mt: 0.2, flexShrink: 0 }}>
        <HistoryIcon fontSize="small" />
      </Box>
      {/* 文字区域：minWidth:0 让 flex 子项可以压缩 */}
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            display: 'block',
            mb: 0.3,
          }}
        >
          {label}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
          <Tooltip
            title={hasValue ? display : ''}
            placement="bottom-start"
            arrow
            disableHoverListener={!hasValue}
          >
            <Typography
              variant="body2"
              onClick={handleCopy}
              sx={{
                fontWeight: 600,
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.82rem',
                color: hasValue ? 'text.primary' : 'text.disabled',

                // 这三行缺一不可
                whiteSpace: 'nowrap',

                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minWidth: 0,
                flex: 1,
                cursor: hasValue ? 'pointer' : 'default',
                '&:hover': hasValue ? { color: 'primary.main' } : {},
                transition: 'color 0.15s',
              }}
            >
              {display}
            </Typography>
          </Tooltip>
          {hasValue && (
            <Tooltip title={copied ? '已复制' : '点击复制'} placement="top">
              <IconButton
                size="small"
                onClick={handleCopy}
                sx={{ p: 0.3, flexShrink: 0 }}
                aria-label={'点击复制'}
              >
                {copied ? (
                  <CheckIcon sx={{ fontSize: 13, color: 'success.main' }} />
                ) : (
                  <CopyIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                )}
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

// ── 主组件 ────────────────────────────────────────────────────────────────────
const SyncTimeline: React.FC<SyncTimelineProps> = ({ mirror }) => {
  const hasSyncSchedule = mirror.storageType === 'local' || mirror.storageType === 'campusLocal';

  const statusColor = {
    succeeded: 'success.main',
    failed: 'error.main',
    syncing: 'info.main',
    cached: 'text.secondary',
    paused: 'warning.main',
    disabled: 'text.disabled',
    unknown: 'text.secondary',
    proxy: 'text.secondary',
  }[mirror.status];

  return (
    <Box>
      {/* 四列同行，alignItems="stretch" 保证等高 */}
      <Grid
        container
        spacing={2}
        sx={{
          alignItems: 'stretch',
        }}
      >
        {hasSyncSchedule && (
          <>
            <Grid size={{ xs: 6, md: 3 }} sx={{ display: 'flex' }}>
              <TimeCard
                icon={<SyncIcon fontSize="small" />}
                label={'最后更新'}
                value={formatAbsoluteTime(mirror.lastUpdated)}
                color={statusColor}
              />
            </Grid>

            <Grid size={{ xs: 6, md: 3 }} sx={{ display: 'flex' }}>
              <TimeCard
                icon={<SuccessIcon fontSize="small" />}
                label={'上次成功'}
                value={formatAbsoluteTime(mirror.lastSuccess)}
                color="success.main"
              />
            </Grid>

            <Grid size={{ xs: 6, md: 3 }} sx={{ display: 'flex' }}>
              <TimeCard
                icon={<ScheduleIcon fontSize="small" />}
                label={'下次同步'}
                value={formatAbsoluteTime(mirror.nextScheduled)}
                color="info.main"
              />
            </Grid>
          </>
        )}

        {/* 上游地址：同行第四列，单行截断 + hover Tooltip */}
        <Grid size={hasSyncSchedule ? { xs: 6, md: 3 } : { xs: 12 }} sx={{ display: 'flex' }}>
          <UpstreamCard label={'上游源'} value={mirror.upstream || '-'} />
        </Grid>

        {/* 存储方式告知条 */}
        {mirror.storageType !== 'local' && (
          <Grid size={{ xs: 12 }}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2,
                borderColor: 'info.main',
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark'
                    ? alpha(theme.palette.info.main, 0.1)
                    : alpha(theme.palette.info.light, 0.1),
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <InfoIcon color="info" sx={{ flexShrink: 0 }} />
              <Typography
                variant="body2"
                sx={{
                  color: 'info.dark',
                  fontWeight: 500,
                }}
              >
                {`本仓库存储方式为：${storageTypeMap[mirror.storageType]}`}
              </Typography>
            </Paper>
          </Grid>
        )}
        {/* 消息提示条 */}
        {mirror.message !== '' && (
          <Grid size={{ xs: 12 }}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2,
                borderColor: 'error.main',
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(239,68,68,0.08)' : 'rgba(254,242,242,1)',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <ErrorIcon color="error" sx={{ flexShrink: 0 }} />
              <Typography
                variant="body2"
                sx={{
                  color: 'error.dark',
                  fontWeight: 500,
                }}
              >
                {mirror.message}
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default SyncTimeline;
