/**
 * useTheme — primary hook for consuming the active theme.
 *
 * Returns:
 *   theme       — semantic token object (light | dark)
 *   themeMode   — 'light' | 'dark' | 'system'
 *   colorScheme — 'light' | 'dark' (resolved)
 *   isDark      — boolean shorthand
 *   setThemeMode — persist + switch
 */

import { useColorScheme } from 'react-native'
import { useThemeModeStore } from '../store/useThemeModeStore'
import { lightTheme, darkTheme } from '../theme'
import type { Theme } from '../theme'

export type ThemeMode = 'light' | 'dark' | 'system'

export function useTheme(): {
  theme: Theme
  themeMode: ThemeMode
  colorScheme: 'light' | 'dark'
  isDark: boolean
  setThemeMode: (mode: ThemeMode) => void
} {
  const systemScheme = useColorScheme() ?? 'light'
  const { themeMode, setThemeMode } = useThemeModeStore()

  const colorScheme: 'light' | 'dark' =
    themeMode === 'system' ? systemScheme : themeMode

  const theme: Theme = colorScheme === 'dark' ? darkTheme : lightTheme
  const isDark = colorScheme === 'dark'

  return { theme, themeMode, colorScheme, isDark, setThemeMode }
}
