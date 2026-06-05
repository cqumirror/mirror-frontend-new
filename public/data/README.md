# 运行时数据文件 / Runtime Data Files

本目录包含前端运行时通过 `fetch()` 加载的 JSON 数据文件。**无需重新构建即可更新**——直接编辑 JSON 文件，刷新页面即生效。

This directory contains JSON data files loaded at runtime via `fetch()`. **No rebuild needed** — edit the JSON and refresh the page.

---

## 文件列表 / Files

| 文件 | 用途 | 加载位置 |
|------|------|----------|
| `announcements.json` | 首页公告/通知横幅 | `src/components/home/AnnouncementBanner.tsx` |
| `local_data.json` | 镜像本地元数据 | `src/api/index.ts` |
| `popular-mirrors.json` | 首页常用镜像列表 | `src/hooks/useMirrors.ts` |
| `github-release/subprojects.json` | GitHub Release 子项目配置 | `src/data/githubReleaseSubprojects.ts` |
| `special-thanks.json` | 特别致谢名单 | `src/pages/SpecialThanks.tsx` |

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
    "zh": "重庆大学蓝客联盟",
    "en": "Lanunion, CQU",
    "url": "https://lanunion.cqu.edu.cn"
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
