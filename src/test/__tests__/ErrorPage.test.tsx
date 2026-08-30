import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import ErrorPage from '@/pages/ErrorPage';

describe('ErrorPage', () => {
  it('renders code-specific guidance and supplied diagnostic data', () => {
    render(
      <MemoryRouter initialEntries={['/403?data=request%20blocked']}>
        <ErrorPage code={403} />
      </MemoryRouter>
    );

    expect(screen.getByText('Forbidden')).toBeInTheDocument();
    expect(screen.getByText('哎呀，访问被挡了！')).toBeInTheDocument();
    expect(screen.getByText('request blocked')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '查看公告' })).toHaveAttribute(
      'href',
      '/news/2023-03-27-ban-p2p-tools'
    );
  });

  it('supports gateway timeout guidance', () => {
    render(
      <MemoryRouter initialEntries={['/504']}>
        <ErrorPage code={504} />
      </MemoryRouter>
    );

    expect(screen.getByText('Gateway Timeout')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /重新尝试/ })).toBeInTheDocument();
    expect(screen.queryByText('反馈时请提供下方错误信息：')).not.toBeInTheDocument();
  });
});
