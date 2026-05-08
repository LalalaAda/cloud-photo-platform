# apps/desktop/src/renderer/src — React 渲染进程

## 概览
Electron 渲染端 UI 层：React 19 + Tailwind v4 + Zustand + Lucide 图标。通过 preload 桥与主进程通信。

## 结构
```
src/
├── main.tsx           # React 挂载入口
├── App.tsx            # 根组件
├── style.css          # Tailwind 全局样式
├── env.d.ts           # 类型声明（electronAPI 等）
├── components/        # UI 组件
│   ├── PhotoGrid.tsx  # 虚拟滚动照片网格
│   ├── Lightbox.tsx   # 全屏图片预览
│   └── TopBar.tsx     # 顶部导航栏
└── stores/
    └── mediaStore.ts  # Zustand 媒体状态管理
```

## WHERE TO LOOK
| 任务 | 位置 | 备注 |
|------|------|------|
| 添加新页面/组件 | `components/` | Tailwind v4 样式 |
| 修改全局状态 | `stores/mediaStore.ts` | Zustand store |
| 调主进程 API | 通过 `window.electronAPI` | preload 暴露的方法 |
| 添加图标 | `lucide-react` 导入 | 见 https://lucide.dev |

## 约定
- **Tailwind v4**：使用 `@tailwindcss/vite` 插件，非 postcss
- **Zustand**：单一 store（`mediaStore`），保持简单
- **组件通信**：通过 preload 桥，组件不直接 import electron
- **图标库**：`lucide-react`，统一图标来源

## 反模式
- **NEVER** 在渲染进程中使用 `require('electron')` — contextIsolation 禁止
- **NEVER** 在组件中直接操作文件系统 — 通过 `window.electronAPI`
- **NEVER** 绕过 Zustand store 管理共享状态

## 独特风格
- 中文注释
- Tailwind 原子化样式，不额外写 CSS 文件
- Lucide 图标统一风格
