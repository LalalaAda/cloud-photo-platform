import { test, expect } from '@playwright/test'

let authToken: string
let mediaId: string
const TEST_MEDIA = {
  filename: 'e2e-test-photo.jpg',
  mimeType: 'image/jpeg',
  mediaType: 'image',
  size: 1024,
}

test.describe('Media CRUD', () => {
  // 在所有 media 测试前先注册 / 登录获取 token
  test.beforeAll(async ({ request }) => {
    const email = `media_e2e_${Date.now()}@test.com`
    const res = await request.post('/api/auth/register', {
      data: { username: 'mediauser', email, password: 'MediaTest123!' },
    })
    expect(res.ok()).toBeTruthy()
    authToken = (await res.json()).token
  })

  test.describe('POST /api/media — 创建媒体', () => {
    test('应创建新的媒体记录', async ({ request }) => {
      const response = await request.post('/api/media', {
        data: TEST_MEDIA,
        headers: { Authorization: `Bearer ${authToken}` },
      })
      expect(response.ok()).toBeTruthy()
      expect(response.status()).toBe(201)

      const body = await response.json()
      expect(body).toHaveProperty('id')
      expect(body.filename).toBe(TEST_MEDIA.filename)
      expect(body.mediaType).toBe(TEST_MEDIA.mediaType)
      expect(body.userId).toBeDefined()
      mediaId = body.id
    })

    test('未认证创建应返回 401', async ({ request }) => {
      const response = await request.post('/api/media', { data: TEST_MEDIA })
      expect(response.status()).toBe(401)
    })
  })

  test.describe('GET /api/media — 列表 & 筛选', () => {
    test('应返回媒体列表', async ({ request }) => {
      const response = await request.get('/api/media', {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      expect(response.ok()).toBeTruthy()

      const body = await response.json()
      expect(body).toHaveProperty('items')
      expect(body).toHaveProperty('total')
      expect(body).toHaveProperty('page')
      expect(body).toHaveProperty('pageSize')
      expect(Array.isArray(body.items)).toBeTruthy()
      expect(body.total).toBeGreaterThanOrEqual(1)
    })

    test('应按 mediaType 筛选', async ({ request }) => {
      const response = await request.get('/api/media?mediaType=image', {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      expect(response.ok()).toBeTruthy()
      const body = await response.json()
      expect(body.items.every((m: any) => m.mediaType === 'image')).toBeTruthy()
    })

    test('应按搜索关键词筛选', async ({ request }) => {
      const response = await request.get('/api/media?search=e2e-test', {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      expect(response.ok()).toBeTruthy()
      const body = await response.json()
      expect(body.items.length).toBeGreaterThanOrEqual(1)
    })

    test('不匹配的搜索应返回空列表', async ({ request }) => {
      const response = await request.get('/api/media?search=__nonexistent__', {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      expect(response.ok()).toBeTruthy()
      const body = await response.json()
      expect(body.items).toHaveLength(0)
      expect(body.total).toBe(0)
    })
  })

  test.describe('GET /api/media/:id — 单条详情', () => {
    test('应返回指定媒体详情', async ({ request }) => {
      const response = await request.get(`/api/media/${mediaId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      expect(response.ok()).toBeTruthy()
      const body = await response.json()
      expect(body.id).toBe(mediaId)
      expect(body.filename).toBe(TEST_MEDIA.filename)
    })

    test('不存在的 ID 应返回 404', async ({ request }) => {
      const response = await request.get('/api/media/nonexistent-id', {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      expect(response.status()).toBe(404)
    })
  })

  test.describe('PATCH /api/media/:id — 更新媒体', () => {
    test('应更新收藏状态', async ({ request }) => {
      const response = await request.patch(`/api/media/${mediaId}`, {
        data: { isFavorite: true, rating: 5 },
        headers: { Authorization: `Bearer ${authToken}` },
      })
      expect(response.ok()).toBeTruthy()

      const body = await response.json()
      expect(body.isFavorite).toBe(true)
      expect(body.rating).toBe(5)
    })

    test('空更新应返回 400', async ({ request }) => {
      const response = await request.patch(`/api/media/${mediaId}`, {
        data: {},
        headers: { Authorization: `Bearer ${authToken}` },
      })
      expect(response.status()).toBe(400)
    })
  })

  test.describe('DELETE /api/media/batch — 批量删除', () => {
    test('应批量删除媒体', async ({ request }) => {
      const response = await request.delete('/api/media/batch', {
        data: { ids: [mediaId] },
        headers: { Authorization: `Bearer ${authToken}` },
      })
      expect(response.ok()).toBeTruthy()
      const body = await response.json()
      expect(body.deleted).toBe(1)
    })

    test('空 ID 数组应返回 400', async ({ request }) => {
      const response = await request.delete('/api/media/batch', {
        data: { ids: [] },
        headers: { Authorization: `Bearer ${authToken}` },
      })
      expect(response.status()).toBe(400)
    })
  })
})
