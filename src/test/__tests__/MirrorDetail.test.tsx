import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MirrorDetail from '@/pages/MirrorDetail';

const mocks = vi.hoisted(() => {
  class MirrorNotFoundError extends Error {}
  return {
    MirrorNotFoundError,
    useMirrorDetail: vi.fn(),
  };
});

vi.mock('@/hooks/useMirrors', () => mocks);

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/mirrors/does-not-exist']}>
      <Routes>
        <Route path="/mirrors/:name" element={<MirrorDetail />} />
      </Routes>
    </MemoryRouter>
  );

describe('MirrorDetail errors', () => {
  beforeEach(() => {
    mocks.useMirrorDetail.mockReset();
  });

  it('renders the unified 404 page for an unknown mirror', () => {
    mocks.useMirrorDetail.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new mocks.MirrorNotFoundError('missing'),
    });

    renderPage();

    expect(screen.getByText('Not Found')).toBeInTheDocument();
    expect(screen.getByText('呜呜，页面不见了！')).toBeInTheDocument();
  });

  it('preserves a service error instead of showing a false 404', () => {
    mocks.useMirrorDetail.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('tunasync.json HTTP 503'),
    });

    renderPage();

    expect(screen.getByText('Service Unavailable')).toBeInTheDocument();
    expect(screen.getByText('tunasync.json HTTP 503')).toBeInTheDocument();
  });
});
