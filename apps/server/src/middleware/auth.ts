import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config'

export interface AuthPayload {
  userId: string
  email: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload
    }
  }
}

/** JWT 认证中间件 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' })
    return
  }

  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthPayload
    req.user = payload
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

/** 生成 JWT */
export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' })
}
