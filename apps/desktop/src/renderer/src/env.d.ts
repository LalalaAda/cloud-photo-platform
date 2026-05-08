/// <reference types="vite/client" />

import type { ScanResult } from '@cloud-photo/shared'

declare global {
  interface Window {
    electronAPI: {
      scanDirectory: (dirPath: string) => Promise<ScanResult>
      readFileDataUrl: (filePath: string) => Promise<string>
      deleteLocalFile: (filePath: string) => Promise<boolean>
      openFilePicker: () => Promise<string[] | null>
      openDirPicker: () => Promise<string | null>
      getAppPath: (name: string) => Promise<string>
      clipboardWrite: (text: string) => Promise<void>
      openExternal: (url: string) => Promise<void>
    }
  }
}
