# CQU Mirror — University Open Source Mirror Frontend

[![CI](https://github.com/cqumirror/mirror-frontend-new/actions/workflows/ci.yml/badge.svg)](https://github.com/cqumirror/mirror-frontend-new/actions/workflows/ci.yml)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0--or--later-blue.svg)](https://opensource.org/licenses/GPL-3.0)
[![Node](https://img.shields.io/badge/Node-%3E%3D20-green.svg)]()

[中文文档](README.md)

A modern mirror site frontend built with React + TypeScript + Material UI, designed to work with [tunasync-rs](https://github.com/cqumirror/tunasync-rs) (recommended) or [tunasync](https://github.com/tuna/tunasync) out of the box.

**Live site**: [https://mirrors.cqu.edu.cn](https://mirrors.cqu.edu.cn)

---

## Feature Preview

- Mirror list with real-time sync status
- Popular mirrors recommendation (`popular-mirrors.json`)
- Mirror favorites (persisted in browser localStorage)
- Config generator (one-click source replacement config)
- Chinese/English bilingual, dark/light mode
- News/announcement system
- Mirror directory browsing (unified Nginx FancyIndex style)
- Campus network detection (auto-identify campus/public/IPv6)
- System monitoring dashboard (Grafana + Prometheus)

---

## Tech Stack

| Layer | Technology |
| ------ | ---------- |
| Frontend Framework | React 19 + TypeScript |
| UI Components | Material UI v9 |
| Build Tool | Vite 7 |
| Data Fetching | TanStack Query + Axios |
| State Management | Zustand |
| Internationalization | react-i18next + i18next |
| Icons | simple-icons (distro logos) |
| Doc Rendering | MDX (help docs compiled into frontend) |
| Unit Testing | Vitest + Testing Library |
| Web Server | Nginx (with FancyIndex module) |
| Deployment | Docker + Docker Compose |
| Monitoring | Prometheus + Grafana |

---

## How It Works with tunasync

This project **only provides the frontend**; mirror sync tasks are handled by a separate tunasync program. The relationship is as follows:

```
tunasync worker  →  Sync mirror files to /data/mirrors/
                        ↓
tunasync manager →  Provides HTTP API (default :12345/jobs)
                        ↓
   Nginx          →  Reverse proxies /jobs to tunasync manager
                  →  Frontend React SPA reads status and displays
                  →  FancyIndex for direct mirror directory browsing
```

### Recommended: tunasync-rs (Rust rewrite)

> **Recommended**: [tunasync-rs](https://github.com/cqumirror/tunasync-rs) is a Rust rewrite of tunasync, optimized specifically for this project with better compatibility. Use it for the best experience.

| Feature | tunasync-rs | Official tunasync (Go) |
|---------|------------|----------------------|
| Language | Rust | Go |
| Compatibility with this project | ✅ Deeply integrated | Basically compatible |
| Repository | [cqumirror/tunasync-rs](https://github.com/cqumirror/tunasync-rs) | [tuna/tunasync](https://github.com/tuna/tunasync) |

The tunasync manager needs to be **deployed separately** (it can run on the host directly). The `backend` service in this project's `docker-compose.yml` points to the tunasync manager.

---

## Quick Deployment

### Prerequisites

- Node.js >= 20.0.0, npm >= 10.0.0 (for development)
- Docker + Docker Compose (Compose v2 recommended)
- tunasync manager running (recommended: [tunasync-rs](https://github.com/cqumirror/tunasync-rs), default port `:12345`)
- Mirror data directory (e.g. `/data/mirrors/`)

### Step 1: Clone and Configure

```bash
git clone https://github.com/cqumirror/mirror-frontend-new.git
cd mirror-frontend-new
```

Copy the environment variable example and modify as needed:

```bash
cp .env.example .env
# At minimum, change GRAFANA_PASSWORD
```

Modify `server_name` in `docker/default.conf` to your domain:

```nginx
server_name mirrors.example.edu.cn;
```

### Step 2: Configure tunasync Backend Address

In `docker/default.conf`, confirm the tunasync manager address and port:

```nginx
location = /jobs {
    proxy_pass http://<tunasync-manager-host>:12345/jobs;
    ...
}
```

If the tunasync manager and the frontend container are on the same machine (running on the host), you can use:

```nginx
proxy_pass http://host.docker.internal:12345/jobs;
```

Or replace the `backend` image with your tunasync manager container directly.

### Step 3: Start Services

```bash
docker compose up -d --build
```

Visit `http://your-domain` to see the mirror site homepage.
Grafana monitoring dashboard is at `http://your-domain/grafana/`.

---

## Directory Structure (Core)

```
.
├── src/                    # Frontend source code
│   ├── docs/mdx/           # Mirror help docs (zh/en, MDX format)
│   └── pages/              # Page components
├── public/
│   ├── local_data.json     # Supplementary mirror info (name, description, ISO file list)
│   └── announcements.json  # Announcement data
├── nginx/
│   ├── header.html         # FancyIndex page header
│   ├── footer.html         # FancyIndex page footer
│   └── fancyindex.css      # FancyIndex styles (create manually, see notes below)
├── docker/
│   ├── nginx.conf          # Nginx main config
│   └── default.conf        # Site config (reverse proxy, FancyIndex, SPA routing)
├── monitoring/             # Prometheus + Grafana config
├── docker-compose.yml
└── Dockerfile
```

---

## Adding a New Mirror

**1. Add display info** (name, description, ISO file list)

Add to `public/local_data.json`:

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

**2. Add help documentation**

Create `your-mirror.mdx` under `content/docs/mdx/zh/` and `content/docs/mdx/en/` with source replacement instructions.

---

## Development

```bash
npm install           # Install dependencies
npm run dev           # Dev server on :3000, auto-proxies /jobs to production
npm run build         # Type check + build + sitemap generation
npm run preview       # Preview production build on :4173
npm run typecheck     # TypeScript type checking
npm run lint          # ESLint check
npm run lint:fix      # ESLint auto-fix
npm run format        # Prettier formatting
npm run test          # Run tests (Vitest)
npm run test:watch    # Watch mode tests
npm run test:coverage # Test coverage report
```

---

## CI/CD

The project uses GitHub Actions for continuous integration (`.github/workflows/ci.yml`), running automatically on every push and PR:

1. **Lint** — ESLint code style check
2. **TypeCheck** — TypeScript type checking
3. **Test** — Vitest unit tests
4. **Build** — Production build
5. **Audit** — npm security audit
6. **Docker Smoke Test** — Docker build smoke test

---

## License

[GPL-3.0-or-later](LICENSE)
