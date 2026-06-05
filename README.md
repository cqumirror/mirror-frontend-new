# CQU Mirror — 重庆大学开源软件镜像站前端

[English](README_en.md)

[![Build](https://github.com/cqumirror/mirror-frontend-new/actions/workflows/deploy.yml/badge.svg)](https://github.com/cqumirror/mirror-frontend-new/actions/workflows/deploy.yml)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0--or--later-blue.svg)](https://opensource.org/licenses/GPL-3.0)
[![Node](https://img.shields.io/badge/Node-%3E%3D20-green.svg)]()

基于 React 19 + TypeScript + Material UI v9 构建的现代化镜像站前端，配合 [tunasync](https://github.com/tuna/tunasync) 使用。

**线上地址**：[https://mirrors.cqu.edu.cn](https://mirrors.cqu.edu.cn)

---

## 功能特性

- 镜像列表 + 实时同步状态
- 热门镜像推荐（`public/data/popular-mirrors.json`）
- 镜像收藏（浏览器 localStorage 持久化）
- 配置生成器（一键换源）
- 中英双语、深色/浅色模式
- 新闻/公告系统
- 镜像目录浏览
- 校园网检测（校园网/公网/IPv6 自动识别）
- 镜像下载弹窗（整合 isoinfo.json 文件列表）

---

## 技术栈

| 层次 | 技术 |
|------|------|
| 前端框架 | React 19 + TypeScript |
| UI 组件 | Material UI v9 |
| 构建工具 | Vite 7 |
| 数据获取 | TanStack Query |
| 状态管理 | Zustand |
| 国际化 | react-i18next |
| 图标 | simple-icons（发行版 Logo） |
| 文档渲染 | MDX |
| 单元测试 | Vitest |
| 部署 | GitHub Actions → 静态文件 |

---

## 项目结构

```
mirror-frontend-new/
├── content/                    ← Git 子模块（cqumirror/mirror-document-new）
│   ├── docs/mdx/{zh,en}/*.mdx   帮助文档
│   └── news/mdx/{zh,en}/*.mdx   新闻文章
├── src/
│   ├── docs/index.ts           ← import.meta.glob 加载 content/docs/
│   ├── news/index.ts           ← import.meta.glob 加载 content/news/
│   ├── api/                    ← 数据层（tunasync JSON + local_data 合并）
│   ├── components/             ← UI 组件
│   ├── pages/                  ← 页面
│   └── locales/{zh,en}.json   ← i18n 翻译
├── public/
│   └── data/
│       ├── local_data.json     ← 镜像元数据（名称、描述、文件列表）
│       ├── announcements.json  ← 公告数据
│       └── popular-mirrors.json← 常用镜像列表
├── scripts/
│   ├── generate-sitemap.mjs    ← 构建后自动生成 sitemap
│   └── probe-pages-real.mjs    ← Puppeteer E2E 冒烟测试
└── .github/workflows/deploy.yml ← GitHub Actions 构建
```

---

## 克隆

本项目使用了 Git 子模块，克隆时需要加 `--recurse-submodules`：

```bash
git clone --recurse-submodules https://github.com/cqumirror/mirror-frontend-new.git
```

如果已克隆但未拉取子模块：

```bash
git submodule update --init --recursive
```

---

## 内容子模块（content/）

帮助文档和新闻文章存放在独立仓库 [cqumirror/mirror-document-new](https://github.com/cqumirror/mirror-document-new)，通过 Git 子模块引入到 `content/` 目录。

### 更新内容

当 mirror-document-new 有新提交时，在主项目中更新子模块指针：

```bash
git submodule update --remote content
git add content
git commit -m "chore: update content submodule"
git push
```

### 添加帮助文档

在 mirror-document-new 仓库中，于 `docs/mdx/zh/` 和 `docs/mdx/en/` 下新建 `your-mirror.mdx`。

### 添加新闻

在 mirror-document-new 仓库中，于 `news/mdx/zh/` 和 `news/mdx/en/` 下新建 `YYYY-MM-DD-slug.mdx`，需导出 `meta` 对象：

```tsx
export const meta = {
  title: '标题',
  date: '2026-06-05',
  summary: '摘要',
};
```

---

## 添加新镜像

在 `public/data/local_data.json` 中添加：

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

## 开发调试

```bash
npm install           # 安装依赖
npm run dev           # 本地开发 :3000，代理到 mirrors.cqu.edu.cn
npm run build         # 类型检查 + 构建 + sitemap
npm run preview       # 预览构建 :4173
npm run typecheck     # TypeScript 类型检查
npm run lint          # ESLint 检查
npm run lint:fix      # ESLint 自动修复
npm run test          # Vitest 单元测试
```

---

## 数据流

```
GET /static/tunasync.json  → 同步状态
GET /data/local_data.json  → 镜像名称/描述/文件列表（静态）
GET /static/isoinfo.json   → ISO 文件列表（运行时合并）
       ↓
transformOldJobs()         → 合并为 Mirror[]
       ↓
React Query 缓存 (60s)    → 组件消费
```

---

## 许可证

[GPL-3.0-or-later](LICENSE)

---

## 相关文档 / Related Docs

- [运行时数据文件说明](public/data/README.md) — announcements、local_data、popular-mirrors 等 JSON 文件格式
- [GitHub Release 子项目配置](public/data/github-release/README.md) — 添加新 GitHub Release 镜像
- [内容仓库说明](content/README.md) — 帮助文档与新闻文章编写规范
