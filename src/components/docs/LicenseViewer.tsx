import { MDXProvider } from '@mdx-js/react';
import { Alert, Box, CircularProgress } from '@mui/material';
import React, { useEffect, useState } from 'react';

import { loadLicense } from '@/licenses';

import { mdxComponents } from './DocViewer';

interface LicenseViewerProps {
  licenseId: string;
}

const LicenseViewer: React.FC<LicenseViewerProps> = ({ licenseId }) => {
  const [LicenseComponent, setLicenseComponent] = useState<React.FC | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLicenseComponent(null);
    loadLicense(licenseId)
      .then((component) => {
        if (active) setLicenseComponent(() => component);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [licenseId]);

  if (loading) {
    return (
      <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (!LicenseComponent) return <Alert severity="info">暂无许可证说明</Alert>;

  return (
    <Box sx={{ '& > *:first-of-type': { mt: 0 }, '& > *:last-child': { mb: 0 } }}>
      <MDXProvider components={mdxComponents as unknown as Record<string, React.ComponentType>}>
        <LicenseComponent />
      </MDXProvider>
    </Box>
  );
};

export default LicenseViewer;
