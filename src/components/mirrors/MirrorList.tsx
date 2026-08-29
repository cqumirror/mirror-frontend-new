// src/components/mirrors/MirrorList.tsx
// 镜像列表组件 - 按字母A-Z分组展示

import {
  InfoOutlined as HelpInfoIcon,
  Info as StorageInfoIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Skeleton,
  Alert,
  Button,
  Tooltip,
  IconButton,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { storageTypeMap } from '@/components/mirrors/StatusChip';
import { useMirrorSearchStore, useFavoriteStore } from '@/stores/mirrorStore.ts';
import type { GroupedMirrors } from '@/types';
import { formatRelativeTime } from '@/utils/time.ts';

import StatusChip from './StatusChip';

interface MirrorListProps {
  grouped: GroupedMirrors;
  loading?: boolean;
  error?: string;
}

// ── 关键词高亮辅助组件 ─────────────────────────────────────────────────────────
const Highlight: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query.trim()) return <>{text}</>;
  const q = query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  while (remaining.length > 0) {
    const idx = remaining.toLowerCase().indexOf(q);
    if (idx === -1) {
      parts.push(remaining);
      break;
    }
    if (idx > 0) parts.push(remaining.slice(0, idx));
    parts.push(
      <Box
        key={key++}
        component="mark"
        sx={{
          bgcolor: 'warning.light',
          color: 'warning.contrastText',
          borderRadius: '2px',
          px: '1px',
          fontWeight: 700,
        }}
      >
        {remaining.slice(idx, idx + q.length)}
      </Box>
    );
    remaining = remaining.slice(idx + q.length);
  }
  return <>{parts}</>;
};

