# packages/shared/src — 共享类型与工具

## 概览
纯 TypeScript 类型定义 + Zod 校验 + 工具函数 + 常量。被 `@cloud-photo/desktop` 和 `@cloud-photo/server` 共同依赖。无编译步骤，直接导出 `.ts` 源码。

## 结构
```
src/
├── index.ts      # barrel 导出
├── types.ts      # 核心接口/类型（Media, Album, User, IpcChannels）
├── schemas.ts    # Zod 校验 schemas
├── constants.ts  # 图片/视频扩展名、虚拟滚动/瀑布流配置
└── utils.ts      # 工具函数（ID生成、文件大小格式化、媒体工厂）
```

## WHERE TO LOOK
| 任务 | 位置 | 备注 |
|------|------|------|
| 添加共享类型 | `types.ts` | Media, Album, User 等核心接口 |
| 添加 Zod 校验 | `schemas.ts` | 用于 API 边界校验 |
| 添加 IPC 通道名 | `types.ts` → `IpcChannels` | 枚举常量，主/预加载/渲染端共用 |
| 添加工具函数 | `utils.ts` | `generateId()`, `formatFileSize()`, `createMedia()` |
| 修改虚拟滚动参数 | `constants.ts` | `VIRTUAL_SCROLL`, `MASONRY`, `PAGINATION` |

## 约定
- **纯 TypeScript**：无运行时框架依赖（仅 `zod`）
- **barrel export**：`index.ts` 通过 `export *` 集中导出
- **`workspace:*` 协议**：消费者通过 pnpm workspace 引用
- **类型守卫**：Zod schema 负责 API 边界，`types.ts` 负责内部类型

## 反模式
- **NEVER** 从 `apps/` 导入任何模块 — shared 必须保持纯净
- **NEVER** 使用 `any` — 所有类型显式定义
- **NEVER** 添加框架级依赖（React、Express 等）

## 独特风格
- **ID 格式**：`timestamp-random`（`Date.now()-randomString`），非 UUID
- **Set 数据结构**：扩展名集合用 `Set` 而非数组（O(1) 查找）
- 中文注释
