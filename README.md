# CQU Mirror — 高校开源镜像站前端

[English](README_en.md)

[![CI](https://github.com/cqumirror/mirror-frontend-new/actions/workflows/ci.yml/badge.svg)](https://github.com/cqumirror/mirror-frontend-new/actions/workflows/ci.yml)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0--or--later-blue.svg)](https://opensource.org/licenses/GPL-3.0)
[![Node](https://img.shields.io/badge/Node-%3E%3D20-green.svg)]()

基于 React + TypeScript + Material UI 构建的现代化镜像站前端，设计用于配合 [tunasync-rs](https://github.com/cqumirror/tunasync-rs)（推荐）或 [tunasync](https://github.com/tuna/tunasync) 使用，开箱即用。

**线上地址**：[https://mirrors.cqu.edu.cn](https://mirrors.cqu.edu.cn)

---

## 效果预览

- 镜像列表、同步状态实时显示
- 热门镜像推荐（`popular-mirrors.json`）
- 镜像收藏功能（浏览器本地持久化）
- 配置生成器（一键生成换源配置）
- 中英双语、深色/浅色模式
- 新闻/公告系统
- 镜像目录浏览（Nginx FancyIndex 风格统一）
- 校园网检测（自动识别校园网/公网/IPv6）
- 系统监控面板（Grafana + Prometheus）

---

## 技术栈

| 层次     | 技术                        |
| -------- | --------------------------- |
| 前端框架 | React 19 + TypeScript       |
| UI 组件  | Material UI v9              |
| 构建工具 | Vite 7                      |
| 数据获取 | TanStack Query + Axios      |
| 状态管理 | Zustand                     |
| 国际化   | react-i18next + i18next     |
| 图标     | simple-icons（发行版 Logo） |
| 文档渲染 | MDX（帮助文档编译到前端）   |
| 单元测试 | Vitest + Testing Library    |
| Web 服务 | Nginx（含 FancyIndex 模块） |
| 部署方式 | Docker + Docker Compose     |
| 监控     | Prometheus + Grafana        |

---

## 与 tunasync 的配合方式

本项目**只提供前端展示**，镜像同步任务由独立的 tunasync 程序负责。两者的关系如下：

```
tunasync worker  →  同步镜像文件到 /data/mirrors/
                        ↓
tunasync manager →  提供 HTTP API（默认 :12345/jobs）
                        ↓
   Nginx          →  反向代理 /jobs 到 tunasync manager
                  →  前端 React SPA 读取状态并展示
                  →  FancyIndex 直接浏览镜像目录
```

### 推荐使用 tunasync-rs（Rust 重写版）

> **推荐**：[tunasync-rs](https://github.com/cqumirror/tunasync-rs) 是专为本项目优化的 tunasync Rust 重写版，与 mirror-frontend-new 拥有更好的适配性，建议优先使用。

| 特性 | tunasync-rs | 官方 tunasync (Go) |
|------|------------|-------------------|
| 语言 | Rust | Go |
| 与本项目适配 | ✅ 深度适配 | 基本兼容 |
| 仓库 | [cqumirror/tunasync-rs](https://github.com/cqumirror/tunasync-rs) | [tuna/tunasync](https://github.com/tuna/tunasync) |

tunasync manager 需要**单独部署**（可直接跑在宿主机上），本项目的 `docker-compose.yml` 中 `backend` 服务指向的正是 tunasync manager。

---

## 快速部署

### 前置条件

- Node.js >= 20.0.0、npm >= 10.0.0（开发时需要）
- Docker + Docker Compose（推荐 Compose v2）
- tunasync manager 已在运行（推荐使用 [tunasync-rs](https://github.com/JCIOTeam/tunasync-rs)，默认监听 `:12345`）
- 镜像数据目录（如 `/data/mirrors/`）

### 第一步：克隆并配置

```bash
git clone https://github.com/cqumirror/mirror-frontend-new.git
cd mirror-frontend-new
```

复制环境变量示例并按需修改：

```bash
cp .env.example .env
# 至少修改 GRAFANA_PASSWORD
```

修改 `docker/default.conf` 中的 `server_name`，改为你的域名：

```nginx
server_name mirrors.example.edu.cn;
```

### 第二步：配置 tunasync backend 地址

在 `docker/default.conf` 中，确认 tunasync manager 的地址和端口：

```nginx
location = /jobs {
    proxy_pass http://<tunasync-manager-host>:12345/jobs;
    ...
}
```

如果 tunasync manager 和前端容器在同一台机器上（宿主机运行），可以用：

```nginx
proxy_pass http://host.docker.internal:12345/jobs;
```

或直接把 `backend` 的 `image` 替换为你的 tunasync manager 容器。

### 第三步：启动服务

```bash
docker compose up -d --build
```

访问 `http://your-domain` 即可看到镜像站主页。  
Grafana 监控面板在 `http://your-domain/grafana/`。

---

## 目录结构（核心部分）

```
.
├── src/                    # 前端源代码
│   ├── docs/mdx/           # 镜像帮助文档（zh/en，MDX 格式）
│   └── pages/              # 各页面组件
├── public/
│   ├── local_data.json     # 各镜像的补充信息（名称、描述、ISO 文件列表）
│   └── announcements.json  # 公告数据
├── nginx/
│   ├── header.html         # FancyIndex 页头
│   ├── footer.html         # FancyIndex 页脚
│   └── fancyindex.css      # FancyIndex 样式（需自行创建，见下方说明）
├── docker/
│   ├── nginx.conf          # Nginx 主配置
│   └── default.conf        # 站点配置（反代、FancyIndex、SPA 路由）
├── monitoring/             # Prometheus + Grafana 配置
├── docker-compose.yml
└── Dockerfile
```

---

## 添加新镜像

**1. 补充展示信息**（名称、描述、ISO 文件列表）

在 `public/local_data.json` 中添加：

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

**2. 添加帮助文档**

在 `content/docs/mdx/zh/` 和 `content/docs/mdx/en/` 下新建 `your-mirror.mdx`，写上换源方法。

---

## 开发调试

```bash
npm install           # 安装依赖
npm run dev           # 本地开发服务器 :3000，自动代理 /jobs 到线上
npm run build         # 类型检查 + 构建 + sitemap 生成
npm run preview       # 预览生产构建 :4173
npm run typecheck     # TypeScript 类型检查
npm run lint          # ESLint 检查
npm run lint:fix      # ESLint 自动修复
npm run format        # Prettier 格式化
npm run test          # 运行测试（Vitest）
npm run test:watch    # 监听模式运行测试
npm run test:coverage # 测试覆盖率报告
```

---

## CI/CD

项目使用 GitHub Actions 进行持续集成（`.github/workflows/ci.yml`），每次推送和 PR 自动运行：

1. **Lint** — ESLint 代码规范检查
2. **TypeCheck** — TypeScript 类型检查
3. **Test** — Vitest 单元测试
4. **Build** — 生产构建
5. **Audit** — npm 安全审计
6. **Docker Smoke Test** — Docker 构建冒烟测试

---

## 许可证

[GPL-3.0-or-later](LICENSE)
