import { Router } from 'express'
import multer from 'multer'
import { authMiddleware } from '../middleware/auth'
import { db, schema } from '../db'
import { saveDb } from '../db'
import { generateId, getMediaTypeByExtension, IMAGE_EXTENSIONS, VIDEO_EXTENSIONS } from '@cloud-photo/shared'
import { createHash } from 'node:crypto'
import { extname } from 'node:path'

const router = Router()

/** 文件魔数签名映射（前几个字节标识真实文件类型） */
const MAGIC_NUMBERS: Record<string, Uint8Array[]> = {
  'image/jpeg': [new Uint8Array([0xFF, 0xD8, 0xFF])],
  'image/png':  [new Uint8Array([0x89, 0x50, 0x4E, 0x47])],
  'image/gif':  [new Uint8Array([0x47, 0x49, 0x46])],
  'image/webp': [new Uint8Array([0x52, 0x49, 0x46, 0x46])], // RIFF....WEBP
  'image/bmp':  [new Uint8Array([0x42, 0x4D])],
  'image/tiff': [new Uint8Array([0x49, 0x49, 0x2A, 0x00]), new Uint8Array([0x4D, 0x4D, 0x00, 0x2A])],
  'image/avif': [new Uint8Array([0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66])],
}

/** 校验文件魔数，防止伪装扩展名的恶意文件上传 */
function validateMagicNumber(buffer: Buffer, ext: string, originalMime: string): string | null {
  // 视频暂不校验（格式复杂）
  if (originalMime.startsWith('video/')) return null

  // 根据扩展名推断预期 MIME
  const imageExtToMime: Record<string, string> = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png', '.gif': 'image/gif',
    '.webp': 'image/webp', '.bmp': 'image/bmp',
    '.tiff': 'image/tiff', '.tif': 'image/tiff',
    '.avif': 'image/avif',
  }
  const expectedMime = imageExtToMime[ext]
  if (!expectedMime) return null // 不认识的扩展名跳过

  const signatures = MAGIC_NUMBERS[expectedMime]
  if (!signatures) return null

  const matches = signatures.some(sig => {
    if (buffer.length < sig.length) return false
    return sig.every((byte, i) => buffer[i] === byte)
  })

  if (!matches) {
    return `文件魔数校验失败: 扩展名 ${ext} 与实际文件类型不匹配`
  }
  return null
}

// 使用内存存储，文件将通过 RustFS 上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
})

/** 上传文件（单文件） */
router.post('/', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file provided' })
    return
  }

  const file = req.file
  const ext = extname(file.originalname).toLowerCase()

  // 文件魔数校验
  const magicError = validateMagicNumber(file.buffer, ext, file.mimetype)
  if (magicError) {
    res.status(400).json({ error: magicError })
    return
  }

  const now = new Date().toISOString()

  // 计算 MD5
  const md5 = createHash('md5').update(file.buffer).digest('hex')
  const objectName = `${req.user!.userId}/${md5}${ext}`

  // 上传到 RustFS
  try {
    const { uploadToRustfs } = await import('../rustfs')
    const cloudUrl = await uploadToRustfs(objectName, file.buffer, file.mimetype)

    const mediaItem = {
      id: generateId(),
      localPath: null,
      cloudUrl,
      objectName,
      filename: file.originalname,
      mimeType: file.mimetype,
      mediaType: getMediaTypeByExtension(file.originalname),
      size: file.size,
      width: null,
      height: null,
      md5,
      status: 'synced' as const,
      isFavorite: false,
      rating: 0,
      tags: [],
      albums: [],
      userId: req.user!.userId,
      createdAt: now,
      updatedAt: now,
      takenAt: null,
    }

    db.insert(schema.media).values(mediaItem).run()
    saveDb()

    res.status(201).json(mediaItem)
  } catch (err) {
    console.error('[Upload] RustFS upload failed:', err)
    res.status(500).json({ error: 'Upload to cloud storage failed' })
  }
})

/** 分片上传初始化 */
router.post('/init-multipart', authMiddleware, async (req, res) => {
  const { filename, totalChunks } = req.body as { filename: string; totalChunks: number }
  const uploadId = generateId()

  // 返回上传会话信息
  res.json({
    uploadId,
    filename,
    totalChunks,
    chunkSize: 5 * 1024 * 1024, // 5MB
  })
})

export default router
