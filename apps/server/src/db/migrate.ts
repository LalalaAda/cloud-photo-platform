import { rawDb, saveDb } from './index'

/**
 * 创建所有表（简易迁移，生产环境应使用 drizzle-kit migrate）
 */
export function runMigrations(): void {
  const sql = rawDb()

  const statements = [
    `CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY,
      local_path TEXT,
      cloud_url TEXT,
      object_name TEXT,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      media_type TEXT NOT NULL DEFAULT 'other' CHECK(media_type IN ('image','video','other')),
      size INTEGER NOT NULL DEFAULT 0,
      width INTEGER,
      height INTEGER,
      md5 TEXT,
      status TEXT NOT NULL DEFAULT 'local_only' CHECK(status IN ('local_only','cloud_only','synced','syncing')),
      is_favorite INTEGER NOT NULL DEFAULT 0,
      rating INTEGER NOT NULL DEFAULT 0,
      tags TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      taken_at TEXT,
      user_id TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS albums (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      cover_media_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      user_id TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS album_media (
      album_id TEXT NOT NULL,
      media_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      added_at TEXT NOT NULL,
      PRIMARY KEY (album_id, media_id),
      FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
      FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      avatar TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_media_status ON media(status)`,
    `CREATE INDEX IF NOT EXISTS idx_media_media_type ON media(media_type)`,
    `CREATE INDEX IF NOT EXISTS idx_media_local_path ON media(local_path)`,
  ]

  for (const stmt of statements) {
    sql.run(stmt)
  }

  saveDb()
  console.log('[DB] Migration completed successfully')
}
