# 运行时数据文件 / Runtime Data Files

本目录包含前端运行时通过 `fetch()` 加载的 JSON 数据文件。**无需重新构建即可更新**——直接编辑 JSON 文件，刷新页面即生效。

This directory contains JSON data files loaded at runtime via `fetch()`. **No rebuild needed** — edit the JSON and refresh the page.

---

## 文件列表 / Files

| 文件 | 用途 | 加载位置 |
|------|------|----------|
| `alerts.json` | 最高等级警报（全局遮罩弹窗） | `src/components/common/GlobalAlertModal.tsx` |
| `announcements.json` | 首页公告/通知横幅 | `src/components/home/AnnouncementBanner.tsx` |
| `local_data.json` | 镜像本地元数据 | `src/api/index.ts` |
| `popular-mirrors.json` | 首页常用镜像列表 | `src/hooks/useMirrors.ts` |
| `github-release/subprojects.json` | GitHub Release 子项目配置 | `src/data/githubReleaseSubprojects.ts` |
| `special-thanks.json` | 特别致谢名单 | `src/pages/SpecialThanks.tsx` |
| `manifest.json` | PWA 应用清单 | `index.html` (`<link rel="manifest">`) |

---

## alerts.json — 最高等级警报

全局遮罩弹窗，用于发布最高等级警报（如镜像漏洞、安全事件等）。存在活跃警报时，页面被遮罩覆盖，用户必须点击「我已知晓」后才能继续浏览。

```json
[
  {
    "id": "example-alert-2026",
    "level": "critical",
    "active": true,
    "title": { "zh": "安全警告", "en": "Security Alert" },
    "content": { "zh": "xxx 镜像存在安全风险，请暂时不要使用。", "en": "xxx mirror has a security risk, please avoid using it." },
    "link": { "url": "/news/xxx", "label": { "zh": "查看详情", "en": "Details" } },
    "date": "2026-06-19"
  }
]
```

### 字段说明 / Fields

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 唯一标识，用于确认状态持久化 |
| `level` | string | 是 | 警报等级（预留扩展，目前仅 `critical`） |
| `active` | boolean | 是 | 是否激活。`false` 不显示 |
| `title` | {zh, en} | 是 | 警报标题 |
| `content` | {zh, en} | 是 | 警报正文 |
| `link` | object \| null | 是 | 附带链接，`null` 表示无链接 |
| `link.url` | string | 是 | 链接地址 |
| `link.label` | {zh, en} | 是 | 链接显示文字 |
| `date` | string | 是 | 日期，格式 `YYYY-MM-DD`。多条活跃警报取最新 |

- 空数组 `[]` = 无警报，不显示弹窗
- 用户确认后，该 `id` 写入 localStorage，刷新不再出现
- 如需重新触发，更改 `id` 或让用户清除 localStorage

---

## announcements.json — 首页公告

数组，每个元素是一条公告。

```json
[
  {
    "id": "welcome",
    "type": "info",
    "pinned": true,
    "dismissible": true,
    "date": "2024-09-01",
    "title": { "zh": "标题", "en": "Title" },
    "content": { "zh": "内容", "en": "Content" },
    "link": {
      "url": "https://example.com",
      "label": { "zh": "链接文字", "en": "Link text" }
    }
  }
]
```

### 字段说明 / Fields

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 唯一标识，用于关闭状态持久化 |
| `type` | string | 是 | 显示样式：`info` / `success` / `warning` / `error` |
| `pinned` | boolean | 是 | 是否置顶（置顶公告始终显示） |
| `dismissible` | boolean | 是 | 用户是否可以关闭 |
| `date` | string | 是 | 日期，格式 `YYYY-MM-DD`。非置顶公告仅显示近 30 天 |
| `title` | {zh, en} | 是 | 标题（中英双语） |
| `content` | {zh, en} | 是 | 正文内容 |
| `link` | object \| null | 是 | 附带链接，`null` 表示无链接 |
| `link.url` | string | 是 | 链接地址 |
| `link.label` | {zh, en} | 是 | 链接显示文字 |

---

## local_data.json — 镜像本地元数据

以镜像 ID 为 key 的对象。每个条目提供该镜像的补充信息，与后端 tunasync 数据合并后展示。

```json
{
  "ubuntu": {
    "name": { "zh": "Ubuntu", "en": "Ubuntu" },
    "desc": { "zh": "Ubuntu 的安装镜像和软件包仓库", "en": "Ubuntu install images and package repository" },
    "type": "os",
    "helpUrl": "ubuntu",
    "files": [],
    "status": "succeeded"
  }
}
```

### 字段说明 / Fields

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | {zh, en} | 否 | 镜像名称（覆盖后端默认值） |
| `desc` | {zh, en} | 否 | 镜像描述 |
| `type` | string | 否 | 分类标签，见下表 |
| `helpUrl` | string | 否 | 对应帮助文档文件名（如 `"ubuntu"` → `docs/mdx/zh/ubuntu.mdx`） |
| `files` | array | 否 | 下载文件列表，通常由 `isoinfo.json` 动态填充，此处可留空 |
| `status` | string | 否 | 覆盖后端同步状态（如 `cached`、`paused`），用于快照类镜像 |

### `type` 取值 / Type Values

