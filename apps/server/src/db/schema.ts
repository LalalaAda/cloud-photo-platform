import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

/** 媒体文件表 */
export const media = sqliteTable('media', {
  id: text('id').primaryKey(),
  localPath: text('local_path'),
  cloudUrl: text('cloud_url'),
  objectName: text('object_name'),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  mediaType: text('media_type', { enum: ['image', 'video', 'other'] }).notNull().default('other'),
  size: integer('size').notNull().default(0),
  width: integer('width'),
  height: integer('height'),
  md5: text('md5'),
  status: text('status', { enum: ['local_only', 'cloud_only', 'synced', 'syncing', 'conflict'] })
    .notNull()
    .default('local_only'),
  isFavorite: integer('is_favorite', { mode: 'boolean' }).notNull().default(false),
  rating: integer('rating').notNull().default(0),
  tags: text('tags', { mode: 'json' }).$type<string[]>().notNull().default([]),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  takenAt: text('taken_at'),
  userId: text('user_id'),
  localModifiedAt: text('local_modified_at'),
  cloudModifiedAt: text('cloud_modified_at'),
  syncedAt: text('synced_at'),
})

/** 相册表 */
export const albums = sqliteTable('albums', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  coverMediaId: text('cover_media_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  userId: text('user_id'),
})

/** 相册-媒体关联表 */
export const albumMedia = sqliteTable('album_media', {
  albumId: text('album_id').notNull(),
  mediaId: text('media_id').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  addedAt: text('added_at').notNull(),
})

/** 用户表 */
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  avatar: text('avatar'),
  createdAt: text('created_at').notNull(),
})
