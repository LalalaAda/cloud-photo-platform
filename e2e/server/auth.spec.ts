import { test, expect } from '@playwright/test'

const TEST_USER = {
  username: 'e2etest',
  email: `e2e_${Date.now()}@test.com`,
  password: 'TestPass123!',
}

let authToken: string

test.describe('Authentication', () => {
  test.describe('POST /api/auth/register', () => {
    test('应成功注册新用户', async ({ request }) => {
      const response = await request.post('/api/auth/register', {
        data: TEST_USER,
      })
      expect(response.ok()).toBeTruthy()
      expect(response.status()).toBe(201)

      const body = await response.json()
      expect(body).toHaveProperty('token')
      expect(body).toHaveProperty('user')
      expect(body.user.email).toBe(TEST_USER.email)
      expect(body.user.username).toBe(TEST_USER.username)
      // 不应返回密码哈希
      expect(body.user).not.toHaveProperty('passwordHash')

      authToken = body.token
    })

    test('重复注册应返回 409', async ({ request }) => {
      const response = await request.post('/api/auth/register', {
        data: TEST_USER,
      })
      expect(response.status()).toBe(409)
    })

    test('无效数据应返回 400', async ({ request }) => {
      const response = await request.post('/api/auth/register', {
        data: { username: '', email: 'not-an-email', password: '12' },
      })
      expect(response.status()).toBe(400)
    })
  })

  test.describe('POST /api/auth/login', () => {
    test('应使用正确凭证登录', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: { email: TEST_USER.email, password: TEST_USER.password },
      })
      expect(response.ok()).toBeTruthy()
      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(body).toHaveProperty('token')
      expect(body.user.email).toBe(TEST_USER.email)
    })

    test('错误密码应返回 401', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: { email: TEST_USER.email, password: 'wrongpassword' },
      })
      expect(response.status()).toBe(401)
    })

    test('不存在的用户应返回 401', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: { email: 'nonexistent@test.com', password: 'anything' },
      })
      expect(response.status()).toBe(401)
    })
  })

  test.describe('认证令牌', () => {
    test('已注册用户应获得有效 token', async () => {
      expect(authToken).toBeDefined()
      expect(typeof authToken).toBe('string')
      // JWT 应有三个点分隔的部分
      expect(authToken.split('.')).toHaveLength(3)
    })

    test('无 token 访问应返回 401', async ({ request }) => {
      const response = await request.get('/api/media')
      expect(response.status()).toBe(401)
    })

    test('无效 token 访问应返回 401', async ({ request }) => {
      const response = await request.get('/api/media', {
        headers: { Authorization: 'Bearer invalid-token' },
      })
      expect(response.status()).toBe(401)
    })
  })
})
