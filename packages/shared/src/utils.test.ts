import { describe, it, expect } from 'vitest'
import {
  getMediaTypeByExtension,
  getMediaTypeByMime,
  formatFileSize,
  generateId,
  isImageFile,
  isVideoFile,
  createMedia,
  getBasename,
} from './utils'

// ====== getMediaTypeByExtension ======

describe('getMediaTypeByExtension', () => {
  it('应识别常见图片扩展名', () => {
    expect(getMediaTypeByExtension('photo.jpg')).toBe('image')
    expect(getMediaTypeByExtension('photo.jpeg')).toBe('image')
    expect(getMediaTypeByExtension('photo.png')).toBe('image')
    expect(getMediaTypeByExtension('photo.gif')).toBe('image')
    expect(getMediaTypeByExtension('photo.webp')).toBe('image')
    expect(getMediaTypeByExtension('photo.bmp')).toBe('image')
    expect(getMediaTypeByExtension('photo.tiff')).toBe('image')
    expect(getMediaTypeByExtension('photo.tif')).toBe('image')
    expect(getMediaTypeByExtension('photo.svg')).toBe('image')
    expect(getMediaTypeByExtension('photo.avif')).toBe('image')
    expect(getMediaTypeByExtension('photo.heic')).toBe('image')
    expect(getMediaTypeByExtension('photo.heif')).toBe('image')
  })

  it('应识别常见视频扩展名', () => {
    expect(getMediaTypeByExtension('video.mp4')).toBe('video')
    expect(getMediaTypeByExtension('video.webm')).toBe('video')
    expect(getMediaTypeByExtension('video.mkv')).toBe('video')
    expect(getMediaTypeByExtension('video.avi')).toBe('video')
    expect(getMediaTypeByExtension('video.mov')).toBe('video')
    expect(getMediaTypeByExtension('video.wmv')).toBe('video')
    expect(getMediaTypeByExtension('video.flv')).toBe('video')
    expect(getMediaTypeByExtension('video.m4v')).toBe('video')
  })

  it('不识别的扩展名应返回 other', () => {
    expect(getMediaTypeByExtension('file.txt')).toBe('other')
    expect(getMediaTypeByExtension('file.pdf')).toBe('other')
    expect(getMediaTypeByExtension('file.zip')).toBe('other')
    expect(getMediaTypeByExtension('file')).toBe('other')
    expect(getMediaTypeByExtension('')).toBe('other')
  })

  it('应忽略大小写', () => {
    expect(getMediaTypeByExtension('photo.JPG')).toBe('image')
    expect(getMediaTypeByExtension('photo.PNG')).toBe('image')
    expect(getMediaTypeByExtension('video.MP4')).toBe('video')
    expect(getMediaTypeByExtension('photo.HeIc')).toBe('image')
  })
})

// ====== getMediaTypeByMime ======

describe('getMediaTypeByMime', () => {
  it('应识别图片 MIME', () => {
    expect(getMediaTypeByMime('image/jpeg')).toBe('image')
    expect(getMediaTypeByMime('image/png')).toBe('image')
    expect(getMediaTypeByMime('image/webp')).toBe('image')
    expect(getMediaTypeByMime('image/heic')).toBe('image')
    expect(getMediaTypeByMime('image/heif')).toBe('image')
  })

  it('应识别视频 MIME', () => {
    expect(getMediaTypeByMime('video/mp4')).toBe('video')
    expect(getMediaTypeByMime('video/webm')).toBe('video')
    expect(getMediaTypeByMime('video/quicktime')).toBe('video')
  })

  it('不识别的 MIME 应返回 other', () => {
    expect(getMediaTypeByMime('application/pdf')).toBe('other')
    expect(getMediaTypeByMime('text/plain')).toBe('other')
    expect(getMediaTypeByMime('')).toBe('other')
  })
})

// ====== formatFileSize ======

