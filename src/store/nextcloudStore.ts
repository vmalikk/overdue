import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { account } from '@/lib/appwrite/client'

export interface NextcloudFile {
  name: string
  path: string
}

export interface NextcloudItem {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  lastmod?: string
}

interface NextcloudStore {
  isConnected: boolean
  isLoading: boolean
  url: string
  username: string

  checkStatus: () => Promise<void>
  connect: (url: string, username: string, password: string) => Promise<void>
  disconnect: () => Promise<void>
  uploadFile: (file: File, courseName: string) => Promise<NextcloudFile | null>
  listFiles: (path: string) => Promise<NextcloudItem[]>
  downloadFileUrl: (path: string) => string
  deleteFile: (path: string) => Promise<void>
}

export const useNextcloudStore = create<NextcloudStore>()(
  persist(
    (set, get) => ({
      isConnected: false,
      isLoading: false,
      url: '',
      username: '',

      checkStatus: async () => {
        try {
          const { jwt } = await account.createJWT()
          const res = await fetch('/api/storage/nextcloud/config', {
            headers: { Authorization: `Bearer ${jwt}` },
          })
          const data = await res.json()
          set({
            isConnected: data.isConnected,
            url: data.url || '',
            username: data.username || '',
          })
        } catch {
          set({ isConnected: false })
        }
      },

      connect: async (url: string, username: string, password: string) => {
        set({ isLoading: true })
        try {
          const { jwt } = await account.createJWT()
          const res = await fetch('/api/storage/nextcloud/config', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${jwt}`,
            },
            body: JSON.stringify({ url, username, password }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error)
          set({ isConnected: true, url, username })
        } finally {
          set({ isLoading: false })
        }
      },

      disconnect: async () => {
        set({ isLoading: true })
        try {
          const { jwt } = await account.createJWT()
          await fetch('/api/storage/nextcloud/config', {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${jwt}` },
          })
          set({ isConnected: false, url: '', username: '' })
        } finally {
          set({ isLoading: false })
        }
      },

      uploadFile: async (file: File, courseName: string) => {
        try {
          const { jwt } = await account.createJWT()
          const formData = new FormData()
          formData.append('file', file)
          formData.append('courseName', courseName)

          const res = await fetch('/api/storage/nextcloud/upload', {
            method: 'POST',
            headers: { Authorization: `Bearer ${jwt}` },
            body: formData,
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error)
          return { name: data.fileName, path: data.path } as NextcloudFile
        } catch (error) {
          console.error('Upload failed:', error)
          return null
        }
      },

      downloadFileUrl: (path: string) => {
        return `/api/storage/nextcloud/download?path=${encodeURIComponent(path)}`
      },

      listFiles: async (path: string) => {
        try {
          const { jwt } = await account.createJWT()
          const res = await fetch(`/api/storage/nextcloud/list?path=${encodeURIComponent(path)}`, {
            headers: { Authorization: `Bearer ${jwt}` },
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error)
          return data.items as NextcloudItem[]
        } catch (error) {
          console.error('List files failed:', error)
          return []
        }
      },

      deleteFile: async (path: string) => {
        try {
          const { jwt } = await account.createJWT()
          await fetch('/api/storage/nextcloud/delete', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${jwt}`,
            },
            body: JSON.stringify({ path }),
          })
        } catch (error) {
          console.error('Delete failed:', error)
        }
      },
    }),
    {
      name: 'nextcloud-storage',
      partialize: (state) => ({
        isConnected: state.isConnected,
        url: state.url,
        username: state.username,
      }),
    }
  )
)
