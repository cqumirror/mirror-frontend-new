// src/api/__tests__/oldBackendAdapter.test.ts
import { describe, it, expect } from 'vitest';

import { parseOldTimestamp, transformOldJobs } from '../oldBackendAdapter';
import type { OldTunasyncJob } from '../oldBackendAdapter';
import type { LocalMeta } from '../transform';

describe('parseOldTimestamp', () => {
  it('converts "YYYY-MM-DD HH:MM:SS" (UTC+8) to unix seconds', () => {
    // 2024-01-01 12:00:00 UTC+8 = 2024-01-01 04:00:00 UTC = 1704081600
    expect(parseOldTimestamp('2024-01-01 12:00:00')).toBe('1704081600');
  });

  it('handles midnight UTC+8', () => {
    // 2024-01-01 00:00:00 UTC+8 = 2023-12-31 16:00:00 UTC = 1704038400
    expect(parseOldTimestamp('2024-01-01 00:00:00')).toBe('1704038400');
  });

  it('handles empty string', () => {
    expect(parseOldTimestamp('')).toBe('');
  });

  it('handles null/undefined input', () => {
    expect(parseOldTimestamp(null as unknown as string)).toBe('');
    expect(parseOldTimestamp(undefined as unknown as string)).toBe('');
  });

  it('handles non-matching format gracefully', () => {
    // ISO format should still work via Date fallback
    const result = parseOldTimestamp('2024-01-01T12:00:00Z');
    expect(result).toBe('1704110400');
  });

  it('handles "YYYY-MM-DD HH:MM:SS +0800" format', () => {
    // 2024-01-01 12:00:00 +0800 = 2024-01-01 04:00:00 UTC = 1704081600
    expect(parseOldTimestamp('2024-01-01 12:00:00 +0800')).toBe('1704081600');
  });

  it('handles "YYYY-MM-DD HH:MM:SS +08:00" format', () => {
    expect(parseOldTimestamp('2024-01-01 12:00:00 +08:00')).toBe('1704081600');
  });

  it('returns empty string for invalid date', () => {
    expect(parseOldTimestamp('not-a-date')).toBe('');
  });
});

describe('transformOldJobs', () => {
  const makeJob = (overrides: Partial<OldTunasyncJob> = {}): OldTunasyncJob => ({
    name: 'ubuntu',
    last_update: '2024-06-15 10:30:00',
    status: 'success',
    upstream: 'rsync://archive.ubuntu.com/ubuntu/',
    size: '1.2TB',
    ...overrides,
  });

  it('converts basic job to Mirror', () => {
    const result = transformOldJobs([makeJob()]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('ubuntu');
    expect(result[0].status).toBe('succeeded');
    expect(result[0].upstream).toBe('rsync://archive.ubuntu.com/ubuntu/');
    expect(result[0].size).toBe('1.2TB');
    expect(result[0].lastUpdated).toBeTruthy();
    expect(result[0].nextScheduled).toBe('');
    expect(result[0].lastSuccess).toBe('');
  });

  it('maps status values correctly', () => {
    const cases: Array<[string, string]> = [
      ['success', 'succeeded'],
      ['syncing', 'syncing'],
      ['paused', 'paused'],
      ['failed', 'failed'],
      ['pre-syncing', 'cached'],
    ];
    for (const [input, expected] of cases) {
      const result = transformOldJobs([makeJob({ status: input })]);
      expect(result[0].status).toBe(expected);
    }
  });

  it('applies local metadata overrides', () => {
    const localData: Record<string, LocalMeta> = {
      ubuntu: {
        name: { zh: 'Ubuntu 系统', en: 'Ubuntu OS' },
        desc: { zh: 'Ubuntu 软件包', en: 'Ubuntu packages' },
        type: 'os',
      },
    };
    const result = transformOldJobs([makeJob()], localData);
    expect(result[0].name.zh).toBe('Ubuntu 系统');
    expect(result[0].name.en).toBe('Ubuntu OS');
    expect(result[0].type).toBe('os');
  });

  it('uses default labels when no local data', () => {
    const result = transformOldJobs([makeJob({ name: 'centos' })]);
    expect(result[0].name.zh).toBe('Centos');
    expect(result[0].name.en).toBe('Centos');
  });

  it('skips jobs with missing name', () => {
    const result = transformOldJobs([
      makeJob({ name: '' }),
      makeJob({ name: 'valid' }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('valid');
  });

  it('handles empty array', () => {
    expect(transformOldJobs([])).toEqual([]);
  });

  it('handles null/undefined entries in array', () => {
    const result = transformOldJobs([
      null as unknown as OldTunasyncJob,
      makeJob({ name: 'debian' }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('debian');
  });

  it('preserves local data files', () => {
    const localData: Record<string, LocalMeta> = {
      ubuntu: {
        files: [
          { name: '24.04 LTS', url: '/ubuntu-releases/noble/ubuntu-24.04-desktop-amd64.iso' },
        ],
      },
    };
    const result = transformOldJobs([makeJob()], localData);
    expect(result[0].files).toHaveLength(1);
    expect(result[0].files[0].name).toBe('24.04 LTS');
  });

  it('sanitizes file URLs', () => {
    const localData: Record<string, LocalMeta> = {
      ubuntu: {
        files: [
          { name: 'good', url: '/ubuntu/file.iso' },
          { name: 'bad', url: '//evil.com/file.iso' },
          { name: 'also good', url: 'https://example.com/file.iso' },
        ],
      },
    };
    const result = transformOldJobs([makeJob()], localData);
    expect(result[0].files).toHaveLength(2);
    expect(result[0].files[0].url).toBe('/ubuntu/file.iso');
    expect(result[0].files[1].url).toBe('https://example.com/file.iso');
  });
});
