# apps/desktop/src — Electron 桌面应用

## 概览
Electron 三进程架构：主进程（Node.js 文件系统）→ preload 安全桥 → React 渲染进程（UI）。`contextIsolation` 强制开启。

## 结构
```
src/
├── main/
│   └── index.ts       # 主进程：窗口创建、IPC 处理器、app 生命周期
├── preload/
│   └── index.ts       # 预加载桥：contextBridge 暴露受限 API
└── renderer/          # 渲染进程 → 见 renderer/src/AGENTS.md
```

## 三文件联动模式（添加新 IPC 通道）
```
1. shared/types.ts      → 在 IpcChannels 枚举中添加通道名
2. main/index.ts        → 添加 ipcMain.handle() 处理器
3. preload/index.ts     → 添加 contextBridge 暴露方法
```

## WHERE TO LOOK
| 任务 | 位置 | 备注 |
|------|------|------|
| 添加快捷键/菜单 | `main/index.ts` | 使用 `globalShortcut` 或 `Menu` |
| 文件系统操作 | `main/index.ts` | 通过 IPC handle 实现 |
| 窗口配置 | `main/index.ts` | `BrowserWindow` 构造参数 |
| 暴露新 API 给渲染端 | `preload/index.ts` | `contextBridge.exposeInMainWorld` |

## 约定
- **`contextIsolation: true`** — 永不修改
- **`nodeIntegration: false`** — 永不修改
- **`sandbox: false`** — 当前关闭（需 Node.js 能力在 preload 中）
- **开发/生产路径切换**：`ELECTRON_RENDERER_URL` 环境变量判断

## 反模式
- **NEVER** 在 preload 中直接 `require('fs')` — 通过 IPC 调主进程
- **NEVER** 在渲染进程中 `require('electron')` — 被 contextIsolation 阻止
- **NEVER** 绕过 preload 桥直接暴露能力给窗口

## 独特风格
- **`titleBarStyle: 'hiddenInset'`** — macOS 隐藏标题栏风格
- **ID 生成调 shared 包的 `generateId()`** — 不在 main 中重复实现
- 中文注释
