import { Search as SearchIcon, Storage as StorageIcon } from '@mui/icons-material';
import {
  Alert,
  Box,
  Container,
  Grid,
  InputAdornment,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import React, { useMemo, useState } from 'react';

import ItemCard from '@/components/items/ItemCard';
import DistroLogo from '@/components/mirrors/DistroLogo';
import StatusChip from '@/components/mirrors/StatusChip';
import { useMirrorDetail } from '@/hooks/useMirrors';
import { useRelease } from '@/hooks/useRelease';
import { canonicalUrl } from '@/utils/seo';
import { formatRelativeTime } from '@/utils/time';

const ReleaseList: React.FC = () => {
  const [query, setQuery] = useState('');
  const { data: releases = [], isLoading } = useRelease();
  const { data: releaseMirror, isLoading: mirrorLoading } = useMirrorDetail('github-release');
  const filtered = useMemo(() => {
    const keywords = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (keywords.length === 0) return releases;
    return releases.filter((release) => {
      const text = `${release.name} ${release.org}/${release.repo} ${release.desc}`.toLowerCase();
      return keywords.every((keyword) => text.includes(keyword));
    });
  }, [query, releases]);

  return (
    <>
      <title>GitHub Releases - CQU Mirror</title>
      <meta
        name="description"
        content="浏览重庆大学开源软件镜像站收录的全部 GitHub Release 项目。"
      />
      <link rel="canonical" href={canonicalUrl('/release')} />

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" sx={{ fontSize: { xs: '2rem', md: '2.6rem' }, fontWeight: 800 }}>
            GitHub Releases
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1, mb: 2.5 }}>
            浏览本站收录的软件发行包与字体文件，点击项目查看版本、帮助文档和下载地址。
          </Typography>
          {mirrorLoading ? (
            <Skeleton variant="rounded" height={86} sx={{ mb: 2.5 }} />
          ) : releaseMirror ? (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2.5 }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{ alignItems: { sm: 'center' } }}
              >
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flex: 1 }}>
                  <DistroLogo id="github-release" size={32} />
                  <Box>
                    <Typography sx={{ fontWeight: 750 }}>{releaseMirror.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {releaseMirror.desc}
                    </Typography>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <StatusChip status={releaseMirror.status} />
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                    <StorageIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {releaseMirror.size || '-'}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    更新于 {formatRelativeTime(releaseMirror.lastUpdated)}
                  </Typography>
                </Stack>
              </Stack>
            </Paper>
          ) : null}
          <TextField
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索名称、组织或仓库…"
            size="small"
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
              htmlInput: { 'aria-label': '搜索 GitHub Release' },
            }}
            sx={{ maxWidth: 520 }}
          />
        </Box>

        {isLoading ? (
          <Grid container spacing={2}>
            {[...Array(8)].map((_, index) => (
              <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
                <Skeleton variant="rounded" height={160} />
              </Grid>
            ))}
          </Grid>
        ) : filtered.length === 0 ? (
          <Alert severity="info">未找到匹配的 GitHub Release 项目。</Alert>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              共 {filtered.length} 个项目
            </Typography>
            <Grid container spacing={2}>
              {filtered.map((release) => (
                <Grid key={`${release.org}/${release.repo}`} size={{ xs: 12, sm: 6, md: 3 }}>
                  <ItemCard kind="release" release={release} />
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </Container>
    </>
  );
};

export default ReleaseList;
