import { app, BrowserWindow, ipcMain, dialog, shell, clipboard } from 'electron'
import { readFile, unlink, readdir, stat } from 'node:fs/promises'
import { watch } from 'node:fs'
import { join, extname, basename } from 'node:path'
import { IpcChannels, createMedia, getMediaTypeByExtension, generateId } from '@cloud-photo/shared'
import type { Media, ScanResult } from '@cloud-photo/shared'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import sharp from 'sharp'
import heicConvert  from 'heic-convert'

/** HEIC/HEIF 扩展名集合 — 需要 sharp 解码转换 */
const HEIC_EXTENSIONS = new Set(['.heic', '.heif'])

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // 开发环境加载 dev server，生产环境加载打包文件
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ====== IPC Handlers ======

/** 扫描本地目录并返回媒体文件列表（异步 + 并行 stat，大目录不阻塞主进程） */
ipcMain.handle(IpcChannels.SCAN_DIRECTORY, async (_event, dirPath: string): Promise<ScanResult> => {
  const start = performance.now()
  const files: Media[] = []

  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif', '.svg', '.avif', '.heic', '.heif']
  const videoExts = ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.wmv', '.flv']

  /** 异步递归扫描，每层使用 Promise.all 并行 stat */
  async function scanDir(currentPath: string): Promise<void> {
    let entries: string[]
    try {
      entries = await readdir(currentPath)
    } catch (err) {
      console.error(`[Scan] 无法读取目录: ${currentPath}`, err)
      return
    }

    // 并行 stat 所有条目
    const statsResults = await Promise.allSettled(
      entries.map(async (entry) => {
        const fullPath = join(currentPath, entry)
        const s = await stat(fullPath)
        return { entry, fullPath, stats: s }
      })
    )

    const subdirs: string[] = []

    for (const result of statsResults) {
      if (result.status === 'rejected') {
        // 跳过无权限文件（例如 macOS .DS_Store 等）
        continue
      }

      const { entry, fullPath, stats: s } = result.value

      if (s.isDirectory()) {
        subdirs.push(fullPath)
        continue
      }

      if (!s.isFile()) continue

      const ext = extname(entry).toLowerCase()
      if (!imageExts.includes(ext) && !videoExts.includes(ext)) continue

      const now = new Date(s.mtimeMs).toISOString()
      files.push(createMedia({
        id: generateId(),
        localPath: fullPath,
        filename: entry,
        mimeType: imageExts.includes(ext) ? `image/${ext.slice(1)}` : `video/${ext.slice(1)}`,
        mediaType: getMediaTypeByExtension(entry),
        size: s.size,
        createdAt: now,
        updatedAt: now,
        takenAt: now,
      }))
    }

    // 递归扫描子目录
    for (const subdir of subdirs) {
      await scanDir(subdir)
    }
  }

  await scanDir(dirPath)
  const elapsed = Math.round(performance.now() - start)

  return { files, scannedCount: files.length, elapsed }
})

/** 读取文件为 Data URL (用于预览) — 支持 HEIC/HEIF 自动转 JPEG */
ipcMain.handle(IpcChannels.READ_FILE_DATA_URL, async (_event, filePath: string): Promise<string> => {
  try {
    const extLower = extname(filePath).toLowerCase()
    const ext = extLower.slice(1)

    const buffer = await readFile(filePath)
    const mime = ext === 'jpg' ? 'jpeg' : ext

    // HEIC/HEIF 需要 sharp 解码后转 JPEG（浏览器不支持原生渲染）
    if (HEIC_EXTENSIONS.has(extLower)) {
      // const jpegBuffer = await sharp(filePath).toFormat('jpeg', { quality: 90 }).toBuffer()
      const outputBuffer = await heicConvert({
        buffer: buffer, // the HEIC file buffer
        format: 'JPEG',      // output format
        quality: 0.8,      // the jpeg compression quality, between 0 and 1
      });
      return `data:image/jpeg;base64,${outputBuffer.toString('base64')}`
    }

    
    return `data:image/${mime};base64,${buffer.toString('base64')}`
  } catch (err) {
    console.error(`[IPC] READ_FILE_DATA_URL 失败: ${filePath}`, err)
    throw new Error(`无法读取文件: ${filePath}`)
  }
})

/** 删除本地文件 */
ipcMain.handle(IpcChannels.DELETE_LOCAL_FILE, async (_event, filePath: string): Promise<boolean> => {
  try {
    await unlink(filePath)
    return true
  } catch {
    return false
  }
})

/** 打开文件选择器 */
ipcMain.handle(IpcChannels.OPEN_FILE_PICKER, async () => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif'] },
      { name: 'Videos', extensions: ['mp4', 'webm', 'mkv', 'avi', 'mov'] },
    ],
  })
  return result.canceled ? null : result.filePaths
})

/** 打开目录选择器 */
ipcMain.handle(IpcChannels.OPEN_DIR_PICKER, async () => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  })
  return result.canceled ? null : result.filePaths[0]
})

/** 获取应用路径 */
ipcMain.handle(IpcChannels.GET_APP_PATH, async (_event, name: string) => {
  return app.getPath(name as Parameters<typeof app.getPath>[0])
})

/** 写入剪贴板 */
ipcMain.handle(IpcChannels.CLIPBOARD_WRITE, async (_event, text: string) => {
  clipboard.writeText(text)
})

/** 打开外部链接 */
ipcMain.handle(IpcChannels.OPEN_EXTERNAL, async (_event, url: string) => {
  await shell.openExternal(url)
})

// ====== 文件系统监听 ======

/** 当前活跃的 watcher 实例 */
let activeWatcher: ReturnType<typeof watch> | null = null

/** 开始监听目录变化 */
ipcMain.handle(IpcChannels.WATCH_DIRECTORY, async (event, dirPath: string) => {
  // 关闭之前的监听
  if (activeWatcher) {
    activeWatcher.close()
    activeWatcher = null
  }

  try {
    activeWatcher = watch(dirPath, { recursive: true }, (_eventType, filename) => {
      if (!filename || typeof filename !== 'string') return
      const ext = extname(filename).toLowerCase()
      const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif', '.svg', '.avif', '.heic', '.heif']
      const videoExts = ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.wmv', '.flv']

      if (!imageExts.includes(ext) && !videoExts.includes(ext)) return

      // 通知渲染进程文件已变更
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IpcChannels.FILES_CHANGED, {
          type: _eventType,
          filename,
          fullPath: join(dirPath, filename),
        })
      }
    })
    return true
  } catch (err) {
    console.error('[Watcher] Failed to start:', err)
    return false
  }
})

/** 停止文件监听 */
ipcMain.handle(IpcChannels.UNWATCH_DIRECTORY, async () => {
  if (activeWatcher) {
    activeWatcher.close()
    activeWatcher = null
  }
  return true
})

// ====== App Lifecycle ======

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
