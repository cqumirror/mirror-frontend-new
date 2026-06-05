# CQU Mirror — University Open Source Mirror Frontend

[中文文档](README.md)

[![Build](https://github.com/cqumirror/mirror-frontend-new/actions/workflows/deploy.yml/badge.svg)](https://github.com/cqumirror/mirror-frontend-new/actions/workflows/deploy.yml)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0--or--later-blue.svg)](https://opensource.org/licenses/GPL-3.0)
[![Node](https://img.shields.io/badge/Node-%3E%3D20-green.svg)]()

A modern mirror site frontend built with React 19 + TypeScript + Material UI v9, designed to work with [tunasync](https://github.com/tuna/tunasync).

**Live site**: [https://mirrors.cqu.edu.cn](https://mirrors.cqu.edu.cn)

---

## Features

- Mirror list with real-time sync status
- Popular mirrors recommendation (`public/data/popular-mirrors.json`)
- Mirror favorites (persisted in browser localStorage)
- Config generator (one-click source replacement)
- Chinese/English bilingual, dark/light mode
- News/announcement system
- Mirror directory browsing
- Campus network detection (campus/public/IPv6 auto-identification)
- Mirror download modal (aggregates isoinfo.json file lists)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend Framework | React 19 + TypeScript |
| UI Components | Material UI v9 |
| Build Tool | Vite 7 |
| Data Fetching | TanStack Query |
| State Management | Zustand |
| Internationalization | react-i18next |
| Icons | simple-icons (distro logos) |
| Doc Rendering | MDX |
| Unit Testing | Vitest |
| Deployment | GitHub Actions → Static files |

---

## Project Structure

```
mirror-frontend-new/
├── content/                    ← Git submodule (cqumirror/mirror-document-new)
│   ├── docs/mdx/{zh,en}/*.mdx   Help documentation
│   └── news/mdx/{zh,en}/*.mdx   News articles
├── src/
│   ├── docs/index.ts           ← import.meta.glob loads content/docs/
│   ├── news/index.ts           ← import.meta.glob loads content/news/
│   ├── api/                    ← Data layer (tunasync JSON + local_data merge)
│   ├── components/             ← UI components
│   ├── pages/                  ← Pages
│   └── locales/{zh,en}.json   ← i18n translations
├── public/
│   └── data/
│       ├── local_data.json     ← Mirror metadata (name, description, file lists)
│       ├── announcements.json  ← Announcement data
│       └── popular-mirrors.json← Popular mirrors list
├── scripts/
│   ├── generate-sitemap.mjs    ← Post-build sitemap generator
│   └── probe-pages-real.mjs    ← Puppeteer E2E smoke test
└── .github/workflows/deploy.yml ← GitHub Actions build
```

---

## Cloning

This project uses a Git submodule. Clone with `--recurse-submodules`:

```bash
git clone --recurse-submodules https://github.com/cqumirror/mirror-frontend-new.git
```

If already cloned without submodules:

```bash
git submodule update --init --recursive
```

---

## Content Submodule (content/)

Help docs and news articles live in a separate repository [cqumirror/mirror-document-new](https://github.com/cqumirror/mirror-document-new), pulled in as a Git submodule at `content/`.

### Updating Content

When mirror-document-new has new commits, update the submodule pointer in the main project:

```bash
git submodule update --remote content
git add content
git commit -m "chore: update content submodule"
git push
```

### Adding Help Docs

In the mirror-document-new repository, create `your-mirror.mdx` under `docs/mdx/zh/` and `docs/mdx/en/`.

### Adding News

In the mirror-document-new repository, create `YYYY-MM-DD-slug.mdx` under `news/mdx/zh/` and `news/mdx/en/`, exporting a `meta` object:

```tsx
export const meta = {
  title: 'Title',
  date: '2026-06-05',
  summary: 'Summary',
};
```

---

## Adding a New Mirror

Add to `public/data/local_data.json`:

```json
"your-mirror": {
  "name": { "zh": "你的镜像", "en": "Your Mirror" },
  "desc": { "zh": "简介", "en": "Brief description" },
  "type": "os",
  "files": [
    { "name": "v1.0 amd64", "url": "/your-mirror/v1.0-amd64.iso" }
  ]
}
```

---

## Development

```bash
npm install           # Install dependencies
npm run dev           # Dev server :3000, proxies to mirrors.cqu.edu.cn
npm run build         # Type check + build + sitemap
npm run preview       # Preview build :4173
npm run typecheck     # TypeScript type check
npm run lint          # ESLint check
npm run lint:fix      # ESLint auto-fix
npm run test          # Vitest unit tests
```

---

## Data Flow

```
GET /static/tunasync.json  → Sync status
GET /data/local_data.json  ← Mirror name/description/files (static)
GET /static/isoinfo.json   → ISO file list (merged at runtime)
       ↓
transformOldJobs()         → Merge into Mirror[]
       ↓
React Query cache (60s)    → Components consume
```

---

## License

[GPL-3.0-or-later](LICENSE)
