import AlbumIcon from '@mui/icons-material/Album';
import Avatar from '@mui/material/Avatar';
import React from 'react';

interface ReleaseLogoProps {
  avatarUrl: string | null;
  size?: number;
  name?: string;
}

const ReleaseLogo: React.FC<ReleaseLogoProps> = ({
  avatarUrl,
  size = 40,
  name = 'GitHub Release',
}) => {
  if (avatarUrl) {
    return (
      <Avatar
        src={avatarUrl}
        alt={`${name} Logo`}
        sx={{ width: size, height: size, flexShrink: 0 }}
      />
    );
  }
  // 无 avatarUrl 时使用降级图标
  return <AlbumIcon sx={{ width: size, height: size, color: 'text.secondary', flexShrink: 0 }} />;
};

export default ReleaseLogo;
