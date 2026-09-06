export interface LicenseConfig {
  licenses: string[];
  links: Record<string, string>;
}

const quotedValues = (source: string): string[] =>
  [...source.matchAll(/(['"])(.*?)\1/g)].map((match) => match[2]);

const parseLinks = (source: string): Record<string, string> => {
  const links: Record<string, string> = {};
  for (const match of source.matchAll(/(['"])(.*?)\1\s*:\s*(['"])(.*?)\3/g)) {
    links[match[2]] = match[4];
  }
  return links;
};

export const parseLicenseConfig = (source: string): LicenseConfig | null => {
  const grid = source.match(/<LicenseGrid\b([\s\S]*?)\/>/);
  const licensesSource = grid?.[1].match(/licenses=\{\[([\s\S]*?)\]\}/)?.[1];
  if (!licensesSource) return null;

  const licenses = quotedValues(licensesSource);
  if (licenses.length === 0) return null;

  const linksSource = grid?.[1].match(/links=\{\{([\s\S]*?)\}\}/)?.[1] ?? '';
  return { licenses, links: parseLinks(linksSource) };
};

export const hasHelpContent = (source: string): boolean =>
  Boolean(source.replace(/<LicenseGrid\b[\s\S]*?\/>/g, '').trim());

/** 从新闻正文提取第一个可读句子，跳过元数据、标题、代码块和表格。 */
export const extractFirstSentence = (source: string): string => {
  const body = source
    .replace(/export\s+const\s+meta\s*=\s*\{[\s\S]*?\}\s*;?/, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^\s*#{1,6}\s+.*$/gm, '')
    .replace(/^\s*\|.*$/gm, '')
    .replace(/^\s*<[^>]+>\s*$/gm, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .trim();
  const paragraph = body
    .split(/\n\s*\n/)
    .map((part) =>
      part
        .replace(/^\s*(?:>|[-+*]|\d+\.)\s*/gm, '')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .find(Boolean);
  return paragraph?.match(/^.*?[。！？!?](?:[”’"')）】])?/)?.[0] ?? paragraph ?? '';
};
