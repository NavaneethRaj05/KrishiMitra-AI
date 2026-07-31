import { create } from 'zustand'

interface OfflineState {
  isConnected: boolean
  offlineQueueSize: number
  isSyncing: boolean
  setConnected: (isConnected: boolean) => void
  setOfflineQueueSize: (offlineQueueSize: number) => void
  setSyncing: (isSyncing: boolean) => void
}

export const useOfflineStore = create<OfflineState>((set) => ({
  isConnected: true,
  offlineQueueSize: 0,
  isSyncing: false,

  setConnected: (isConnected) => set({ isConnected }),
  setOfflineQueueSize: (offlineQueueSize) => set({ offlineQueueSize }),
  setSyncing: (isSyncing) => set({ isSyncing })
}))
