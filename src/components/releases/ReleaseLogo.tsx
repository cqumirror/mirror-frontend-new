import React from 'react';
import Avatar from '@mui/material/Avatar';
import AlbumIcon from '@mui/icons-material/Album';
import { useTheme } from '@mui/material/styles';

interface ReleaseLogoProps {
  avatarUrl: string | null;
  size?: number;
}

const ReleaseLogo: React.FC<ReleaseLogoProps> = ({ avatarUrl, size = 40 }) => {
  if (avatarUrl) {
    return (
      <Avatar
        src={avatarUrl}
        alt="GitHub repo avatar"
        sx={{ width: size, height: size, flexShrink: 0 }}
      />
    );
  }
  // 无 avatarUrl 时使用降级图标
  return <AlbumIcon sx={{ width: size, height: size, color: 'text.secondary', flexShrink: 0 }} />;
};

export default ReleaseLogo;
