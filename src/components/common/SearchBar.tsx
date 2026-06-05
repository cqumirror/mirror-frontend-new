// src/components/common/SearchBar.tsx
// 搜索框组件 - 实时过滤镜像

import { Search as SearchIcon, Close as CloseIcon } from '@mui/icons-material';
import { TextField, InputAdornment, IconButton } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { useMirrorSearchStore } from '../../stores/mirrorStore';

interface SearchBarProps {
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  inputRef?: React.Ref<HTMLInputElement>;
}

/**
 * 搜索框 - 带防抖（300ms）
 * 在非首页输入时自动跳转到首页并滚动到镜像列表
 */
const SearchBar: React.FC<SearchBarProps> = ({ fullWidth = false, size = 'small', inputRef }) => {
  const { t } = useTranslation();
  const { searchQuery, setSearchQuery } = useMirrorSearchStore();
  const location = useLocation();
  const navigate = useNavigate();

  // 本地输入值 + 防抖同步到 store
  const [inputValue, setInputValue] = useState(searchQuery);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // 外部清空 searchQuery 时同步本地状态（如 Header 中清空）
  useEffect(() => {
    if (searchQuery === '') setInputValue('');
  }, [searchQuery]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // 防抖 300ms 后同步到 store
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setSearchQuery(value);
    }, 300);

    // 不在首页时立即跳转（不等防抖）
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        document.getElementById('mirrors')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleClear = () => {
    setInputValue('');
    setSearchQuery('');
  };

  return (
    <TextField
      value={inputValue}
      onChange={handleChange}
      placeholder={t('search.placeholder')}
      fullWidth={fullWidth}
      size={size}
      variant="outlined"
      autoComplete="off"
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
          endAdornment: searchQuery ? (
            <InputAdornment position="end">
              <IconButton size="small" onClick={handleClear} edge="end" aria-label="清除搜索">
                <CloseIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : null,
        },

        htmlInput: {
          'aria-label': t('search.placeholder'),
          ref: inputRef,
        },
      }}
      sx={{
        minWidth: { sm: 280 },
        '& .MuiOutlinedInput-root': {
          bgcolor: 'background.paper',
        },
      }}
    />
  );
};

export default SearchBar;
