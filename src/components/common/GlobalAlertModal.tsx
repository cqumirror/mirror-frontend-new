// src/components/common/GlobalAlertModal.tsx
// 全局最高等级警报弹窗 —— 遮罩式，必须确认后才能继续浏览
// 数据从 /data/alerts.json 运行时加载，无需重新构建

import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import { Box, Button, Dialog, Divider, IconButton, Link, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useLocaleStore } from '../../stores/mirrorStore';
import { safeGetItem, safeSetItem } from '../../utils/storage';

interface AlertLink {
  url: string;
  label: { zh: string; en: string };
}

interface AlertItem {
  id: string;
  level: string;
  active: boolean;
  title: { zh: string; en: string };
  content: { zh: string; en: string };
  link: AlertLink | null;
  date: string;
}

const STORAGE_KEY = 'dismissed_alerts';

function loadDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(safeGetItem(STORAGE_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>) {
  safeSetItem(STORAGE_KEY, JSON.stringify([...ids]));
}

const GlobalAlertModal: React.FC = () => {
  const { t } = useTranslation();
  const { locale } = useLocaleStore();
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    fetch('/data/alerts.json')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: AlertItem[]) => {
        const dismissed = loadDismissed();
        const active = data
          .filter((a) => a.active && !dismissed.has(a.id))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAlerts(active);
      })
      .catch(() => {});
  }, []);

  const dismissOne = (id: string) => {
    const dismissed = loadDismissed();
    dismissed.add(id);
    saveDismissed(dismissed);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const dismissAll = () => {
    const dismissed = loadDismissed();
    for (const a of alerts) dismissed.add(a.id);
    saveDismissed(dismissed);
    setAlerts([]);
  };

  const handleLink = (url: string) => {
    if (url.startsWith('http')) {
      window.open(url, '_blank', 'noopener');
    } else {
      navigate(url);
    }
  };

  if (alerts.length === 0) return null;

  return (
    <Dialog
      open
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: { borderRadius: 2, overflow: 'hidden' },
        },
        backdrop: {
          sx: { bgcolor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' },
        },
      }}
    >
      {/* 标题栏 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2.5,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'error.main',
        }}
      >
        <ReportProblemIcon sx={{ color: '#fff', fontSize: 20 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#fff', flex: 1 }}>
          {alerts.length > 1
            ? t('alert.multipleTitle', { count: alerts.length })
            : alerts[0].title[locale]}
        </Typography>
      </Box>

      {/* 警报列表 */}
      <Box
        sx={{
          maxHeight: 420,
          overflowY: 'auto',
          bgcolor: 'background.paper',
        }}
      >
        {alerts.map((alert, idx) => (
          <React.Fragment key={alert.id}>
            {idx > 0 && <Divider />}
            <Box sx={{ px: 2.5, py: 2 }}>
              {alerts.length > 1 && (
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {alert.title[locale]}
                </Typography>
              )}
              <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                {alert.content[locale]}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1.5, gap: 1.5 }}>
                {alert.link && (
                  <Link
                    component="button"
                    onClick={() => handleLink(alert.link?.url ?? '')}
                    underline="hover"
                    sx={{
                      fontSize: '0.82rem',
                      color: 'primary.main',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.3,
                      border: 'none',
                      bgcolor: 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    {alert.link.label[locale]}
                    <OpenInNewIcon sx={{ fontSize: 13 }} />
                  </Link>
                )}
                <Box sx={{ flex: 1 }} />
                <Button
                  size="small"
                  onClick={() => dismissOne(alert.id)}
                  sx={{ fontSize: '0.78rem', minWidth: 0, color: 'text.secondary' }}
                >
                  {t('alert.dismiss')}
                </Button>
              </Box>
            </Box>
          </React.Fragment>
        ))}
      </Box>

      {/* 底部操作栏 */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1,
          px: 2.5,
          py: 1.5,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'action.hover',
        }}
      >
        {alerts.length > 1 && (
          <Button
            size="small"
            onClick={dismissAll}
            sx={{ fontSize: '0.82rem', color: 'text.secondary' }}
          >
            {t('alert.dismissAll')}
          </Button>
        )}
        <Button
          variant="contained"
          color="error"
          size="small"
          onClick={dismissAll}
          sx={{ fontWeight: 700, borderRadius: 1.5, px: 3 }}
        >
          {t('alert.acknowledge')}
        </Button>
      </Box>
    </Dialog>
  );
};

export default GlobalAlertModal;
