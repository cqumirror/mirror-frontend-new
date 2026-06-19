// src/components/mirrors/DownloadModal.tsx
// 镜像下载弹窗

import AlbumIcon from '@mui/icons-material/Album';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import GitHubIcon from '@mui/icons-material/GitHub';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import React, { useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { sanitizeUrl } from '@/utils/url';

import { useMirrors } from '../../hooks/useMirrors';
import { useLocaleStore } from '../../stores/mirrorStore';

import DistroLogo from './DistroLogo';
// 根据文件 URL 后缀返回合适的图标
function getFileIcon(url: string): React.ReactNode {
  const ext = url.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'iso' || ext === 'img') return <AlbumIcon sx={{ fontSize: 18 }} />;
  return <InsertDriveFileIcon sx={{ fontSize: 18 }} />;
}

// GitHub 项目头像：尝试加载 org avatar，失败则用 GitHub 图标
const GithubProjectAvatar: React.FC<{ project: string }> = React.memo(({ project }) => {
  const org = project.split('/')[0];
  const [error, setError] = useState(false);
  const handleError = useCallback(() => setError(true), []);

  if (error || !org) {
    return <GitHubIcon sx={{ fontSize: 20, color: 'text.secondary' }} />;
  }

  return (
    <Box
      component="img"
      src={`https://github.com/${org}.png?size=40`}
      alt={project}
      loading="lazy"
      onError={handleError}
      sx={{
        width: 20,
        height: 20,
        borderRadius: 0.5,
        objectFit: 'cover',
      }}
    />
  );
});
GithubProjectAvatar.displayName = 'GithubProjectAvatar';

// 从 GitHub Release URL 中提取项目名（org/repo）
// 例: "/github-release/OWNER/REPO/releases/download/v1.0/file.zip" → "OWNER/REPO"
function extractGithubProject(url: string): string {
  const parts = url.split('/').filter(Boolean);
  // github-release/OWNER/REPO/...
  const ghIdx = parts.indexOf('github-release');
  if (ghIdx >= 0 && parts.length > ghIdx + 2) {
    return `${parts[ghIdx + 1]}/${parts[ghIdx + 2]}`;
  }
  return 'Other';
}

// 从文件名中提取版本号数组，用于降序排序（最新版本在最前）
// 例："24.04.4 desktop amd64" → [24, 4, 4]
//     "8-latest x86_64 Rocky Dvd" → [8]
//     "latest" → []
function extractVersion(name: string): number[] {
  const m = name.match(/^[\d]+(?:[.-][\d]+)*/);
  if (!m) return [];
  return m[0]
    .split(/[.-]/)
    .map(Number)
    .filter((n) => !isNaN(n));
}

