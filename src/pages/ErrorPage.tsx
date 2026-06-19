// src/pages/ErrorPage.tsx
// 通用错误页面 —— 支持 403 / 404 / 500 / 502 / 503 等状态码
// 同时作为路由通配的 404 页面使用，合并了原 NotFound.tsx

import {
  Home as HomeIcon,
  Refresh as RefreshIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  Email as EmailIcon,
  GitHub as GitHubIcon,
} from '@mui/icons-material';
import { Box, Container, Typography, Button, Stack, Tooltip, Link } from '@mui/material';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface ErrorPageProps {
  code?: number;
}

/** 哪些错误码允许用户刷新重试 */
const REFRESHABLE_CODES = new Set([500, 502, 503]);

// ── 客户端指纹信息（从响应头读取，Nginx 需配置 add_header 才会有值）──
interface ClientInfo {
  realIp?: string;
  ja4Fingerprint?: string;
  ja3Fingerprint?: string;
}

// ── 主组件 ────────────────────────────────────────────────────────────────────
const ErrorPage: React.FC<ErrorPageProps> = ({ code = 404 }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // 尝试读取 error.title{code}，若该 key 不存在则降级为 titleDefault
  const titleKey = `error.title${code}`;
  const descKey = `error.desc${code}`;
  const title = t(titleKey, { defaultValue: '' }) || t('error.titleDefault');
  const desc = t(descKey, { defaultValue: '' }) || t('error.descDefault');
  const canRefresh = REFRESHABLE_CODES.has(code);

  // 客户端信息
  const [clientInfo, setClientInfo] = useState<ClientInfo>({});
  useEffect(() => {
    fetch('/api/getip', { cache: 'no-cache' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setClientInfo({
            realIp: data.remote_addr ?? undefined,
            ja4Fingerprint: data.ja4 ?? undefined,
            ja3Fingerprint: data.ja3 ?? undefined,
          });
        }
      })
      .catch(() => {});
  }, []);

  // 拼接原始信息并 base64 编码
  const rawInfo = [
    `HTTP ${code} — ${title}`,
    desc,
    `URL: ${window.location.href}`,
    clientInfo.realIp ? `addr: ${clientInfo.realIp}` : '',
    `ua: ${navigator.userAgent}`,
    clientInfo.ja4Fingerprint ? `JA4: ${clientInfo.ja4Fingerprint}` : '',
    clientInfo.ja3Fingerprint ? `JA3: ${clientInfo.ja3Fingerprint}` : '',
  ].filter(Boolean).join('\n');
  const encodedInfo = btoa(unescape(encodeURIComponent(rawInfo)));

  // 复制错误信息
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(encodedInfo);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      /* 静默忽略 */
    }
  }, [encodedInfo]);

  useEffect(() => () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); }, []);

  const pageTitle = `${code} - CQU Mirror`;

  return (
    <>
      <title>{pageTitle}</title>
      {/* 错误页不应被索引 */}
      <meta name="robots" content="noindex, nofollow" />
      <Container maxWidth="sm">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 'calc(100vh - 64px - 200px)',
            textAlign: 'center',
            py: 8,
            position: 'relative',
          }}
        >
          {/* 大号错误码水印 */}
          <Typography
            variant="h1"
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -60%)',
              fontSize: { xs: '10rem', md: '16rem' },
              fontWeight: 900,
              fontFamily: '"JetBrains Mono", monospace',
              color: 'primary.main',
              lineHeight: 1,
              opacity: 0.06,
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          >
            {code}
          </Typography>

          {/* Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center', mb: 3 }}>
            <img src="/favicon.svg" alt="CQU Mirror" style={{ width: 32, height: 32 }} />
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                fontSize: '1.2rem',
                fontFamily: '"JetBrains Mono", monospace',
                letterSpacing: '-0.02em',
              }}
            >
              CQU
              <Box component="span" sx={{ color: 'primary.main', fontWeight: 800 }}>
                Mirror
              </Box>
            </Typography>
          </Box>

          <Typography
            variant="h4"
            sx={{ fontWeight: 700, mb: 1.5 }}
          >
            {title}
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              mb: 3,
              maxWidth: 420,
              lineHeight: 1.7,
            }}
          >
            {desc}
          </Typography>

          {/* 错误信息块 —— 与 ErrorBoundary 风格一致 */}
          <Box sx={{ position: 'relative', width: '100%', maxWidth: 480, mb: 3 }}>
            <Box
              component="pre"
              sx={{
                p: 2,
                pr: 5,
                bgcolor: 'action.hover',
                borderRadius: 1,
                textAlign: 'left',
                overflow: 'auto',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.75rem',
                color: 'text.primary',
                border: '1px solid',
                borderColor: 'divider',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                userSelect: 'text',
              }}
            >
              {encodedInfo}
            </Box>
            <Tooltip title={copied ? '✓ Copied' : 'Copy'} placement="top" arrow>
              <Button
                size="small"
                onClick={handleCopy}
                sx={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  minWidth: 0,
                  p: 0.5,
                  color: 'text.secondary',
                  '&:hover': { bgcolor: 'action.selected' },
                }}
              >
                {copied ? <CheckIcon sx={{ fontSize: 16 }} /> : <CopyIcon sx={{ fontSize: 16 }} />}
              </Button>
            </Tooltip>
          </Box>

          <Stack
            direction="row"
            spacing={2}
            sx={{
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Button
              variant="contained"
              startIcon={<HomeIcon />}
              onClick={() => navigate('/')}
              size="large"
              sx={{ borderRadius: 6 }}
            >
              {t('error.backHome')}
            </Button>
            {canRefresh && (
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => window.location.reload()}
                size="large"
                sx={{ borderRadius: 6 }}
              >
                {t('error.refreshPage')}
              </Button>
            )}
          </Stack>

          {/* 联系方式 */}
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 4 }}>
            {t('error.contactHint')}
          </Typography>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EmailIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Link href="mailto:cqumirror@gmail.com" variant="body2" color="primary" underline="hover">
                cqumirror@gmail.com
              </Link>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <GitHubIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Link
                href="https://github.com/cqumirror/feedback"
                target="_blank"
                rel="noopener noreferrer"
                variant="body2"
                color="primary"
                underline="hover"
              >
                github.com/cqumirror/feedback
              </Link>
            </Box>
          </Box>
        </Box>
      </Container>
    </>
  );
};

export default ErrorPage;