describe('formatFileSize', () => {
  it('0 字节应返回 0 B', () => {
    expect(formatFileSize(0)).toBe('0 B')
  })

  it('应正确格式化字节', () => {
    // idx=0 时 toFixed(0)，无小数
    expect(formatFileSize(1)).toBe('1 B')
    expect(formatFileSize(500)).toBe('500 B')
  })

  it('应正确格式化 KB', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB')
    expect(formatFileSize(1536)).toBe('1.5 KB')
    expect(formatFileSize(10240)).toBe('10.0 KB')
  })

  it('应正确格式化 MB', () => {
    expect(formatFileSize(1048576)).toBe('1.0 MB')
    expect(formatFileSize(1572864)).toBe('1.5 MB')
  })

  it('应正确格式化 GB', () => {
    expect(formatFileSize(1073741824)).toBe('1.0 GB')
    expect(formatFileSize(1610612736)).toBe('1.5 GB')
  })

  it('超大值应返回 TB', () => {
    expect(formatFileSize(1099511627776)).toBe('1.0 TB')
  })
})

// ====== generateId ======

describe('generateId', () => {
  it('应返回字符串', () => {
    expect(typeof generateId()).toBe('string')
  })

  it('应包含时间戳前缀和随机后缀', () => {
    const id = generateId()
    expect(id).toMatch(/^\d+-[a-z0-9]+$/)
  })

  it('每次调用应生成不同的 ID', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()))
    expect(ids.size).toBe(100)
  })
})

// ====== isImageFile / isVideoFile ======

describe('isImageFile', () => {
  it('图片文件应返回 true', () => {
    expect(isImageFile('photo.jpg')).toBe(true)
    expect(isImageFile('photo.png')).toBe(true)
    expect(isImageFile('photo.heic')).toBe(true)
  })

  it('非图片文件应返回 false', () => {
    expect(isImageFile('video.mp4')).toBe(false)
    expect(isImageFile('file.txt')).toBe(false)
  })
})

describe('isVideoFile', () => {
  it('视频文件应返回 true', () => {
    expect(isVideoFile('video.mp4')).toBe(true)
    expect(isVideoFile('video.mov')).toBe(true)
    expect(isVideoFile('video.mkv')).toBe(true)
  })

  it('非视频文件应返回 false', () => {
    expect(isVideoFile('photo.jpg')).toBe(false)
    expect(isVideoFile('file.txt')).toBe(false)
  })
})

// ====== createMedia ======

describe('createMedia', () => {
  it('应使用默认值创建 Media 对象', () => {
    const media = createMedia()
    expect(media.id).toBeDefined()
    expect(media.filename).toBe('untitled')
    expect(media.mimeType).toBe('application/octet-stream')
    expect(media.mediaType).toBe('other')
    expect(media.size).toBe(0)
    expect(media.status).toBe('local_only')
    expect(media.isFavorite).toBe(false)
    expect(media.rating).toBe(0)
    expect(media.tags).toEqual([])
    expect(media.albums).toEqual([])
    expect(media.localPath).toBeNull()
    expect(media.cloudUrl).toBeNull()
    expect(media.width).toBeNull()
    expect(media.height).toBeNull()
  })

  it('应合并传入的部分属性', () => {
    const media = createMedia({ filename: 'test.jpg', size: 1024, mimeType: 'image/jpeg' })
    expect(media.filename).toBe('test.jpg')
    expect(media.size).toBe(1024)
    expect(media.mimeType).toBe('image/jpeg')
    // 未传入的应保留默认值
    expect(media.isFavorite).toBe(false)
  })

  it('每次调用应生成不同的 ID', () => {
    const m1 = createMedia()
    const m2 = createMedia()
    expect(m1.id).not.toBe(m2.id)
  })
})

// ====== getBasename ======

describe('getBasename', () => {
  it('应提取 POSIX 路径的文件名', () => {
    expect(getBasename('/path/to/file.jpg')).toBe('file.jpg')
  })

  it('应提取 Windows 路径的文件名', () => {
    expect(getBasename('C:\\Users\\test\\photo.png')).toBe('photo.png')
  })

  it('根路径应返回空字符串', () => {
    expect(getBasename('/')).toBe('')
  })

  it('无路径分隔符应返回原字符串', () => {
    expect(getBasename('file.jpg')).toBe('file.jpg')
  })
})
