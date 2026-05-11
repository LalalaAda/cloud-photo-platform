import { test, expect, _electron as electron } from '@playwright/test'

/**
 * Electron 桌面端启动测试
 *
 * 注意：需要先执行 pnpm --filter @cloud-photo/desktop build
 * 确保 out/ 目录包含构建产物。
 *
 * 此测试需要图形环境，无头环境（CI）下将被跳过。
 */
test.describe('Desktop App Startup', () => {
  test('应用应启动并显示主窗口', async () => {
    test.skip(!!process.env.CI, '需要图形环境，CI 中跳过')

    const electronApp = await electron.launch({
      args: ['.'],
      cwd: new URL('../../apps/desktop', import.meta.url).pathname,
    })

    try {
      const window = await electronApp.firstWindow()
      await expect(window).toBeVisible()

      // 窗口应有标题
      const title = await window.title()
      expect(title).toBeDefined()
      expect(title.length).toBeGreaterThan(0)

      // 窗口尺寸应合理
      const bounds = await window.evaluate(() => ({
        width: window.innerWidth,
        height: window.innerHeight,
      }))
      expect(bounds.width).toBeGreaterThan(0)
      expect(bounds.height).toBeGreaterThan(0)
    } finally {
      await electronApp.close()
    }
  })
})
