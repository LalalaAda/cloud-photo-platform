# PROJECT KNOWLEDGE BASE

**Generated:** 2026-05-08
**Branch:** main

## OVERVIEW
Cloud photo platform — monorepo combining Electron desktop app (React renderer) + Node.js Express server + shared types. pnpm workspaces + Turborepo orchestration.

## STRUCTURE
```
cloud-photo-platform/
├── apps/
│   ├── desktop/          # Electron app (main + preload + React renderer)
│   └── server/           # Express 5 API + Drizzle ORM + RustFS/MinIO
├── packages/
│   └── shared/           # Shared types, Zod schemas, utilities, constants
├── package.json          # Root: turbo scripts, pnpm config
├── pnpm-workspace.yaml   # Workspace: apps/* + packages/*
├── turbo.json            # Task pipeline: dev/build/typecheck/lint/clean
└── tsconfig.json         # Root TS config (references)
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Add IPC channel | `apps/desktop/src/main/index.ts` + `preload/index.ts` + `packages/shared/src/types.ts` (IpcChannels) | 3-file change: main handler → preload bridge → shared enum |
| Add REST API route | `apps/server/src/routes/` | One file per domain, mounted in `index.ts` |
| Add shared type/schema | `packages/shared/src/` | Exported via barrel `index.ts` |
| React UI component | `apps/desktop/src/renderer/src/components/` | Tailwind v4, Lucide icons |
| State management | `apps/desktop/src/renderer/src/stores/` | Zustand stores |
| DB schema/migration | `apps/server/src/db/` | Drizzle ORM + sql.js |

## CONVENTIONS
- **ESM only**: All packages use `"type": "module"`
- **Workspace protocol**: `workspace:*` for internal deps (e.g. `@cloud-photo/shared`)
- **Turborepo tasks**: `dev`, `build`, `typecheck`, `lint`, `clean` — all run via `turbo`
- **No build output for shared**: `packages/shared` ships `.ts` source directly (no compile step)
- **Server uses `tsx watch`**: Dev server runs via tsx, not ts-node
- **Desktop uses `electron-vite`**: Not webpack, not vite alone

## ANTI-PATTERNS (THIS PROJECT)
- **NEVER** add `nodeIntegration: true` in Electron — `contextIsolation` is enforced
- **NEVER** import from `apps/` into `packages/shared` — shared must remain pure
- **NEVER** bypass IPC channels for file system access — main process owns fs
- **NEVER** use `any` in shared types — Zod schemas validate at boundaries

## UNIQUE STYLES
- **RustFS for object storage**: Custom `rustfs.ts` module (not standard AWS SDK pattern)
- **Non-blocking RustFS init**: Server starts even if RustFS fails (graceful degradation)
- **ID generation**: Simple `timestamp-random` format, not UUID (see `generateId()`)
- **Chinese comments**: Codebase uses Chinese doc comments throughout

## COMMANDS
```bash
pnpm dev           # Run all apps in dev mode (turbo)
pnpm build         # Build all apps
pnpm typecheck     # Type-check all packages
pnpm lint          # Lint all packages
pnpm clean         # Remove dist/out/.turbo artifacts

# Per-package:
pnpm --filter @cloud-photo/desktop dev    # Desktop only
pnpm --filter @cloud-photo/server dev     # Server only
```

## NOTES
- **better-sqlite3, electron, esbuild, electron-winstaller** are the only `onlyBuiltDependencies` — native builds required
- **pnpm 10.9.0** pinned as packageManager
- **Express 5** (not 4) — router behavior may differ from common Express 4 tutorials
- **Tailwind v4** — uses `@tailwindcss/vite` plugin, not postcss
- **No test framework configured** — tests not yet set up
