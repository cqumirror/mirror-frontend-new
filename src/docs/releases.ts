const RELEASE_HELP_DOCS: Record<string, string> = {
  'yerongai/office-tool': 'github-release-office-tool',
  'obsproject/obs-studio': 'github-release-obs-studio',
  'balena-io/etcher': 'github-release-etcher',
  'atelier-anchor/smiley-sans': 'github-release-smiley-sans',
  'arduino/arduino-ide': 'github-release-arduino-ide',
  'microsoft/wsl': 'github-release-wsl',
  'lxgw/lxgwwenkai': 'github-release-lxgw-wenkai',
  'lxgw/lxgwwenkai-screen': 'github-release-lxgw-wenkai',
  'lxgw/lxgwwenkai-lite': 'github-release-lxgw-wenkai',
  'lxgw/lxgwwenkaigb': 'github-release-lxgw-wenkai',
  'lxgw/lxgwwenkaitc': 'github-release-lxgw-wenkai',
};

export const getReleaseHelpDocId = (org: string, repo: string): string | null =>
  RELEASE_HELP_DOCS[`${org}/${repo}`.toLowerCase()] ?? null;
