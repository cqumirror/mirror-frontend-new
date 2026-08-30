import {
  Check as CheckIcon,
  ContentCopy as CopyIcon,
  Home as HomeIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Container,
  Divider,
  Link,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';

interface ErrorPageProps {
  code?: number;
}

interface ErrorConfig {
  code: number;
  short: string;
  long: string;
  items: string[];
  contactMessage: string;
  links: Array<{ text: string; url: string }>;
}

const CONTACT_MESSAGE =
  '建议您稍后更换网络和下载工具重新尝试。\n若问题仍未解决，请通过“关于我们”页面中的联系方式反馈。';

const ERROR_CONFIG: Record<number, ErrorConfig> = {
  403: {
    code: 403,
    short: 'Forbidden',
    long: '哎呀，访问被挡了！',
    items: [
      '所使用的出口 IP 因滥用而被封禁；',
      '使用了不受支持的下载器或自动化脚本；',
      '访问的内容开启了访客限制。',
    ],
    contactMessage: CONTACT_MESSAGE,
    links: [
      { text: '查看公告', url: '/news/2023-03-27-ban-p2p-tools' },
      { text: '关于我们', url: '/about' },
      { text: '返回首页', url: '/' },
    ],
  },
  404: {
    code: 404,
    short: 'Not Found',
    long: '呜呜，页面不见了！',
    items: ['该仓库或页面已经被删除；', '输入了错误的 URL。'],
    contactMessage: '如果您已排除自身原因，或希望申请添加新的镜像源，请通过“关于我们”页面反馈。',
    links: [
      { text: '返回首页', url: '/' },
      { text: '关于我们', url: '/about' },
    ],
  },
  405: {
    code: 405,
    short: 'Method Not Allowed',
    long: '哦豁，这个请求方法不行哦！',
    items: ['当前地址不支持所使用的请求方法；', '下载工具发送了不受支持的请求。'],
    contactMessage: CONTACT_MESSAGE,
    links: [
      { text: '返回首页', url: '/' },
      { text: '关于我们', url: '/about' },
    ],
  },
  500: {
    code: 500,
    short: 'Internal Server Error',
    long: '哎呀，服务器出了点问题！',
    items: ['服务器发生了未知错误；', '服务正在更新或网络出现波动。'],
    contactMessage: CONTACT_MESSAGE,
    links: [
      { text: '同步状态', url: '/status' },
      { text: '关于我们', url: '/about' },
      { text: '返回首页', url: '/' },
    ],
  },
  502: {
    code: 502,
    short: 'Bad Gateway',
    long: '糟糕，上游服务暂时没有响应！',
    items: ['上游服务中断；', '网关或网络出现波动。'],
    contactMessage: CONTACT_MESSAGE,
    links: [
      { text: '同步状态', url: '/status' },
      { text: '关于我们', url: '/about' },
      { text: '返回首页', url: '/' },
    ],
  },
  503: {
    code: 503,
    short: 'Service Unavailable',
    long: '呜喵，服务暂不可用！',
    items: ['所使用的出口 IP 因滥用而被限制；', '访问速度过快触发了访问限制；', '服务正在维护。'],
    contactMessage: CONTACT_MESSAGE,
    links: [
      { text: '查看公告', url: '/news/2023-03-27-ban-p2p-tools' },
      { text: '同步状态', url: '/status' },
      { text: '返回首页', url: '/' },
    ],
  },
  504: {
    code: 504,
    short: 'Gateway Timeout',
    long: '连接超时，上游服务响应得太慢了！',
    items: ['上游服务响应超时；', '当前网络连接不稳定。'],
    contactMessage: CONTACT_MESSAGE,
    links: [
      { text: '同步状态', url: '/status' },
      { text: '关于我们', url: '/about' },
      { text: '返回首页', url: '/' },
    ],
  },
};

const FALLBACK_ERROR: ErrorConfig = {
  code: 404,
  short: 'Error',
  long: '哎呀，出了点小问题！',
  items: ['服务器发生了未知错误；', '网络出现波动。'],
  contactMessage: CONTACT_MESSAGE,
  links: [
    { text: '关于我们', url: '/about' },
    { text: '返回首页', url: '/' },
  ],
};

const REFRESHABLE_CODES = new Set([500, 502, 503, 504]);

const ErrorPage: React.FC<ErrorPageProps> = ({ code = 404 }) => {
  const [searchParams] = useSearchParams();
  const error = ERROR_CONFIG[code] ?? FALLBACK_ERROR;
  const dataParam = searchParams.get('data')?.slice(0, 20_000) ?? '';
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(async () => {
    if (!dataParam) return;
    try {
      await navigator.clipboard.writeText(dataParam);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // 浏览器拒绝剪贴板权限时保留可手动选择的文本。
    }
  }, [dataParam]);

  useEffect(
    () => () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    },
    []
  );

  return (
    <>
      <title>{`${error.code} ${error.short} - CQU Mirror`}</title>
      <meta name="robots" content="noindex, nofollow" />

      <Container maxWidth="sm" sx={{ py: { xs: 5, md: 8 } }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: { xs: '5rem', sm: '7rem' },
              lineHeight: 1,
              fontWeight: 900,
              color: 'primary.main',
            }}
          >
            {error.code}
          </Typography>

          <Typography variant="h4" sx={{ mt: 2, fontWeight: 800 }}>
            {error.short}
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mt: 0.75 }}>
            {error.long}
          </Typography>

          <Paper variant="outlined" sx={{ mt: 4, p: { xs: 2, sm: 3 }, textAlign: 'left' }}>
            <Typography sx={{ fontWeight: 750 }}>您可能遇到了这些问题：</Typography>
            <List disablePadding sx={{ mt: 1 }}>
              {error.items.map((item, index) => (
                <ListItem key={item} disableGutters sx={{ alignItems: 'flex-start', py: 0.5 }}>
                  <Typography color="primary.main" sx={{ mr: 1, fontWeight: 750 }}>
                    {index + 1}.
                  </Typography>
                  <ListItemText primary={item} sx={{ m: 0 }} />
                </ListItem>
              ))}
            </List>
          </Paper>

          <Typography
            color="text.secondary"
            sx={{ mt: 2.5, lineHeight: 1.8, whiteSpace: 'pre-line' }}
          >
            {error.contactMessage}
          </Typography>

          {dataParam && (
            <Paper variant="outlined" sx={{ position: 'relative', mt: 3, p: 2, textAlign: 'left' }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 750 }}>
                反馈时请提供下方错误信息：
              </Typography>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 1.5,
                  pr: 5,
                  maxHeight: 200,
                  overflow: 'auto',
                  bgcolor: 'action.hover',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.75rem',
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'anywhere',
                  userSelect: 'text',
                }}
              >
                {dataParam}
              </Box>
              <Tooltip title={copied ? '已复制' : '复制错误信息'}>
                <Button
                  aria-label="复制错误信息"
                  onClick={handleCopy}
                  sx={{ position: 'absolute', right: 20, bottom: 20, minWidth: 0, p: 0.75 }}
                >
                  {copied ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
                </Button>
              </Tooltip>
            </Paper>
          )}

          <Divider sx={{ my: 3 }} />

          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ justifyContent: 'center', flexWrap: 'wrap' }}
          >
            {error.links.map((link) => (
              <Link
                key={link.url}
                component={RouterLink}
                to={link.url}
                underline="hover"
                sx={{ px: 1, fontWeight: 650 }}
              >
                {link.text}
              </Link>
            ))}
          </Stack>

          <Stack direction="row" spacing={1.5} sx={{ mt: 3, justifyContent: 'center' }}>
            <Button component={RouterLink} to="/" variant="contained" startIcon={<HomeIcon />}>
              返回首页
            </Button>
            {REFRESHABLE_CODES.has(error.code) && (
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => window.location.reload()}
              >
                重新尝试
              </Button>
            )}
          </Stack>
        </Box>
      </Container>
    </>
  );
};

export default ErrorPage;
