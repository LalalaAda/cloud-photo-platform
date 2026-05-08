# apps/server/src — Express 5 后端服务

## 概览
Node.js Express 5 API 服务，提供 RESTful 接口、数据库 ORM（Drizzle + sql.js）、对象存储（RustFS / S3 兼容）。

## 结构
```
src/
├── index.ts          # 应用入口：中间件注册、路由挂载、启动
├── config.ts         # 环境变量配置中心
├── rustfs.ts         # RustFS / S3 对象存储封装
├── db/               # 数据库层
│   ├── schema.ts     # Drizzle ORM 表定义
│   ├── migrate.ts    # 迁移执行
│   └── index.ts      # DB 连接单例
├── middleware/
│   └── auth.ts       # JWT 认证中间件
└── routes/           # API 路由 → 见 routes/AGENTS.md
```

## WHERE TO LOOK
| 任务 | 位置 | 备注 |
|------|------|------|
| 添加新路由模块 | `routes/` | 新建文件，在 `index.ts` 中挂载 |
| 修改数据库表 | `db/schema.ts` | Drizzle 表定义 |
| 添加中间件 | `middleware/` | 在 `index.ts` 的 `app.use()` 链中注册 |
| 修改配置 | `config.ts` | 环境变量通过 `process.env` 读取 |
| 对象存储操作 | `rustfs.ts` | `uploadToRustFs`, `getRustFsUrl`, `ensureBucket` |

## 约定
- **服务启动不阻塞**：RustFS 初始化失败只打 warning，服务器仍正常启动
- **路由按领域拆分**：一个文件一个领域（auth, media, albums, upload）
- **数据库迁移自动执行**：`main()` 中调用 `runMigrations()`
- **错误统一格式**：`{ error: string, details?: any }`

## 反模式
- **NEVER** 在路由中直接操作数据库 — 通过 db 模块封装
- **NEVER** 绕过 auth 中间件访问需认证的路由
- **NEVER** 在 `index.ts` 中写业务逻辑 — 路由负责

## 独特风格
- **RustFS**：自定义 S3 封装层，非 AWS SDK 直调
- **Express 5**（非 4）：路由行为与常见教程有差异
- **sql.js**：内存级 SQLite，无持久化文件，重启数据丢失（开发阶段）
