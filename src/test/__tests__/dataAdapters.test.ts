import { describe, expect, it } from 'vitest';

import { getReleaseFiles, parseIsoInfo, resolveReleaseFiles } from '@/api/isoInfo';
import { parseReleaseManifest } from '@/api/releaseManifest';
import { parseTimestamp, transformJobs } from '@/api/tunasync';

describe('tunasync adapter', () => {
  it('parses explicit and implicit UTC+8 timestamps consistently', () => {
    expect(parseTimestamp('2026-08-30 08:00:00')).toBe('1788048000');
    expect(parseTimestamp('2026-08-30 08:00:00 +0800')).toBe('1788048000');
    expect(parseTimestamp('invalid')).toBe('');
  });

  it('merges jobs and keeps non-local metadata-only entries', () => {
    const mirrors = transformJobs(
      [
        {
          name: 'debian',
          last_update: '2026-08-30 08:00:00 +0800',
          last_update_ts: 1788048000,
          status: 'success',
          upstream: 'https://deb.debian.org',
          size: '2T',
        },
      ],
      {
        debian: { name: 'Debian', desc: 'Debian 镜像' },
        proxy: { name: 'Proxy', storageType: 'cache' },
        removed: { name: 'Removed', storageType: 'local' },
      }
    );

    expect(mirrors.map((mirror) => mirror.id)).toEqual(['debian', 'proxy']);
    expect(mirrors[0]).toMatchObject({ name: 'Debian', status: 'succeeded', size: '2T' });
    expect(mirrors[1]).toMatchObject({ status: 'cached', storageType: 'cache' });
  });
});

describe('release manifest adapter', () => {
  it('normalizes entries and skips malformed projects and releases', () => {
    const releases = parseReleaseManifest({
      'example/tool': {
        config: {
          name: 'Example Tool',
          desc: 'Example description',
          flat: true,
          versions: 2,
        },
        releases: [
          {
            version: 'v2',
            tag: '2.0.0',
            files: ['tool.zip', 42],
            published_at: '2026-08-30T00:00:00Z',
          },
          { files: ['invalid.zip'] },
        ],
        latest: { version: 'v2', tag: '2.0.0' },
      },
      malformed: {},
    });

    expect(releases).toHaveLength(1);
    expect(releases[0]).toMatchObject({
      org: 'example',
      repo: 'tool',
      name: 'Example Tool',
      flat: true,
      versions: 2,
      latest: { version: 'v2', tag: '2.0.0' },
    });
    expect(releases[0].releases[0].files).toEqual(['tool.zip']);
  });

  it('supports manifests without a stable latest release', () => {
    const [release] = parseReleaseManifest({
      'example/preview': { config: { pre_release: true }, releases: [], latest: null },
    });

    expect(release.latest).toBeNull();
    expect(release.pre_release).toBe(true);
  });
});

describe('isoinfo adapter', () => {
  it('uses isoinfo labels and URLs for release downloads', () => {
    const entries = parseIsoInfo([
      {
        distro: 'Example Tool',
        category: 'app',
        urls: [
          {
            name: '2.0 (Windows, x64)',
            url: '/github-release/example/tool/tool-2.0.exe',
          },
          { name: 'unsafe', url: 'javascript:alert(1)' },
        ],
      },
      {
        distro: 'Other Tool',
        category: 'app',
        urls: [{ name: 'Other', url: '/github-release/example/other/other.zip' }],
      },
    ]);

    expect(getReleaseFiles(entries, 'Example', 'Tool')).toEqual([
      {
        name: '2.0 (Windows, x64)',
        url: '/github-release/example/tool/tool-2.0.exe',
        distro: 'Example Tool',
        category: 'app',
      },
    ]);
  });

  it('places matched downloads first and keeps unmatched manifest file names', () => {
    const downloads = getReleaseFiles(
      parseIsoInfo([
        {
          distro: 'Example Tool',
          category: 'app',
          urls: [
            {
              name: 'Windows x64 安装包',
              url: '/github-release/example/tool/v2/tool%202.0.exe',
            },
          ],
        },
      ]),
      'example',
      'tool'
    );

    expect(
      resolveReleaseFiles(
        ['checksums.txt', 'tool 2.0.exe'],
        downloads,
        false,
        '/github-release/example/tool/v2/'
      )
    ).toEqual([
      {
        fileName: 'tool 2.0.exe',
        displayName: 'Windows x64 安装包',
        url: '/github-release/example/tool/v2/tool%202.0.exe',
        category: 'app',
        available: true,
      },
      {
        fileName: 'checksums.txt',
        displayName: 'checksums.txt',
        url: '/github-release/example/tool/v2/checksums.txt',
        category: '',
        available: false,
      },
    ]);
  });

  it('can include isoinfo-only downloads for the latest version', () => {
    const downloads = [
      {
        name: 'Portable build',
        url: '/github-release/example/tool/tool-portable.zip',
        distro: 'Example Tool',
        category: 'app',
      },
    ];

    expect(resolveReleaseFiles([], downloads, true)).toEqual([
      {
        fileName: 'tool-portable.zip',
        displayName: 'Portable build',
        url: '/github-release/example/tool/tool-portable.zip',
        category: 'app',
        available: true,
      },
    ]);
  });

  it('adapts isoinfo labels to older versions by file-name template', () => {
    const downloads = [
      {
        name: '2.0.0 (Windows, x64)',
        url: '/github-release/example/tool/2.0.0/tool-2.0.0-windows-x64.exe',
        distro: 'Example Tool',
        category: 'app',
      },
    ];

    expect(
      resolveReleaseFiles(
        ['tool-1.9.0-windows-x64.exe'],
        downloads,
        false,
        '/github-release/example/tool/1.9.0/'
      )
    ).toEqual([
      {
        fileName: 'tool-1.9.0-windows-x64.exe',
        displayName: '1.9.0 (Windows, x64)',
        url: '/github-release/example/tool/1.9.0/tool-1.9.0-windows-x64.exe',
        category: 'app',
        available: true,
      },
    ]);
  });
});