function compareVersionDesc(a: string, b: string): number {
  const va = extractVersion(a);
  const vb = extractVersion(b);
  // 无版本号的排到最后
  if (va.length === 0 && vb.length === 0) return 0;
  if (va.length === 0) return 1;
  if (vb.length === 0) return -1;
  for (let i = 0; i < Math.max(va.length, vb.length); i++) {
    const diff = (vb[i] ?? 0) - (va[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function sortFiles<T extends { name: string }>(files: T[]): T[] {
  return [...files].sort((a, b) => compareVersionDesc(a.name, b.name));
}

interface DownloadModalProps {
  open: boolean;
  onClose: () => void;
}

const DownloadModal: React.FC<DownloadModalProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const { locale } = useLocaleStore();
  const { data: mirrors = [] } = useMirrors();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const distros = useMemo(() => mirrors.filter((m) => m.files && m.files.length > 0), [mirrors]);

  const filtered = useMemo(() => {
    if (!search.trim()) return distros;
    const q = search.toLowerCase();
    return distros.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        m.name.zh.toLowerCase().includes(q) ||
        m.name.en.toLowerCase().includes(q)
    );
  }, [distros, search]);

  const activeId = selectedId ?? filtered[0]?.id ?? null;
  const activeMirror = useMemo(
    () => distros.find((m) => m.id === activeId) ?? null,
    [distros, activeId]
  );

  const handleClose = () => {
    setSearch('');
    setSelectedId(null);
    setSelectedProject(null);
    onClose();
  };

  // 切换镜像时重置子项目选择
  const handleSelectDistro = (id: string) => {
    setSelectedId(id);
    setSelectedProject(null);
  };

  // GitHub Release 按项目分组
  const groupedGithubFiles = useMemo(() => {
    if (!activeMirror || activeMirror.id !== 'github-release') return null;
    const groups: Record<string, typeof activeMirror.files> = {};
    for (const file of activeMirror.files) {
      const project = extractGithubProject(file.url);
      if (!groups[project]) groups[project] = [];
      groups[project].push(file);
    }
    for (const key of Object.keys(groups)) {
      groups[key] = sortFiles(groups[key]);
    }
    return groups;
  }, [activeMirror]);

  // GitHub Release 子项目列表（按文件数降序）
  const projectList = useMemo(() => {
    if (!groupedGithubFiles) return [];
    return Object.entries(groupedGithubFiles)
      .map(([name, files]) => ({ name, count: files.length, files }))
      .sort((a, b) => b.count - a.count);
  }, [groupedGithubFiles]);

  // 当前选中的子项目文件
  const activeProjectFiles = useMemo(() => {
    if (!groupedGithubFiles || !selectedProject) return null;
    return groupedGithubFiles[selectedProject] ?? null;
  }, [groupedGithubFiles, selectedProject]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullScreen={fullScreen}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: fullScreen ? 0 : 3,
            overflow: 'hidden',
            height: fullScreen ? '100%' : 600,
          },
        },
      }}
    >
      {/* 标题栏 */}
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 1.5,
          px: 2.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DownloadIcon color="primary" />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
            }}
          >
            {t('download.title')}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              ml: 0.5,
            }}
          >
            {t('download.distroCount', { count: distros.length })}
          </Typography>
        </Box>
        <IconButton size="small" onClick={handleClose} aria-label="关闭">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0, display: 'flex', overflow: 'hidden', flex: 1 }}>
        {/* 左栏：发行版列表 */}
        <Box
          sx={{
            width: { xs: '44%', sm: 210 },
            flexShrink: 0,
            borderRight: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ p: 1.5, flexShrink: 0 }}>
            <TextField
              size="small"
              fullWidth
              placeholder={t('download.search')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedId(null);
                setSelectedProject(null);
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  sx: { fontSize: '0.85rem', borderRadius: 2 },
                },
              }}
            />
          </Box>
          <Divider />

          <List dense disablePadding sx={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                  }}
                >
                  {t('search.noResults')}
                </Typography>
              </Box>
            ) : (
              filtered.map((m) => {
                const isActive = m.id === activeId;
                return (
                  <ListItemButton
                    key={m.id}
                    selected={isActive}
                    onClick={() => handleSelectDistro(m.id)}
                    sx={{
                      py: 1,
                      px: 1.5,
                      borderLeft: '3px solid',
                      borderColor: isActive ? 'primary.main' : 'transparent',
                      '&.Mui-selected': {
                        bgcolor: 'action.selected',
                        '&:hover': { bgcolor: 'action.selected' },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 34 }}>
                      <DistroLogo id={m.id} size={20} />
                    </ListItemIcon>
                    <ListItemText
                      primary={m.name[locale]}
                      secondary={t('download.fileCount', { count: m.files.length })}
                      slotProps={{
                        primary: {
                          variant: 'body2',
                          noWrap: true,
                          sx: {
                            fontWeight: isActive ? 700 : 500,
                            fontSize: '0.85rem',
                          },
                        },

                        secondary: { sx: { fontSize: '0.72rem' } },
                      }}
                    />
                  </ListItemButton>
                );
              })
            )}
          </List>
        </Box>

        {/* 右栏：文件列表 */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {activeMirror ? (
            <>
              {/* 右栏标题 */}
              <Box
                sx={{
                  px: 2.5,
                  py: 1.5,
                  flexShrink: 0,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'action.hover',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <DistroLogo id={activeMirror.id} size={30} />
                <Box>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 700,
                      lineHeight: 1.2,
                    }}
                  >
                    {activeMirror.name[locale]}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                    }}
                  >
                    {activeMirror.desc[locale]}
                  </Typography>
                </Box>
              </Box>

              {/* 文件列表 */}
              <Box sx={{ overflowY: 'auto', flex: 1, px: 1, py: 0.5 }}>
                {groupedGithubFiles ? (
                  // GitHub Release：两级导航
                  selectedProject && activeProjectFiles ? (
                    // 二级：显示子项目文件
                    <>
                      <ListItemButton
                        onClick={() => setSelectedProject(null)}
                        sx={{
                          borderRadius: 1.5,
                          px: 1.5,
                          py: 0.6,
                          mb: 0.5,
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        <ChevronLeftIcon sx={{ fontSize: 18, mr: 0.5, color: 'text.secondary' }} />
                        <ListItemText
                          primary={selectedProject}
                          secondary={t('download.fileCount', { count: activeProjectFiles.length })}
                          slotProps={{
                            primary: { variant: 'body2', sx: { fontWeight: 700 } },
                            secondary: { sx: { fontSize: '0.72rem' } },
                          }}
                        />
                      </ListItemButton>
                      <Divider sx={{ mb: 0.5 }} />
                      <List dense disablePadding>
                        {activeProjectFiles.map((file, idx, arr) => (
                          <React.Fragment key={file.url || idx}>
                            <ListItemButton
                              component="a"
                              href={sanitizeUrl(file.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{
                                borderRadius: 1.5,
                                px: 1.5,
                                py: 0.8,
                                my: 0.3,
                                alignItems: 'center',
                                '&:hover .dl-icon': { opacity: 1 },
                              }}
                            >
                              <ListItemIcon
                                sx={{ minWidth: 32, color: 'primary.main', alignSelf: 'center' }}
                              >
                                {getFileIcon(file.url)}
                              </ListItemIcon>
                              <Tooltip title={file.name} placement="top" enterDelay={600}>
                                <ListItemText
                                  primary={file.name}
                                  secondary={
                                    <Typography
                                      component="span"
                                      variant="caption"
                                      sx={{
                                        color: 'text.secondary',
                                        display: { xs: 'none', sm: 'block' },
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {file.url}
                                    </Typography>
                                  }
                                  slotProps={{
                                    primary: {
                                      variant: 'body2',
                                      noWrap: true,
                                      sx: { fontWeight: 500 },
                                    },
                                  }}
                                />
                              </Tooltip>
                              <Tooltip title={t('common.download')} placement="left">
                                <DownloadIcon
                                  className="dl-icon"
                                  sx={{
                                    fontSize: 18,
                                    color: 'primary.main',
                                    opacity: 0.4,
                                    transition: 'opacity 0.15s',
                                    flexShrink: 0,
                                    ml: 1,
                                  }}
                                />
                              </Tooltip>
                            </ListItemButton>
                            {idx < arr.length - 1 && <Divider sx={{ mx: 1.5 }} />}
                          </React.Fragment>
                        ))}
                      </List>
                    </>
                  ) : (
                    // 一级：显示子项目列表
                    <List dense disablePadding>
                      {projectList.map((proj) => (
                        <ListItemButton
                          key={proj.name}
                          onClick={() => setSelectedProject(proj.name)}
                          sx={{
                            borderRadius: 1.5,
                            px: 1.5,
                            py: 1,
                            my: 0.3,
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 32, alignSelf: 'center' }}>
                            <GithubProjectAvatar project={proj.name} />
                          </ListItemIcon>
                          <ListItemText
                            primary={proj.name}
                            secondary={t('download.fileCount', { count: proj.count })}
                            slotProps={{
                              primary: {
                                variant: 'body2',
                                noWrap: true,
                                sx: { fontWeight: 600 },
                              },
                              secondary: { sx: { fontSize: '0.72rem' } },
                            }}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  )
                ) : (
                  // 普通镜像：平铺显示
                  <List dense disablePadding>
                    {sortFiles(activeMirror.files).map((file, idx, arr) => (
                      <React.Fragment key={file.url || idx}>
                        <ListItemButton
                          component="a"
                          href={sanitizeUrl(file.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            borderRadius: 1.5,
                            px: 1.5,
                            py: 0.8,
                            my: 0.3,
                            alignItems: 'center',
                            '&:hover .dl-icon': { opacity: 1 },
                          }}
                        >
                          <ListItemIcon
                            sx={{ minWidth: 32, color: 'primary.main', alignSelf: 'center' }}
                          >
                            {getFileIcon(file.url)}
                          </ListItemIcon>
                          <Tooltip title={file.name} placement="top" enterDelay={600}>
                            <ListItemText
                              primary={file.name}
                              secondary={
                                <Typography
                                  component="span"
                                  variant="caption"
                                  sx={{
                                    color: 'text.secondary',
                                    display: { xs: 'none', sm: 'block' },
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {file.url}
                                </Typography>
                              }
                              slotProps={{
                                primary: {
                                  variant: 'body2',
                                  noWrap: true,
                                  sx: { fontWeight: 500 },
                                },
                              }}
                            />
                          </Tooltip>
                          <Tooltip title={t('common.download')} placement="left">
                            <DownloadIcon
                              className="dl-icon"
                              sx={{
                                fontSize: 18,
                                color: 'primary.main',
                                opacity: 0.4,
                                transition: 'opacity 0.15s',
                                flexShrink: 0,
                                ml: 1,
                              }}
                            />
                          </Tooltip>
                        </ListItemButton>
                        {idx < arr.length - 1 && <Divider sx={{ mx: 1.5 }} />}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </Box>
            </>
          ) : (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                }}
              >
                {t('download.selectDistro')}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default DownloadModal;
