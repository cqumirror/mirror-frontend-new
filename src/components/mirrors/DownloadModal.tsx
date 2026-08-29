import {
  Album as AlbumIcon,
  ArrowBack as BackIcon,
  Close as CloseIcon,
  Download as DownloadIcon,
  InsertDriveFile as FileIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
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
import React, { useMemo, useState } from 'react';

import ReleaseLogo from '@/components/releases/ReleaseLogo';
import { useIsoInfo, useRelease } from '@/hooks/useRelease';
import type { MirrorFile, ReleaseManifest } from '@/types';
import { sanitizeUrl } from '@/utils/url';

import DistroLogo from './DistroLogo';

type DownloadCategory = 'os' | 'app' | 'font';

interface DownloadItem {
  id: string;
  name: string;
  description: string;
  category: DownloadCategory;
  mirrorId: string;
  release: ReleaseManifest | null;
  files: MirrorFile[];
}

const CATEGORIES: Array<{
  id: DownloadCategory;
  label: string;
}> = [
  { id: 'os', label: '系统' },
  { id: 'app', label: '应用' },
  { id: 'font', label: '字体' },
];

const pathParts = (url: string): string[] =>
  url
    .split(/[?#]/, 1)[0]
    .split('/')
    .filter(Boolean)
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    });

function compareVersionDesc(left: MirrorFile, right: MirrorFile): number {
  const version = (name: string): number[] =>
    (name.match(/\d+(?:[.-]\d+)*/)?.[0] ?? '').split(/[.-]/).map(Number).filter(Number.isFinite);
  const a = version(left.name);
  const b = version(right.name);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (b[index] ?? 0) - (a[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return left.name.localeCompare(right.name);
}

function fileIcon(url: string): React.ReactNode {
  const extension = url.split('.').pop()?.toLowerCase();
  return extension === 'iso' || extension === 'img' ? (
    <AlbumIcon sx={{ fontSize: 18 }} />
  ) : (
    <FileIcon sx={{ fontSize: 18 }} />
  );
}

interface DownloadModalProps {
  open: boolean;
  onClose: () => void;
}

const DownloadModal: React.FC<DownloadModalProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { data: isoEntries = [] } = useIsoInfo();
  const { data: releases = [] } = useRelease();
  const [category, setCategory] = useState<DownloadCategory>('os');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [mobileStep, setMobileStep] = useState<'items' | 'files'>('items');

  const items = useMemo<DownloadItem[]>(() => {
    const releaseMap = new Map(
      releases.map((release) => [`${release.org}/${release.repo}`.toLowerCase(), release])
    );

    return isoEntries.flatMap((entry, index) => {
      if (!CATEGORIES.some((item) => item.id === entry.category)) return [];
      const parts = pathParts(entry.urls[0]?.url ?? '');
      const isGithubRelease = parts[0]?.toLowerCase() === 'github-release';
      const releaseKey = isGithubRelease && parts[1] && parts[2] ? `${parts[1]}/${parts[2]}` : '';
      const release = releaseKey ? (releaseMap.get(releaseKey.toLowerCase()) ?? null) : null;
      const mirrorId = parts[0] ?? entry.distro;
      return [
        {
          id: `${entry.category}:${releaseKey || mirrorId}:${entry.distro}:${index}`,
          name: release?.name || entry.distro,
          description: release?.desc || `${entry.urls.length} 个可下载文件`,
          category: entry.category as DownloadCategory,
          mirrorId,
          release,
          files: [...entry.urls].sort(compareVersionDesc),
        },
      ];
    });
  }, [isoEntries, releases]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter(
      (item) =>
        item.category === category &&
        (!query ||
          item.name.toLowerCase().includes(query) ||
          item.release?.repo.toLowerCase().includes(query))
    );
  }, [category, items, search]);

  const activeId = filtered.some((item) => item.id === selectedId) ? selectedId : filtered[0]?.id;
  const activeItem = items.find((item) => item.id === activeId) ?? null;

  const handleClose = () => {
    setSearch('');
    setSelectedId(null);
    setMobileStep('items');
    onClose();
  };

  const itemLogo = (item: DownloadItem, size: number) =>
    item.release ? (
      <ReleaseLogo avatarUrl={item.release.avatar_url} name={item.release.name} size={size} />
    ) : (
      <DistroLogo id={item.mirrorId} size={size} />
    );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullScreen={isMobile}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: isMobile ? 0 : 3,
            overflow: 'hidden',
            height: isMobile ? '100%' : 640,
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 1.5,
          px: 2.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DownloadIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            常用下载
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: { xs: 'none', sm: 'block' } }}
          >
            共 {items.length} 个发行版
          </Typography>
        </Box>
        <IconButton size="small" onClick={handleClose} aria-label="关闭">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={{
          p: 0,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          overflow: 'hidden',
          flex: 1,
          minHeight: 0,
        }}
      >
        <Box
          sx={{
            width: { xs: '100%', sm: 48 },
            height: { xs: 50, sm: 'auto' },
            flexShrink: 0,
            borderRight: { sm: '1px solid' },
            borderBottom: { xs: '1px solid', sm: 0 },
            borderColor: 'divider',
            bgcolor: 'action.hover',
          }}
        >
          <List
            disablePadding
            sx={{ display: 'flex', flexDirection: { xs: 'row', sm: 'column' }, height: '100%' }}
            aria-label="下载分类"
          >
            {CATEGORIES.map((item) => (
              <ListItemButton
                key={item.id}
                selected={category === item.id}
                onClick={() => {
                  setCategory(item.id);
                  setSelectedId(null);
                  setSearch('');
                  setMobileStep('items');
                }}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  minHeight: 0,
                  justifyContent: 'center',
                  px: 0,
                  py: 0,
                  borderRight: { sm: '3px solid' },
                  borderBottom: { xs: '3px solid', sm: 0 },
                  borderColor: category === item.id ? 'primary.main' : 'transparent',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: category === item.id ? 750 : 500,
                    writingMode: { xs: 'horizontal-tb', sm: 'vertical-rl' },
                    letterSpacing: { sm: '0.18em' },
                  }}
                >
                  {item.label}
                </Typography>
              </ListItemButton>
            ))}
          </List>
        </Box>

        <Box
          sx={{
            width: { xs: '100%', sm: 240 },
            flex: { xs: 1, sm: '0 0 240px' },
            borderRight: { sm: '1px solid' },
            borderColor: 'divider',
            display: { xs: mobileStep === 'items' ? 'flex' : 'none', sm: 'flex' },
            flexDirection: 'column',
            overflow: 'hidden',
            minHeight: 0,
          }}
        >
          <Box sx={{ p: { xs: 1, sm: 1.5 } }}>
            <TextField
              size="small"
              fullWidth
              placeholder="搜索…"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setSelectedId(null);
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 16 }} />
                    </InputAdornment>
                  ),
                  sx: { fontSize: '0.82rem' },
                },
              }}
            />
          </Box>
          <Divider />
          <List
            dense
            disablePadding
            sx={{
              overflowY: 'auto',
              flex: 1,
              minHeight: 0,
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {filtered.map((item) => (
              <ListItemButton
                key={item.id}
                selected={item.id === activeId}
                onClick={() => {
                  setSelectedId(item.id);
                  setMobileStep('files');
                }}
                sx={{ py: 1, px: 1.25 }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>{itemLogo(item, 20)}</ListItemIcon>
                <ListItemText
                  primary={item.name}
                  secondary={`${item.files.length} 个文件`}
                  slotProps={{
                    primary: { noWrap: true, sx: { fontSize: '0.84rem', fontWeight: 650 } },
                    secondary: { sx: { fontSize: '0.7rem' } },
                  }}
                />
              </ListItemButton>
            ))}
          </List>
        </Box>

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: { xs: mobileStep === 'files' ? 'flex' : 'none', sm: 'flex' },
            flexDirection: 'column',
            overflow: 'hidden',
            minHeight: 0,
          }}
        >
          {activeItem ? (
            <>
              <Box
                sx={{
                  p: 1.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'action.hover',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                }}
              >
                <IconButton
                  size="small"
                  onClick={() => setMobileStep('items')}
                  aria-label="返回发行版列表"
                  sx={{ display: { xs: 'inline-flex', sm: 'none' }, flexShrink: 0 }}
                >
                  <BackIcon fontSize="small" />
                </IconButton>
                {itemLogo(activeItem, 30)}
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700 }}>{activeItem.name}</Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    noWrap
                    sx={{ display: 'block' }}
                  >
                    {activeItem.description}
                  </Typography>
                </Box>
              </Box>
              <List
                dense
                disablePadding
                sx={{
                  overflowY: 'auto',
                  flex: 1,
                  minHeight: 0,
                  px: 1,
                  overscrollBehavior: 'contain',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {activeItem.files.map((file, index) => (
                  <React.Fragment key={file.url}>
                    <ListItemButton
                      component="a"
                      href={sanitizeUrl(file.url)}
                      download
                      sx={{ borderRadius: 1.5, px: 1.25, py: 0.8, my: 0.3 }}
                    >
                      <ListItemIcon sx={{ minWidth: 30, color: 'primary.main' }}>
                        {fileIcon(file.url)}
                      </ListItemIcon>
                      <Tooltip title={file.name} placement="top" enterDelay={600}>
                        <ListItemText
                          primary={file.name}
                          secondary={
                            <Typography
                              component="span"
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: { xs: 'none', sm: 'block' } }}
                              noWrap
                            >
                              {file.url}
                            </Typography>
                          }
                          slotProps={{ primary: { noWrap: true, sx: { fontSize: '0.84rem' } } }}
                        />
                      </Tooltip>
                      <DownloadIcon sx={{ fontSize: 18, color: 'primary.main', ml: 0.5 }} />
                    </ListItemButton>
                    {index < activeItem.files.length - 1 && <Divider sx={{ mx: 1.5 }} />}
                  </React.Fragment>
                ))}
              </List>
            </>
          ) : (
            <Box sx={{ m: 'auto', p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                当前分类暂无匹配内容
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default DownloadModal;
