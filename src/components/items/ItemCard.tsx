// src/components/mirrors/MirrorCard.tsx
// 镜像卡片组件 - 首页展示用

import { Storage as StorageIcon, Tag as TagIcon } from '@mui/icons-material';
import { Card, CardContent, CardActionArea, Typography, Box, Tooltip, Chip } from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import ReleaseLogo from '@/components/releases/ReleaseLogo.tsx';
import type { Mirror, ReleaseManifest } from '@/types';
import { formatRelativeTime } from '@/utils/time.ts';

import DistroLogo from '../mirrors/DistroLogo.tsx';
import StatusChip from '../mirrors/StatusChip.tsx';

type ItemCardProps =
  | { kind: 'mirror'; mirror: Mirror }
  | { kind: 'release'; release: ReleaseManifest };

const ItemCard: React.FC<ItemCardProps> = React.memo((props) => {
  const navigate = useNavigate();
  const card =
    props.kind === 'release'
      ? {
          path: `/release/${props.release.org}/${props.release.repo}`,
          logo: (
            <ReleaseLogo avatarUrl={props.release.avatar_url} name={props.release.name} size={20} />
          ),
          title: props.release.name,
          status: <Chip label="Release" size="small" variant="outlined" />,
          desc: props.release.desc || '暂无介绍',
          metric: props.release.latest?.version || '-',
          metricLabel: '最新版本',
          metricIcon: <TagIcon sx={{ fontSize: 14 }} />,
          updated: props.release.releases.find((item) => item.tag === props.release.latest?.tag)
            ?.published_at,
        }
      : {
          path: `/mirrors/${props.mirror.id}`,
          logo: <DistroLogo id={props.mirror.id} size={20} />,
          title: props.mirror.name,
          status: <StatusChip status={props.mirror.status} size="small" />,
          desc: props.mirror.desc,
          metric: props.mirror.size || '-',
          metricLabel: '存储大小',
          metricIcon: <StorageIcon sx={{ fontSize: 14 }} />,
          updated: props.mirror.lastUpdated,
        };
  const lastUpdatedText = formatRelativeTime(card.updated);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }} role="article">
      <CardActionArea
        onClick={() => navigate(card.path)}
        sx={{ flexGrow: 1, alignItems: 'flex-start', display: 'flex', flexDirection: 'column' }}
      >
        <CardContent sx={{ width: '100%', p: 2.5 }}>
          {/* Logo + 名称 + 状态 */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              mb: 1,
              gap: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
              {card.logo}

              <Typography
                variant="h6"
                sx={{ fontSize: '1rem', fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}
              >
                {card.title}
              </Typography>
            </Box>
            {card.status}
          </Box>

          {/* 描述 */}
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              mb: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.5,
              minHeight: '3em',
            }}
          >
            {card.desc}
          </Typography>

          {/* 底部：大小 + 更新时间 */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              pt: 1,
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Tooltip title={card.metricLabel} placement="bottom">
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}
              >
                {card.metricIcon}
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 500,
                  }}
                >
                  {card.metric}
                </Typography>
              </Box>
            </Tooltip>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
              }}
            >
              {lastUpdatedText}
            </Typography>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
});

export default ItemCard;
