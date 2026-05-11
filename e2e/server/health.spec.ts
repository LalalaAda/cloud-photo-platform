import { test, expect } from '@playwright/test'

test.describe('Health Check', () => {
  test('GET /api/health 应返回 ok 状态', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body).toHaveProperty('status', 'ok')
    expect(body).toHaveProperty('timestamp')
    // timestamp 应为有效的 ISO 字符串
    expect(() => new Date(body.timestamp).toISOString()).not.toThrow()
  })
})
