import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { db, schema } from '../db'
import { eq } from 'drizzle-orm'
import { signToken } from '../middleware/auth'
import { RegisterSchema, LoginSchema } from '@cloud-photo/shared'
import { generateId } from '@cloud-photo/shared'
import { ZodError } from 'zod'

const router = Router()

/** 注册 */
router.post('/register', async (req, res) => {
  try {
    const data = RegisterSchema.parse(req.body)

    // 检查邮箱是否已注册
    const existing = db.select()
      .from(schema.users)
      .where(eq(schema.users.email, data.email))
      .get()

    if (existing) {
      res.status(409).json({ error: 'Email already registered' })
      return
    }

    const passwordHash = await bcrypt.hash(data.password, 10)
    const now = new Date().toISOString()

    const user = {
      id: generateId(),
      username: data.username,
      email: data.email,
      passwordHash,
      avatar: null,
      createdAt: now,
    }

    db.insert(schema.users).values(user).run()

    const token = signToken({ userId: user.id, email: user.email })

    res.status(201).json({
      token,
      user: { id: user.id, username: user.username, email: user.email, createdAt: user.createdAt },
    })
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Invalid registration data', details: err.errors })
      return
    }
    console.error('[Auth] Register error:', (err as Error).message)
    res.status(400).json({ error: 'Invalid registration data' })
  }
})

/** 登录 */
router.post('/login', async (req, res) => {
  try {
    const data = LoginSchema.parse(req.body)

    const user = db.select()
      .from(schema.users)
      .where(eq(schema.users.email, data.email))
      .get()

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' })
      return
    }

    const valid = await bcrypt.compare(data.password, user.passwordHash)
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' })
      return
    }

    const token = signToken({ userId: user.id, email: user.email })

    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar, createdAt: user.createdAt },
    })
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Invalid login data', details: err.errors })
      return
    }
    console.error('[Auth] Login error:', (err as Error).message)
    res.status(400).json({ error: 'Invalid login data' })
  }
})

export default router
