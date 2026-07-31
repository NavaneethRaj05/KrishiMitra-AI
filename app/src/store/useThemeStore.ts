import { create } from 'zustand'
import { MMKV } from 'react-native-mmkv'

const storage = new MMKV()

export type ThemeMode = 'light' | 'dark'

interface ThemeState {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  toggleTheme: () => void
}

const applyWebTheme = (mode: ThemeMode) => {
  if (typeof document !== 'undefined' && document.body) {
    if (mode === 'dark') {
      document.body.style.backgroundColor = '#0F172A'
      document.body.style.color = '#F8FAFC'
      document.documentElement.classList.add('dark-theme')
    } else {
      document.body.style.backgroundColor = '#FFFFFF'
      document.body.style.color = '#1A2521'
      document.documentElement.classList.remove('dark-theme')
    }
  }
}

export const useThemeStore = create<ThemeState>((set) => {
  const initialMode = (storage.getString('theme_mode') as ThemeMode) || 'light'
  applyWebTheme(initialMode)

  return {
    mode: initialMode,
    setMode: (mode) => {
      storage.set('theme_mode', mode)
      applyWebTheme(mode)
      set({ mode })
    },
    toggleTheme: () => {
      set((state) => {
        const nextMode = state.mode === 'light' ? 'dark' : 'light'
        storage.set('theme_mode', nextMode)
        applyWebTheme(nextMode)
        return { mode: nextMode }
      })
    }
  }
})

export const getThemeColors = (mode: ThemeMode) => {
  if (mode === 'dark') {
    return {
      bg: {
        base:    '#0F172A',
        card:    '#1E293B',
        card2:   '#1E3A8A',
        input:   '#1E293B',
        overlay: 'rgba(0, 0, 0, 0.7)',
      },
      border: {
        default: '#334155',
        strong:  '#475569',
        focus:   '#10B981',
      },
      green: {
        bright: '#10B981',
        mid:    '#059669',
        dark:   '#A7F3D0',
        dim:    '#064E3B',
      },
      amber: {
        bright: '#F59E0B',
        dark:   '#FDE68A',
        dim:    '#78350F',
      },
      sky: {
        bright: '#818CF8',
        dim:    '#312E81',
      },
      sand: {
        bright: '#6EE7B7',
        dim:    '#064E3B',
      },
      text: {
        primary:   '#F8FAFC',
        secondary: '#94A3B8',
        tertiary:  '#64748B',
        inverse:   '#0F172A',
      },
      red:     '#EF4444',
      redDim:  '#7F1D1D',
    }
  }

  return {
    bg: {
      base:    '#FFFFFF',
      card:    '#F7F9F8',
      card2:   '#E1F5EE',
      input:   '#FFFFFF',
      overlay: 'rgba(0, 0, 0, 0.4)',
    },
    border: {
      default: '#E5E8E7',
      strong:  '#D1D5D4',
      focus:   '#1D9E75',
    },
    green: {
      bright: '#1D9E75',
      mid:    '#1D9E75',
      dark:   '#085041',
      dim:    '#E1F5EE',
    },
    amber: {
      bright: '#EF9F27',
      dark:   '#633806',
      dim:    '#FAEEDA',
    },
    sky: {
      bright: '#534AB7',
      dim:    '#EEEDFE',
    },
    sand: {
      bright: '#085041',
      dim:    '#E1F5EE',
    },
    text: {
      primary:   '#1A2521',
      secondary: '#4A5D57',
      tertiary:  '#80968F',
      inverse:   '#FFFFFF',
    },
    red:     '#B84040',
    redDim:  '#FFEAEA',
  }
}

export const useThemeColors = () => {
  const mode = useThemeStore((state) => state.mode)
  return getThemeColors(mode)
}