| 值 | 含义 | 示例 |
|----|------|------|
| `os` | 操作系统 | Ubuntu, Debian, Arch Linux |
| `lang` | 编程语言 | CPAN (Perl), CRAN (R), PyPI |
| `tool` | 工具软件 | Adoptium, Chocolatey, Docker |
| `none` | 其他 / 未分类 | AOSP, CPAN (旧) |

### `files` 数组元素 / Files Array Items

```json
{ "name": "ubuntu-24.04-desktop-amd64.iso", "url": "/ubuntu-releases/ubuntu-24.04-desktop-amd64.iso" }
```

- `url` 仅允许 `https://` 开头或 `/` 开头的相对路径
- 协议相对 URL（`//evil.com`）会被安全过滤

### `status` 可选值 / Status Override Values

| 值 | 含义 |
|----|------|
| `succeeded` | 同步成功 |
| `syncing` | 同步中 |
| `failed` | 同步失败 |
| `cached` | 快照（不再同步，文件仍可下载） |
| `paused` | 已暂停 |
| `disabled` | 已禁用 |

---

## popular-mirrors.json — 常用镜像列表

镜像 ID 数组，按首页展示顺序排列。加载失败时会回退到内置默认列表。

```json
["ubuntu", "debian", "archlinux", "centos", "rockylinux", "opensuse", "fedora", "kali"]
```

- 数组中的 ID 必须与 `local_data.json` 或后端 tunasync 数据中的镜像 ID 一致
- 顺序即展示顺序
- 建议保持 6–10 个条目

---

## 添加新公告 / Adding a New Announcement

在 `announcements.json` 数组中追加一项即可。刷新页面即生效，无需重新构建。

## 发布警报 / Publishing an Alert

在 `alerts.json` 数组中追加一项，设置 `active: true`。刷新页面即生效。用户确认后该警报不再显示；如需重新触发，更改 `id`。

## 修改常用镜像 / Updating Popular Mirrors

编辑 `popular-mirrors.json` 数组。刷新页面即生效。

## 添加镜像元数据 / Adding Mirror Metadata

在 `local_data.json` 中以镜像 ID 为 key 添加条目。如果后端已有该镜像的数据，只需填写需要覆盖的字段。

---

## special-thanks.json — 特别致谢名单

数组，按时间顺序排列。每项为一个贡献者或组织。

```json
[
  {
    "zh": "重庆大学蓝盟",
    "en": "Lanunion, CQU",
    "url": "https://mirrors.cqu.edu.cn/introductions/"
  },
  { "zh": "陈泱宇", "en": "Chen Yangyu" }
]
```

### 字段说明 / Fields

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `zh` | string | 是 | 中文名称 |
| `en` | string | 是 | 英文名称 |
| `url` | string | 否 | 可选链接（个人主页、组织官网等） |

---

## manifest.json — PWA 应用清单

PWA (Progressive Web App) 清单文件，让浏览器将站点识别为可安装应用。用户可通过 Chrome "安装应用" 或 iOS Safari "添加到主屏幕" 将镜像站添加为桌面应用。

```json
{
  "name": "重庆大学开源软件镜像站",
  "short_name": "CQU Mirror",
  "description": "重庆大学开源软件镜像站致力于为国内和校内用户提供高质量的开源软件镜像、Linux 镜像源服务。",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1976d2",
  "lang": "zh-CN",
  "icons": [
    {
      "src": "/favicon.svg",
      "sizes": "any",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    }
  ]
}
```

### 字段说明 / Fields

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 应用全称，显示在安装提示和系统应用列表中 |
| `short_name` | string | 是 | 应用简称，显示在主屏幕图标下方（建议 ≤12 字符） |
| `description` | string | 否 | 应用描述 |
| `start_url` | string | 是 | 启动时打开的 URL |
| `display` | string | 是 | 显示模式：`standalone`（独立窗口，无地址栏） / `fullscreen` / `minimal-ui` |
| `background_color` | string | 否 | 启动画面背景色 |
| `theme_color` | string | 否 | 应用主题色（影响状态栏颜色），应与 `index.html` 中的 `<meta name="theme-color">` 一致 |
| `lang` | string | 否 | 主要语言标签 |
| `icons` | array | 是 | 应用图标列表 |

### Icons 数组元素

| 字段 | 类型 | 说明 |
|------|------|------|
| `src` | string | 图标路径（相对于 public 目录） |
| `sizes` | string | 图标尺寸，`"any"` 表示矢量图（SVG）可适配任意尺寸 |
| `type` | string | MIME 类型 |
| `purpose` | string | 用途：`any`（通用）、`maskable`（自适应遮罩）、`maskable` 兼容圆形/圆角裁切 |

### 注意事项

- 图标使用 SVG 格式（`/favicon.svg`），无需提供多种 PNG 尺寸
- `theme_color` 需与 `index.html` 的 `<meta name="theme-color">` 保持一致
- 修改后无需重新构建，刷新页面即生效

---

## 相关文档 / Related Docs

- [项目主页](../../README.md) — 功能特性、技术栈、开发调试
- [GitHub Release 子项目配置](github-release/README.md) — 添加新 GitHub Release 镜像
- [内容仓库说明](../../content/README.md) — 帮助文档与新闻文章编写规范
