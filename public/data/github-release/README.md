# GitHub Release 子项目配置 / GitHub Release Sub-project Configuration

## 配置文件 / Configuration File

**路径 / Path**: `public/data/github-release/subprojects.json`

```json
[
  { "slug": "office-tool",  "repoPath": "YerongAI/Office-Tool" },
  { "slug": "obs-studio",   "repoPath": "obsproject/obs-studio" }
]
```

### 字段说明 / Fields

| 字段 | 类型 | 说明 |
|------|------|------|
| `slug` | string | 子项目标识，对应帮助文档文件名 `github-release-{slug}.mdx` |
| `repoPath` | string | 服务器 `/github-release/` 下的 `org/repo` 目录路径 |

- `slug` → 子项目页面路径: `/mirrors/github-release-{slug}`
- `slug` → 帮助文档: `docs/mdx/{zh,en}/github-release-{slug}.mdx`
- `repoPath` → 文件浏览: `https://mirrors.cqu.edu.cn/github-release/{repoPath}/`

---

## 添加新子项目 / Adding a New Sub-project

以添加 **Neovim** 为例 / Example: adding **Neovim**:

### 1. 编辑配置文件 / Edit the config

在 `subprojects.json` 数组末尾添加一项：

```json
{ "slug": "neovim", "repoPath": "neovim/neovim" }
```

### 2. 创建帮助文档 / Create help docs

在 `content/docs/mdx/` 下创建中英文文档：

- `content/docs/mdx/zh/github-release-neovim.mdx`
- `content/docs/mdx/en/github-release-neovim.mdx`

文档格式参见 `content/README.md` 中的帮助文档章节。

### 3. 效果 / Result

| URL | 说明 |
|-----|------|
| `/mirrors/github-release-neovim` | 子项目帮助页（显示文档 + 同步状态） |
| `/mirrors/github-release-neovim?tab=files` | 文件列表（nginx FancyIndex 目录浏览） |
| `/mirrors/github-release-neovim?tab=release` | Release 列表（GithubReleaseViewer） |
| `/mirrors/github-release?org=neovim&repo=neovim` | 从 Git & GitHub 页面卡片进入 |

无需修改任何 TypeScript 源码。只需编辑 JSON 和添加 MDX 文档即可。

No TypeScript source code changes needed. Just edit the JSON and add MDX docs.

---

## 相关文档 / Related Docs

- [项目主页](../../../README.md) — 功能特性、技术栈、开发调试
- [运行时数据文件说明](../README.md) — announcements、local_data、popular-mirrors 等 JSON 文件格式
- [内容仓库说明](../../../content/README.md) — 帮助文档与新闻文章编写规范