const MirrorList: React.FC<MirrorListProps> = React.memo(({ grouped, loading, error }) => {
  const navigate = useNavigate();
  const { searchQuery } = useMirrorSearchStore();
  const { favorites, toggleFavorite } = useFavoriteStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (loading) {
    return (
      <Box>
        {[...Array(3)].map((_, i) => (
          <Box key={i} sx={{ mb: 3 }}>
            <Skeleton variant="text" width={40} height={32} sx={{ mb: 1 }} />
            <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 1 }} />
          </Box>
        ))}
      </Box>
    );
  }

  if (error)
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );

  const letters = Object.keys(grouped).sort();
  if (letters.length === 0) return <Alert severity="info">{'未找到匹配的镜像'}</Alert>;

  return (
    <Box>
      {letters.map((letter) => (
        <Box key={letter} sx={{ mb: 4 }} id={`group-${letter}`}>
          {/* 字母索引标题 */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, gap: 1.5 }}>
            <Typography
              variant="h5"
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontWeight: 800,
                color: 'primary.main',
                lineHeight: 1,
                fontSize: '1.4rem',
                minWidth: 32,
              }}
            >
              {letter}
            </Typography>
            <Box sx={{ flex: 1, height: 1, bgcolor: 'divider' }} />
          </Box>

          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{ borderRadius: 2, overflow: 'hidden' }}
          >
            <Table
              size="small"
              aria-label={`${letter} 组镜像列表`}
              sx={{ tableLayout: 'fixed', width: '100%' }}
            >
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell
                    scope="col"
                    sx={{ fontWeight: 700, width: { xs: '38%', sm: '20%', md: '18%' } }}
                  >
                    {'镜像名称'}
                  </TableCell>
                  <TableCell
                    scope="col"
                    sx={{
                      fontWeight: 700,
                      width: '30%',
                      display: { xs: 'none', sm: 'table-cell' },
                    }}
                  >
                    {'描述'}
                  </TableCell>
                  <TableCell
                    scope="col"
                    align="center"
                    sx={{ fontWeight: 700, width: { xs: '18%', sm: '12%', md: '10%' } }}
                  >
                    {'存储大小'}
                  </TableCell>
                  <TableCell
                    scope="col"
                    align="center"
                    sx={{
                      fontWeight: 700,
                      width: { xs: '14%', sm: '20%', md: '14%' },
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {'状态'}
                  </TableCell>
                  <TableCell
                    scope="col"
                    align="center"
                    sx={{
                      fontWeight: 700,
                      width: '18%',
                      display: { xs: 'none', md: 'table-cell' },
                    }}
                  >
                    {'最后更新'}
                  </TableCell>
                  {/* 收藏 + 帮助列合并为操作列 */}
                  <TableCell
                    scope="col"
                    align="center"
                    sx={{ fontWeight: 700, width: { xs: '18%', sm: '16%', md: '12%' } }}
                  >
                    {'操作'}
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {grouped[letter].map((mirror) => {
                  const starred = favorites.includes(mirror.id);
                  return (
                    <TableRow
                      key={mirror.id}
                      hover
                      onClick={() => navigate(`/mirrors/${mirror.id}`)}
                      sx={{
                        cursor: 'pointer',
                        '&:last-child td': { border: 0 },
                        transition: 'background-color 0.15s',
                      }}
                      aria-label={`查看 ${mirror.name} 详情`}
                    >
                      {/* 镜像名称（带高亮） */}
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.88rem' }}
                        >
                          <Highlight text={mirror.name} query={searchQuery} />
                        </Typography>
                      </TableCell>
                      {/* 描述（带高亮） */}
                      <TableCell
                        sx={{ display: { xs: 'none', sm: 'table-cell' }, color: 'text.secondary' }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          <Highlight text={mirror.desc} query={searchQuery} />
                        </Typography>
                      </TableCell>
                      {/* 大小 */}
                      <TableCell align="center">
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'text.secondary',
                            fontWeight: 500,
                          }}
                        >
                          {mirror.size || '-'}
                        </Typography>
                      </TableCell>
                      {/* 状态 */}
                      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                        <StatusChip status={mirror.status} size="small" iconOnly={isMobile} />
                      </TableCell>
                      {/* 最后更新 */}
                      <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'text.secondary',
                          }}
                        >
                          {formatRelativeTime(mirror.lastUpdated)}
                        </Typography>
                      </TableCell>
                      {/* 收藏 + 帮助 */}
                      <TableCell
                        align="center"
                        onClick={(e) => e.stopPropagation()}
                        sx={{ px: { xs: 0.25, sm: 1 }, py: 0.5, verticalAlign: 'middle' }}
                      >
                        <Box
                          sx={{
                            display: { xs: 'grid', sm: 'flex' },
                            gridTemplateColumns: { xs: 'repeat(2, 28px)', sm: 'none' },
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: { xs: 0.25, sm: 0.2 },
                            flexWrap: 'nowrap',
                            minHeight: 32,
                            lineHeight: 0,
                          }}
                        >
                          {/* 收藏按钮 */}
                          <Tooltip title={starred ? '取消收藏' : '收藏'} placement="top">
                            <IconButton
                              size="small"
                              sx={{
                                p: 0,
                                width: 28,
                                height: 28,
                                color: starred ? 'warning.main' : 'text.disabled',
                                '&:hover': { color: 'warning.main' },
                                transition: 'color 0.15s',
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(mirror.id);
                              }}
                              aria-label={starred ? '取消收藏' : '收藏'}
                            >
                              {starred ? (
                                <StarIcon sx={{ display: 'block', fontSize: 18 }} />
                              ) : (
                                <StarBorderIcon sx={{ display: 'block', fontSize: 18 }} />
                              )}
                            </IconButton>
                          </Tooltip>

                          {/* 帮助按钮 */}
                          <Button
                            size="small"
                            variant="text"
                            sx={{
                              fontSize: '0.75rem',
                              p: '2px 6px',
                              minWidth: 0,
                              display: { xs: 'none', sm: 'inline-flex' },
                              whiteSpace: 'nowrap',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/mirrors/${mirror.id}?tab=help`);
                            }}
                          >
                            {'使用帮助'}
                          </Button>
                          <Tooltip title={'使用帮助'} placement="left">
                            <IconButton
                              size="small"
                              color="primary"
                              sx={{
                                display: { xs: 'inline-flex', sm: 'none' },
                                p: 0,
                                width: 28,
                                height: 28,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/mirrors/${mirror.id}?tab=help`);
                              }}
                              aria-label={'使用帮助'}
                            >
                              <HelpInfoIcon sx={{ display: 'block', fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                          {/*显示存储信息*/}
                          <Tooltip
                            title={
                              mirror.storageType !== 'local'
                                ? storageTypeMap[mirror.storageType] || '未知存储类型'
                                : ''
                            }
                            placement="top"
                            disableHoverListener={mirror.storageType === 'local'}
                          >
                            <IconButton
                              size="small"
                              disableRipple={mirror.storageType === 'local'}
                              sx={{
                                p: 0,
                                width: 28,
                                height: 28,
                                color:
                                  mirror.storageType === 'local' ? 'text.disabled' : 'warning.main',
                                transition: 'color 0.15s',
                                display: { xs: 'none', sm: 'inline-flex' },
                                ...(mirror.storageType === 'local'
                                  ? {
                                      '&:hover': {
                                        backgroundColor: 'transparent',
                                        color: 'text.disabled',
                                      },
                                      pointerEvents: 'none',
                                      cursor: 'default',
                                    }
                                  : {
                                      '&:hover': { color: 'warning.main' },
                                    }),
                              }}
                            >
                              {mirror.storageType !== 'local' ? (
                                <StorageInfoIcon sx={{ display: 'block', fontSize: 18 }} />
                              ) : (
                                <div style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
                              )}
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ))}
    </Box>
  );
});

export default MirrorList;
