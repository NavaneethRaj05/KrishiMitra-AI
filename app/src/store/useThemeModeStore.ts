/**
 * useThemeModeStore — persists theme mode preference.
 * Replaces the old useThemeStore with system theme support.
 */

import { create } from 'zustand'
import { MMKV } from 'react-native-mmkv'

const storage = new MMKV()
const STORAGE_KEY = 'theme_mode_v2'

export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeModeState {
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void
}

const getSavedMode = (): ThemeMode => {
  const saved = storage.getString(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  return 'system' // default to system
}

export const useThemeModeStore = create<ThemeModeState>((set) => ({
  themeMode: getSavedMode(),
  setThemeMode: (mode) => {
    storage.set(STORAGE_KEY, mode)
    set({ themeMode: mode })
  },
}))
