# Project Context

## Purpose

**MCP Router** 是一个用于简化 Model Context Protocol (MCP) 服务器管理的桌面应用程序。

### 核心目标
- 🌐 **统一管理** - 集中管理多个 MCP 服务器（本地或远程）
- 🗂️ **组织管理** - 通过 Projects 和 Workspaces 组织 MCP 服务器上下文
- 🔧 **灵活控制** - 按服务器启用/禁用工具
- 🔒 **隐私优先** - 所有数据本地存储，不传输到外部
- 🔗 **无缝集成** - 与 Claude、Cline、Windsurf、Cursor 等 AI 工具集成

## Tech Stack

### 核心技术
- **TypeScript** (^5.9.2) - 主要编程语言，启用 strict mode
- **Node.js** (>=20.0.0) - 运行时环境
- **pnpm** (>=8.0.0) - 包管理器，使用 workspace
- **Turbo** (^2.5.6) - Monorepo 构建工具

### 桌面应用
- **Electron** (^36.9.0) - 跨平台桌面应用框架
- **React** (^19.1.1) - UI 框架
- **React Router** (^7.9.1) - 路由管理
- **Zustand** (^5.0.8) - 状态管理
- **Tailwind CSS** (^3.4.17) - 样式框架
- **i18next** (^24.2.3) - 国际化支持（支持英文、日文、中文）

### 数据存储
- **better-sqlite3** (^12.5.0) - SQLite 数据库

### 开发工具
- **Webpack** (^5.101.3) - 模块打包
- **ESLint** (^9.35.0) + **Prettier** (^3.6.2) - 代码质量和格式化
- **Playwright** (^1.55.0) - E2E 测试框架
- **Knip** (^5.63.1) - 未使用代码分析

### MCP 相关
- **@modelcontextprotocol/sdk** (^1.18.0) - MCP SDK
- **@anthropic-ai/dxt** (^0.2.6) - DXT 协议支持

## Project Conventions

### Code Style

#### TypeScript
- 使用 **strict mode** 确保类型安全
- 目标版本：ES2020
- 模块系统：ESNext
- 禁止动态导入（除特定入口文件外）
- 未使用变量使用 `_` 前缀忽略

#### 格式化
- **Prettier** 自动格式化所有代码
- ESLint 集成 Prettier，格式化错误会报错
- 遵循项目现有的代码模式，而非引入新风格

#### 命名约定
- 函数和组件保持小而专注
- 遵循现有代码中的命名模式

### Architecture Patterns

#### Monorepo 结构
```
mcp-router/
├── apps/
│   ├── electron/     # Electron 桌面应用
│   └── cli/          # CLI 工具
├── packages/
│   ├── shared/              # 共享逻辑和类型定义
│   ├── remote-api-types/    # 远程 API 类型定义
│   ├── ui/                  # 共享 UI 组件
│   └── tailwind-config/     # 共享 Tailwind 配置
└── docs/             # 设计文档和 ADR
```

#### 模块化架构（Modular Architecture）
Electron 主进程采用功能模块自包含的结构：

```
apps/electron/src/main/
├── modules/          # 功能模块（自包含）
│   ├── auth/         # 认证模块
│   ├── mcp/          # MCP 模块
│   ├── workflow/     # 工作流模块
│   └── workspace/    # 工作空间模块
├── utils/            # 工具函数
└── main.ts           # 入口点
```

每个模块包含：
- `.service.ts` - 业务逻辑
- `.repository.ts` - 数据访问层
- `.ipc.ts` - IPC 处理器
- `.types.ts` - 类型定义
- `__tests__/` - 测试文件

#### 类型定义管理
- **集中式类型管理** - 所有共享类型定义在 `packages/shared/src/types/`
- 禁止在组件、服务、工具文件中定义类型（组件 Props 除外）
- 使用自定义 ESLint 规则 (`no-scattered-types`, `no-type-reexport`) 强制执行
- 类型定义位置：
  - `packages/shared/src/types/` - 主要共享类型
  - `packages/remote-api-types/src/` - 远程 API 类型
  - `apps/electron/src/main/lib/database/schema/` - 数据库类型
  - `*.d.ts` - 全局类型声明

#### 依赖关系规则
- 单方向依赖：IPC Handler → Service → Repository → Database
- 禁止模块间直接依赖，通过共享接口协作
- 使用依赖注入模式

### Testing Strategy

#### E2E 测试
- 使用 **Playwright** 进行端到端测试
- 测试文件位于 `apps/electron/e2e/`
- 在关键功能变更时添加或更新测试（认证、工作空间管理、网络等）
- 运行测试：`pnpm test:e2e`

#### 测试要求
- 变更行为时添加或更新测试
- 如果无法添加测试，需在 PR 描述中说明原因
- Electron 相关变更应运行 E2E 测试

### Git Workflow

#### 分支策略
- 从 `main` 分支创建功能分支
- 保持变更聚焦于单一主题或功能
- 小规模、增量的 PR 更易于审查和合并

#### 提交前检查
在推送前运行：
- `pnpm build` - 构建所有包和应用
- `pnpm typecheck` - TypeScript 类型检查
- `pnpm lint:fix` - ESLint 检查和修复
- `pnpm test:e2e` - E2E 测试（Electron 相关变更）

#### Pull Request
- 使用清晰、描述性的标题
- 填写 PR 模板
- 链接相关 issues（如 `Closes #123`）
- 描述测试情况和已知限制
- 更新相关文档（README、docs/ 等）

## Domain Context

### MCP (Model Context Protocol)
- MCP 是一种协议，用于 AI 应用与外部数据源和工具集成
- MCP Router 作为中间层，统一管理多个 MCP 服务器
- 支持 DXT、JSON、Manual 三种连接方式

### 核心概念
- **Projects** - 将 MCP 服务器分组管理
- **Workspaces** - 类似浏览器配置文件，管理不同的工作模式
- **Tools** - MCP 服务器提供的工具，可以按服务器启用/禁用
- **Resources** - MCP 服务器提供的资源

### 数据隐私
- 所有数据（请求日志、配置、服务器数据）本地存储
- API 密钥和认证凭据本地存储，不传输到外部
- 用户完全控制 MCP 服务器连接和数据

## Important Constraints

### 技术约束
- **Node.js 版本**：必须 >= 20.0.0
- **pnpm 版本**：必须 >= 8.0.0
- **包管理器**：仅使用 pnpm，不使用 npm 或 yarn
- **类型定义**：必须遵循集中式类型管理规则
- **动态导入**：禁止使用（除特定入口文件）

### 架构约束
- 模块间禁止直接依赖
- 类型定义必须在指定位置
- 禁止类型再导出（`no-type-reexport`）

### 平台支持
- **桌面平台**：Windows 和 macOS
- **架构**：支持 x64 和 arm64

## External Dependencies

### 关键服务
- **GitHub** - 代码仓库和发布
- **Discord** - 社区交流
- **PostHog** - 分析（可选，用户可禁用）

### API 集成
- **MCP 服务器** - 通过 MCP 协议连接
- **远程 MCP 服务器** - 支持 HTTP 连接

### 发布渠道
- **GitHub Releases** - 应用分发
- **npm** - CLI 工具发布（`@mcp_router/cli`）
