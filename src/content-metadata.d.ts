declare module 'virtual:content-metadata' {
  interface LicenseConfig {
    licenses: string[];
    links: Record<string, string>;
  }

  export const docsMetadata: Record<
    string,
    { hasHelp: boolean; licenseConfig: LicenseConfig | null }
  >;
  export const newsExcerpts: Record<string, string>;
}
