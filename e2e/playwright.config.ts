import { defineConfig } from '@playwright/test'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Playwright E2E 测试配置
 * - server: 针对 Express API 的请求级测试（无需浏览器）
 * - desktop: Electron 桌面端启动测试
 */
export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  globalSetup: resolve(__dirname, 'global-setup.ts'),
  globalTeardown: resolve(__dirname, 'global-teardown.ts'),

  projects: [
    {
      name: 'server',
      testMatch: 'server/**/*.spec.ts',
      use: {
        baseURL: 'http://127.0.0.1:3001',
        extraHTTPHeaders: {
          'Content-Type': 'application/json',
        },
      },
    },
    {
      name: 'desktop',
      testMatch: 'desktop/**/*.spec.ts',
    },
  ],
})
