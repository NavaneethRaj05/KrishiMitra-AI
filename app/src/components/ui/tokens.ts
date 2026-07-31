export const colors = {
  bg: {
    base:    '#FFFFFF',   // --surface
    card:    '#F7F9F8',   // --surface2
    card2:   '#E1F5EE',   // elevated card / --green-light
    input:   '#FFFFFF',   // input background
    overlay: 'rgba(0, 0, 0, 0.4)', // modal overlay
  },
  border: {
    default: '#E5E8E7',   // --border
    strong:  '#D1D5D4',
    focus:   '#1D9E75',   // --green
  },
  green: {
    bright: '#1D9E75',   // --green
    mid:    '#1D9E75',   // button fill
    dark:   '#085041',   // --green-dark
    dim:    '#E1F5EE',   // --green-light
  },
  amber: {
    bright: '#EF9F27',   // --amber
    dark:   '#633806',   // dark amber for text
    dim:    '#FAEEDA',   // --amber-light
  },
  sky: {
    bright: '#534AB7',   // --purple (used for info/sky in secondary features)
    dim:    '#EEEDFE',   // --purple-light
  },
  sand: {
    bright: '#085041',   // dark green contrast text on light bg
    dim:    '#E1F5EE',
  },
  text: {
    primary:   '#1A2521',  // --text (dark charcoal/green-tinted)
    secondary: '#4A5D57',  // --text2
    tertiary:  '#80968F',  // --text3
    inverse:   '#FFFFFF',  // text on green
  },
  red:     '#B84040',
  redDim:  '#FFEAEA',
}

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

import { Platform } from 'react-native'

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
