import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import type { Plugin } from 'vite';

import { extractFirstSentence, hasHelpContent, parseLicenseConfig } from '../src/docs/source';

const CONTENT_METADATA_ID = 'virtual:content-metadata';
const RESOLVED_CONTENT_METADATA_ID = `\0${CONTENT_METADATA_ID}`;

export const contentMetadataPlugin = (rootDir: string): Plugin => ({
  name: 'content-metadata',
  enforce: 'pre',
  resolveId(id) {
    return id === CONTENT_METADATA_ID ? RESOLVED_CONTENT_METADATA_ID : null;
  },
  load(id) {
    if (id !== RESOLVED_CONTENT_METADATA_ID) return null;

    const docsDirs = [
      resolve(rootDir, '.generated', 'mirrorz-docs'),
      resolve(rootDir, 'content', 'docs'),
    ];
    const docsMetadata = Object.fromEntries(
      docsDirs.flatMap((docsDir) =>
        existsSync(docsDir)
          ? readdirSync(docsDir)
              .filter((name) => name.endsWith('.mdx'))
              .map((name) => {
                const source = readFileSync(resolve(docsDir, name), 'utf8');
                return [
                  name.replace(/\.mdx$/, ''),
                  {
                    hasHelp: hasHelpContent(source),
                    licenseConfig: parseLicenseConfig(source),
                  },
                ] as const;
              })
          : []
      )
    );

    const newsDir = resolve(rootDir, 'content', 'news', 'mdx');
    const newsExcerpts = Object.fromEntries(
      readdirSync(newsDir)
        .filter((name) => name.endsWith('.mdx'))
        .map((name) => {
          const source = readFileSync(resolve(newsDir, name), 'utf8');
          return [name.replace(/\.mdx$/, ''), extractFirstSentence(source)];
        })
    );

    return `export const docsMetadata = ${JSON.stringify(docsMetadata)};\nexport const newsExcerpts = ${JSON.stringify(newsExcerpts)};`;
  },
  handleHotUpdate({ file, server }) {
    if (
      !file.includes('/content/docs/') &&
      !file.includes('/.generated/mirrorz-docs/') &&
      !file.includes('/content/news/mdx/')
    )
      return;
    const module = server.moduleGraph.getModuleById(RESOLVED_CONTENT_METADATA_ID);
    if (module) server.moduleGraph.invalidateModule(module);
    server.ws.send({ type: 'full-reload' });
    return [];
  },
});
