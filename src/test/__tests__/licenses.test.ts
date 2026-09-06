import { describe, expect, it } from 'vitest';

import { hasHelpDoc } from '@/docs';
import { hasHelpContent, parseLicenseConfig } from '@/docs/source';
import { getLicenseConfig, hasLicense } from '@/licenses';

describe('unified documentation license declarations', () => {
  it('parses licenses from a documentation MDX file', () => {
    expect(
      parseLicenseConfig("<LicenseGrid licenses={['GPLv2', 'LGPL', 'MIT', 'Apache-2.0']} />")
    ).toEqual({
      licenses: ['GPLv2', 'LGPL', 'MIT', 'Apache-2.0'],
      links: {},
    });
  });

  it('distinguishes full help documents from license-only documents', () => {
    expect(hasHelpContent("# Ubuntu\n\n<LicenseGrid licenses={['GPLv2']} />")).toBe(true);
    expect(hasHelpContent("<LicenseGrid licenses={['GPLv2']} />")).toBe(false);
  });

  it('supports custom links and ignores documents without a declaration', () => {
    expect(
      parseLicenseConfig(
        "<LicenseGrid licenses={['Custom']} links={{ 'Custom': 'https://example.com/license' }} />"
      )
    ).toEqual({
      licenses: ['Custom'],
      links: { Custom: 'https://example.com/license' },
    });
    expect(parseLicenseConfig('# Help only')).toBeNull();
  });

  it('loads unified MDX as raw source in the Vite runtime', () => {
    expect(hasHelpDoc('ubuntu')).toBe(true);
    expect(hasLicense('ubuntu')).toBe(false);
    expect(hasLicense('bmclapi')).toBe(false);
    expect(hasLicense('crates.io-index')).toBe(false);
    expect(getLicenseConfig('blender')?.licenses).toEqual(['GPLv3']);
    expect(getLicenseConfig('github-release-arduino-ide')?.licenses).toEqual(['AGPL-3.0']);
    expect(hasLicense('pcl')).toBe(true);
    expect(getLicenseConfig('pcl')?.links['PCL 分发有限许可']).toBe(
      'https://github.com/Meloong-Git/PCL/blob/main/LICENCE'
    );
    expect(hasLicense('github-release')).toBe(false);
  });
});
