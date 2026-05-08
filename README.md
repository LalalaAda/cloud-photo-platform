# ☁️ 云相册系统 (Cloud Photo Platform)

融合高性能桌面体验与云端存储的云相册系统。Electron 桌面端 + Node.js 后端 + MinIO 对象存储。

---

## 技术栈

| 层 | 技术 |
|---|------|
| 桌面端 | Electron 35 + React 19 + TypeScript 5.8 |
| 前端框架 | Tailwind v4 + Lucide Icons + Zustand |
| 构建工具 | Vite 6 + electron-vite |
| 后端 | Express 5 + Drizzle ORM + sql.js |
| 对象存储 | MinIO (AWS S3 兼容) |
| 包管理 | pnpm 10 + Turborepo |

## 项目结构

```
cloud-photo-platform/
├── apps/
│   ├── desktop/     # Electron 桌面端 (main + preload + React renderer)
│   └── server/      # Express API 服务 + Drizzle ORM + RustFS
├── packages/
│   └── shared/      # 共享类型、Zod schemas、工具函数
├── AGENTS.md        # AI 辅助开发知识库
└── turbo.json       # Turborepo 任务编排
```

## 功能特性

### ✅ 已实现

- **Monorepo 架构**: pnpm workspaces + Turborepo 多包管理
- **虚拟滚动瀑布流**: 基于 translate3d 的 GPU 加速布局，仅渲染视口±缓冲区
- **图片懒加载**: `decoding="async"` + 骨架屏占位 + 渐变过渡
- **全屏灯箱预览**: 键盘导航 (←/→/Esc/R)、旋转、EXIF 信息
- **RESTful API**: Express 5 路由 (auth/media/albums/upload/download/sync)
- **JWT 认证**: bcrypt 密码哈希 + 中间件鉴权
- **对象存储**: MinIO 集成，自动建桶，优雅降级
- **文件魔数校验**: 上传时校验文件头防止伪装扩展名攻击
- **批量下载**: archiver ZIP 流式打包
- **同步引擎**:
  - 本地→云端: `POST /api/sync/upload`
  - 云端→本地: `POST /api/sync/download`
  - 状态查询: `GET /api/sync/status`
- **实时文件监听**: Electron fs.watch 监控目录变更，自动刷新
- **键盘快捷键**: Space 预览 / Ctrl+A 全选 / Delete 删除
- **拖拽上传**: 从系统拖拽文件夹到窗口打开
- **多选 + 批量删除**: 支持 Ctrl/⌘ 点击多选

### 📅 规划中

- Web Worker 图片压缩/哈希
- EXIF 信息展示
- 玻璃拟态 UI 设计
- E2E 测试 (Playwright)
- electron-builder 打包 + 自动更新

## 快速开始

```bash
# 安装依赖
pnpm install

# 类型检查
pnpm typecheck

# 启动后端 (端口 3001)
pnpm --filter @cloud-photo/server dev

# 启动桌面端 (开发模式，HMR)
pnpm --filter @cloud-photo/desktop dev
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| GET | `/api/media` | 媒体列表 (分页/筛选) |
| POST | `/api/media` | 创建媒体 |
| PATCH | `/api/media/:id` | 更新媒体 |
| DELETE | `/api/media/batch` | 批量删除 |
| POST | `/api/upload` | 文件上传 |
| POST | `/api/upload/init-multipart` | 分片上传初始化 |
| POST | `/api/download` | 批量下载 ZIP |
| GET | `/api/sync/status` | 同步状态统计 |
| POST | `/api/sync/upload` | 本地→云端同步 |
| POST | `/api/sync/download` | 云端→本地同步 |

## 项目文件统计

| 模块 | 源文件 | 代码行数 |
|------|--------|---------|
| packages/shared | 5 | ~350 |
| apps/server | 12 | ~780 |
| apps/desktop | 9 | ~750 |
| 配置 + AGENTS.md | 12 | ~350 |
| **总计** | **~38** | **~2230** |

## License

MIT
