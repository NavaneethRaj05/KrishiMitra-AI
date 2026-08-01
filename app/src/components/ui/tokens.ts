import { Platform } from 'react-native'

const lightColors = {
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

export const colors = Platform.OS === 'web' ? {
  bg: {
    base:    'var(--color-bg-base)',
    card:    'var(--color-bg-card)',
    card2:   'var(--color-bg-card2)',
    input:   'var(--color-bg-input)',
    overlay: 'var(--color-bg-overlay)',
  },
  border: {
    default: 'var(--color-border-default)',
    strong:  'var(--color-border-strong)',
    focus:   'var(--color-border-focus)',
  },
  green: {
    bright: 'var(--color-green-bright)',
    mid:    'var(--color-green-mid)',
    dark:   'var(--color-green-dark)',
    dim:    'var(--color-green-dim)',
  },
  amber: {
    bright: 'var(--color-amber-bright)',
    dark:   'var(--color-amber-dark)',
    dim:    'var(--color-amber-dim)',
  },
  sky: {
    bright: 'var(--color-sky-bright)',
    dim:    'var(--color-sky-dim)',
  },
  sand: {
    bright: 'var(--color-sand-bright)',
    dim:    'var(--color-sand-dim)',
  },
  text: {
    primary:   'var(--color-text-primary)',
    secondary: 'var(--color-text-secondary)',
    tertiary:  'var(--color-text-tertiary)',
    inverse:   'var(--color-text-inverse)',
  },
  red:     'var(--color-red)',
  redDim:  'var(--color-redDim)',
} : lightColors

export const typography = {
  families: {
    sans:  'System',
    mono:  'Courier',
  },
  sizes: {
    xs:   11,
    sm:   13,
    base: 15,
    md:   17,
    lg:   20,
    xl:   24,
    xxl:  30,
  },
  weights: {
    regular: '400' as const,
    medium:  '500' as const,
    semibold:'600' as const,
    bold:    '700' as const,
  },
  lineHeights: {
    tight:  1.3,
    normal: 1.6,
    loose:  1.8,
  }
}

export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  base:16,
  lg:  20,
  xl:  28,
  xxl: 40,
}

export const radii = {
  sm:  6,
  md:  10,
  lg:  14,
  xl:  20,
  full: 999,
}


export const shadows = {
  card: Platform.select({
    web: {
      boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.12)',
    },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    }
  }) as any
}
