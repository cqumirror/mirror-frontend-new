import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import Mustache from 'mustache';
import { parse as parseYaml } from 'yaml';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = join(rootDir, 'mirrorz-docs');
const outputDir = join(rootDir, '.generated', 'mirrorz-docs');
const localDocsDir = join(rootDir, 'content', 'docs');

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

const config = await readJson(join(rootDir, 'mirrorz-docs.config.json'));
const localData = await readJson(join(rootDir, 'public', 'static', 'local_data.json'));

if (!existsSync(join(sourceDir, 'README.md'))) {
  throw new Error('mirrorz-docs 子模块未初始化，请先运行：git submodule update --init --recursive');
}

const localDocs = new Set(
  (await readdir(localDocsDir))
    .filter((name) => name.endsWith('.mdx'))
    .map((name) => name.slice(0, -4).toLowerCase())
);
const sourceNames = (await readdir(sourceDir, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
const sourceByLowercaseName = new Map(sourceNames.map((name) => [name.toLowerCase(), name]));

const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

/** 将 MirrorZ 输入控件固定为默认值，构建产物中不保留模板解析逻辑。 */
const resolveDefaultInputs = (inputs = {}) => {
  const values = {};

  for (const [name, input] of Object.entries(inputs)) {
    if (!input || typeof input !== 'object') continue;

    if (input.option && typeof input.option === 'object') {
      const optionNames = Object.keys(input.option);
      const selected = own(input.option, input.default) ? input.default : optionNames[0];
      if (!selected) continue;
      values[name] = selected;
      const selectedValues = input.option[selected];
      if (selectedValues && typeof selectedValues === 'object') {
        for (const [key, value] of Object.entries(selectedValues)) {
          if (key !== '_' && value !== undefined) values[key] = value;
        }
      }
      continue;
    }

    if (own(input, 'true') || own(input, 'false')) {
      const enabled = input.default ?? false;
      const configured = input[String(Boolean(enabled))];
      values[name] = configured == null ? Boolean(enabled) : configured;
      continue;
    }

    values[name] = input.default ?? '';
  }

  return values;
};

const parseAttributes = (source) => {
  const attributes = {};
  for (const match of source.matchAll(/([\w-]+)=(['"])(.*?)\2/g)) {
    attributes[match[1]] = match[3];
  }
  return attributes;
};

const renderTemplate = (source, values) => {
  const previousEscape = Mustache.escape;
  Mustache.escape = (value) => String(value);
  try {
    return Mustache.render(source, values);
  } finally {
    Mustache.escape = previousEscape;
  }
};

const transpileMarkdown = (source, values) => {
  const fenced = source.replace(
    /^```\{ztmpl([^}]*)\}\s*\n([\s\S]*?)^```\s*$/gm,
    (_, rawAttributes, template) => {
      const attributes = parseAttributes(rawAttributes);
      return `\`\`\`${attributes.lang ?? ''}\n${renderTemplate(template, values).replace(/\n$/, '')}\n\`\`\``;
    }
  );

  return renderTemplate(fenced, values)
    .replace(/\{ztmpl([^}]*)\}`([^`]*)`/g, (_, rawAttributes, template) => {
      const attributes = parseAttributes(rawAttributes);
      const rendered = renderTemplate(template, values);
      return attributes.lang ? `\`${rendered}\`` : `\`${rendered}\``;
    })
    .replace(/^(#{1,6}\s+.*?)\s+\{#[^}]+\}\s*$/gm, '$1')
    .replace(
      /\]\(\.\.\/([^/)]+)\/?\)/g,
      (_, project) => `](https://help.mirrorz.org/${project}/?mirror=CQU)`
    );
};

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

const generated = [];
const skippedLocal = [];

for (const [mirrorId, meta] of Object.entries(localData)) {
  if (localDocs.has(mirrorId.toLowerCase())) {
    skippedLocal.push(mirrorId);
    continue;
  }

  const configuredSource = config.aliases?.[mirrorId] ?? mirrorId;
  const sourceName = sourceByLowercaseName.get(configuredSource.toLowerCase());
  if (!sourceName) continue;

  const projectDir = join(sourceDir, sourceName);
  const yamlPath = join(projectDir, `${config.language}.yaml`);
  if (!existsSync(yamlPath)) continue;

  const documentConfig = parseYaml(await readFile(yamlPath, 'utf8')) ?? {};
  const blocks = Array.isArray(documentConfig.block) ? documentConfig.block : ['index'];
  const path = config.paths?.[mirrorId] ?? `/${meta.gitRepo ? `git/${mirrorId}` : mirrorId}`;
  const endpoint = `${config.scheme}://${config.host}${path}`;
  const values = {
    ...resolveDefaultInputs(documentConfig.input),
    scheme: config.scheme,
    host: config.host,
    path,
    endpoint,
    sudo: 'sudo ',
  };

  const contents = [];
  for (const block of blocks) {
    const blockPath = join(projectDir, `${block}.${config.language}.md`);
    if (!existsSync(blockPath)) continue;
    contents.push(await readFile(blockPath, 'utf8'));
  }
  if (contents.length === 0) continue;

  const attribution = [
    '---',
    '',
    `本文档基于 [MirrorZ Docs](https://github.com/mirrorz-org/mirrorz-docs/tree/main/${encodeURIComponent(sourceName)}) 整理，`,
    '依据 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) 使用。',
  ].join('\n');
  const output = `${transpileMarkdown(contents.join('\n\n'), values).trim()}\n\n${attribution}\n`;
  await writeFile(join(outputDir, `${mirrorId}.mdx`), output, 'utf8');
  generated.push(mirrorId);
}

await writeFile(
  join(outputDir, 'manifest.json'),
  `${JSON.stringify({ generated, skippedLocal, generatedAt: new Date().toISOString() }, null, 2)}\n`,
  'utf8'
);

console.log(
  `[mirrorz-docs] 生成 ${generated.length} 篇文档，本地文档优先跳过 ${skippedLocal.length} 篇。`
);
