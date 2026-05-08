import { z } from 'zod'

/** 媒体文件类型枚举 */
export const MediaTypeSchema = z.enum(['image', 'video', 'other'])

/** 媒体文件状态枚举 */
export const MediaStatusSchema = z.enum(['local_only', 'cloud_only', 'synced', 'syncing', 'conflict'])

/** 媒体文件元数据 schema */
export const MediaSchema = z.object({
  id: z.string(),
  localPath: z.string().nullable(),
  cloudUrl: z.string().nullable(),
  objectName: z.string().nullable(),
  filename: z.string(),
  mimeType: z.string(),
  mediaType: MediaTypeSchema,
  size: z.number().int().nonnegative(),
  width: z.number().int().nonnegative().nullable(),
  height: z.number().int().nonnegative().nullable(),
  md5: z.string().nullable(),
  status: MediaStatusSchema,
  isFavorite: z.boolean(),
  rating: z.number().int().min(0).max(5),
  tags: z.array(z.string()),
  albums: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  takenAt: z.string().nullable(),
  localModifiedAt: z.string().nullable(),
  cloudModifiedAt: z.string().nullable(),
  syncedAt: z.string().nullable(),
})

/** 冲突解决请求 schema */
export const ResolveConflictSchema = z.object({
  mediaId: z.string(),
  resolution: z.enum(['keep_local', 'keep_cloud']),
})

/** 媒体查询参数 schema */
export const MediaQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  search: z.string().optional(),
  mediaType: MediaTypeSchema.optional(),
  status: MediaStatusSchema.optional(),
  isFavorite: z.coerce.boolean().optional(),
  tags: z.array(z.string()).optional(),
  albumId: z.string().optional(),
  sortBy: z.enum(['filename', 'size', 'createdAt', 'takenAt']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
})

/** 相册 schema */
export const AlbumSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).default(''),
  coverMediaId: z.string().nullable(),
  mediaCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/** 创建相册 schema */
export const CreateAlbumSchema = AlbumSchema.pick({ name: true, description: true })

/** 用户 schema */
export const UserSchema = z.object({
  id: z.string(),
  username: z.string().min(2).max(50),
  email: z.string().email(),
  avatar: z.string().nullable(),
  createdAt: z.string(),
})

/** 登录请求 schema */
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

/** 注册请求 schema */
export const RegisterSchema = z.object({
  username: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(6),
})
