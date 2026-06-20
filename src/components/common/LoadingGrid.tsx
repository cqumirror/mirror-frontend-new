// src/components/common/LoadingGrid.tsx
// 九宫格加载动画 SVG —— PageTransition 和 DirectoryListing 共用

import React from 'react';

interface LoadingGridProps {
  size?: string;
}

const LoadingGrid: React.FC<LoadingGridProps> = ({ size = '4em' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24">
    <path d="M0 0h24v24H0z" fill="none" />
    <rect width="7.33" height="7.33" x="1" y="1" fill="currentColor">
      <animate id="a" attributeName="x" begin="0;b.end+0.2s" dur="0.6s" values="1;4;1" />
      <animate attributeName="y" begin="0;b.end+0.2s" dur="0.6s" values="1;4;1" />
      <animate attributeName="width" begin="0;b.end+0.2s" dur="0.6s" values="7.33;1.33;7.33" />
      <animate attributeName="height" begin="0;b.end+0.2s" dur="0.6s" values="7.33;1.33;7.33" />
    </rect>
    <rect width="7.33" height="7.33" x="8.33" y="1" fill="currentColor">
      <animate attributeName="x" begin="a.begin+0.1s" dur="0.6s" values="8.33;11.33;8.33" />
      <animate attributeName="y" begin="a.begin+0.1s" dur="0.6s" values="1;4;1" />
      <animate attributeName="width" begin="a.begin+0.1s" dur="0.6s" values="7.33;1.33;7.33" />
      <animate attributeName="height" begin="a.begin+0.1s" dur="0.6s" values="7.33;1.33;7.33" />
    </rect>
    <rect width="7.33" height="7.33" x="1" y="8.33" fill="currentColor">
      <animate attributeName="x" begin="a.begin+0.1s" dur="0.6s" values="1;4;1" />
      <animate attributeName="y" begin="a.begin+0.1s" dur="0.6s" values="8.33;11.33;8.33" />
      <animate attributeName="width" begin="a.begin+0.1s" dur="0.6s" values="7.33;1.33;7.33" />
      <animate attributeName="height" begin="a.begin+0.1s" dur="0.6s" values="7.33;1.33;7.33" />
    </rect>
    <rect width="7.33" height="7.33" x="15.66" y="1" fill="currentColor">
      <animate attributeName="x" begin="a.begin+0.2s" dur="0.6s" values="15.66;18.66;15.66" />
      <animate attributeName="y" begin="a.begin+0.2s" dur="0.6s" values="1;4;1" />
      <animate attributeName="width" begin="a.begin+0.2s" dur="0.6s" values="7.33;1.33;7.33" />
      <animate attributeName="height" begin="a.begin+0.2s" dur="0.6s" values="7.33;1.33;7.33" />
    </rect>
    <rect width="7.33" height="7.33" x="8.33" y="8.33" fill="currentColor">
      <animate attributeName="x" begin="a.begin+0.2s" dur="0.6s" values="8.33;11.33;8.33" />
      <animate attributeName="y" begin="a.begin+0.2s" dur="0.6s" values="8.33;11.33;8.33" />
      <animate attributeName="width" begin="a.begin+0.2s" dur="0.6s" values="7.33;1.33;7.33" />
      <animate attributeName="height" begin="a.begin+0.2s" dur="0.6s" values="7.33;1.33;7.33" />
    </rect>
    <rect width="7.33" height="7.33" x="1" y="15.66" fill="currentColor">
      <animate attributeName="x" begin="a.begin+0.2s" dur="0.6s" values="1;4;1" />
      <animate attributeName="y" begin="a.begin+0.2s" dur="0.6s" values="15.66;18.66;15.66" />
      <animate attributeName="width" begin="a.begin+0.2s" dur="0.6s" values="7.33;1.33;7.33" />
      <animate attributeName="height" begin="a.begin+0.2s" dur="0.6s" values="7.33;1.33;7.33" />
    </rect>
    <rect width="7.33" height="7.33" x="15.66" y="8.33" fill="currentColor">
      <animate attributeName="x" begin="a.begin+0.3s" dur="0.6s" values="15.66;18.66;15.66" />
      <animate attributeName="y" begin="a.begin+0.3s" dur="0.6s" values="8.33;11.33;8.33" />
      <animate attributeName="width" begin="a.begin+0.3s" dur="0.6s" values="7.33;1.33;7.33" />
      <animate attributeName="height" begin="a.begin+0.3s" dur="0.6s" values="7.33;1.33;7.33" />
    </rect>
    <rect width="7.33" height="7.33" x="8.33" y="15.66" fill="currentColor">
      <animate attributeName="x" begin="a.begin+0.3s" dur="0.6s" values="8.33;11.33;8.33" />
      <animate attributeName="y" begin="a.begin+0.3s" dur="0.6s" values="15.66;18.66;15.66" />
      <animate attributeName="width" begin="a.begin+0.3s" dur="0.6s" values="7.33;1.33;7.33" />
      <animate attributeName="height" begin="a.begin+0.3s" dur="0.6s" values="7.33;1.33;7.33" />
    </rect>
    <rect width="7.33" height="7.33" x="15.66" y="15.66" fill="currentColor">
      <animate id="b" attributeName="x" begin="a.begin+0.4s" dur="0.6s" values="15.66;18.66;15.66" />
      <animate attributeName="y" begin="a.begin+0.4s" dur="0.6s" values="15.66;18.66;15.66" />
      <animate attributeName="width" begin="a.begin+0.4s" dur="0.6s" values="7.33;1.33;7.33" />
      <animate attributeName="height" begin="a.begin+0.4s" dur="0.6s" values="7.33;1.33;7.33" />
    </rect>
  </svg>
);

export default LoadingGrid;
