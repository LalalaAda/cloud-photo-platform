import initSqlJs from 'sql.js'
import { drizzle } from 'drizzle-orm/sql-js'
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import * as schema from './schema'
import { config } from '../config'

// 确保数据目录存在
const dbDir = dirname(config.db.path)
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true })
}

// 初始化 sql.js（加载 WASM 二进制）
const SQL = await initSqlJs()

// 如果数据库文件已存在则加载
let buffer: Buffer | null = null
if (existsSync(config.db.path)) {
  buffer = readFileSync(config.db.path)
}

const sqlDb = new SQL.Database(buffer)
sqlDb.run('PRAGMA foreign_keys = ON')

/** Drizzle ORM 实例 */
export const db = drizzle(sqlDb, { schema })

/** 底层 sql.js 实例（供迁移等原始 SQL 操作使用） */
export function rawDb() {
  return sqlDb
}

/** 保存数据库到磁盘 */
export function saveDb(): void {
  const data = sqlDb.export()
  writeFileSync(config.db.path, Buffer.from(data))
}

export { schema }
