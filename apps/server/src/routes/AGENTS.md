# apps/server/src/routes — API 路由

## 概览
Express 5 RESTful API 路由处理器，按领域拆分。所有路由在 `index.ts` 中挂载到 `/api` 前缀下。

## 结构
```
routes/
├── auth.ts      # POST /api/auth/login, /api/auth/register
├── media.ts     # GET/POST/PATCH/DELETE /api/media
├── albums.ts    # GET/POST/PATCH/DELETE /api/albums
└── upload.ts    # POST /api/upload (Multer 文件上传)
```

## 约定
- **每个文件导出一个 `Router`**：`express.Router()`
- **标准响应格式**：`{ data }` 成功 / `{ error, details? }` 失败
- **认证保护**：auth 中间件在路由文件中通过 `router.use(authMiddleware)` 或按路由添加
- **路径参数**：`/api/media/:id` 格式
- **Multer 用于上传**：`upload.ts` 处理 multipart/form-data

## 添加新路由模式
```ts
import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'

const router = Router()
// 公开路由
router.get('/public', handler)
// 需认证路由
router.use(authMiddleware)
router.post('/private', handler)

export default router
```

## 反模式
- **NEVER** 在路由中直接操作文件系统 — 通过 `rustfs.ts`
- **NEVER** 在路由中手写 SQL — 通过 Drizzle ORM
- **NEVER** 跳过输入校验 — 使用 shared 包的 Zod schemas

## 独特风格
- Express 5 router 行为，非 Express 4
- 错误通过 `next(err)` 传播，统一错误处理
