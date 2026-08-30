import { docsMetadata } from 'virtual:content-metadata';

export type { LicenseConfig } from '@/docs/source';

export const getLicenseConfig = (mirrorId: string) => {
  return docsMetadata[mirrorId]?.licenseConfig ?? null;
};

export const hasLicense = (mirrorId: string): boolean => getLicenseConfig(mirrorId) !== null;

const licenseSlug = (value: string): string => value.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');

export const getReleaseLicenseId = (org: string, repo: string): string | null => {
  const orgSlug = licenseSlug(org);
  const repoSlug = licenseSlug(repo);
  const candidates = [`github-release-${orgSlug}-${repoSlug}`, `github-release-${repoSlug}`];
  return candidates.find(hasLicense) ?? null;
};
