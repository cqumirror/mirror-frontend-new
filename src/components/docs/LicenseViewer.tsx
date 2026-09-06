import { Alert } from '@mui/material';
import React from 'react';

import { getLicenseConfig } from '@/licenses';

import LicenseGrid from './LicenseGrid';

interface LicenseViewerProps {
  licenseId: string;
}

const LicenseViewer: React.FC<LicenseViewerProps> = ({ licenseId }) => {
  const config = getLicenseConfig(licenseId);
  if (!config) return <Alert severity="info">暂无许可证说明</Alert>;
  return <LicenseGrid licenses={config.licenses} links={config.links} />;
};

export default LicenseViewer;
