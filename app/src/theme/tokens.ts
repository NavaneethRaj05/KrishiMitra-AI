/**
 * KrishiMitra AI — Design Token System
 *
 * Semantic token names, not hardcoded colors.
 * All components consume these tokens via useTheme() hook.
 *
 * Brand palette:
 *   - Accent primary  : Forest teal  #1D9E75  (calm, trustworthy agricultural green)
 *   - Accent secondary: Warm amber   #D4860A  (alerts, warnings)
 *   - Success         : Meadow green #3DAF6E
 *   - Warning         : Harvest gold #D4860A
 *   - Error           : Terra red    #C0392B
 *   - Info            : Dusk indigo  #4F46A8
 */

export const palette = {
  // Forest teal — primary brand
  teal50:  '#E6F7F2',
  teal100: '#C0EAD9',
  teal200: '#8DD4BA',
  teal300: '#5BBE9B',
  teal400: '#34A982',
  teal500: '#1D9E75', // brand accent
  teal600: '#17815F',
  teal700: '#0F6047',
  teal800: '#085041',
  teal900: '#042E25',

  // Warm amber — advisory / warning
  amber50:  '#FDF5E6',
  amber100: '#FAECC2',
  amber200: '#F5D483',
  amber300: '#F0BD45',
  amber400: '#E8A31D',
  amber500: '#D4860A', // warning accent
  amber600: '#AB6A07',
  amber700: '#835005',
  amber800: '#633B04',
  amber900: '#3D2202',

  // Meadow green — success
  green50:  '#EDFAF2',
  green100: '#C8F0D8',
  green200: '#90E0B1',
  green300: '#59D18A',
  green400: '#3DBF72',
  green500: '#3DAF6E', // success
  green600: '#2F8D57',
  green700: '#226B41',
  green800: '#164A2C',
  green900: '#0B2918',

  // Terra red — error / danger
  red50:   '#FCF0EE',
  red100:  '#F7D5D0',
  red200:  '#F0A89F',
  red300:  '#E87B6E',
  red400:  '#DB4F3F',
  red500:  '#C0392B', // error
  red600:  '#992D22',
  red700:  '#73221A',
  red800:  '#4D1611',
  red900:  '#260B09',

  // Dusk indigo — info / knowledge
  indigo50:  '#EEEDFE',
  indigo100: '#D5D3FD',
  indigo200: '#ADA9FB',
  indigo300: '#857FF8',
  indigo400: '#6960F5',
  indigo500: '#4F46A8', // info
  indigo600: '#3E3884',
  indigo700: '#2E2A63',
  indigo800: '#1E1C42',
  indigo900: '#0F0E21',

  // Neutral — earthy base
  stone50:  '#FAFAF9',
  stone100: '#F4F3F1',
  stone150: '#EDECEA',
  stone200: '#E3E1DE',
  stone300: '#CBC9C4',
  stone400: '#A8A49E',
  stone500: '#847E77',
  stone600: '#615D58',
  stone700: '#433F3B',
  stone800: '#2A2825',
  stone900: '#181614',

  // Pure
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const

// ── Spacing ─────────────────────────────────────────────────────────────────
export const spacing = {
  '1':   4,
  '2':   8,
  '3':   12,
  '4':   16,
  '5':   20,
  '6':   24,
  '7':   28,
  '8':   32,
  '10':  40,
  '12':  48,
  '14':  56,
  '16':  64,
  // aliases
  xs:    4,
  sm:    8,
  md:    12,
  base:  16,
  lg:    20,
  xl:    28,
  xxl:   40,
} as const

// ── Border radii ─────────────────────────────────────────────────────────────
export const radii = {
  none: 0,
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  '2xl': 32,
  full: 9999,
} as const

// ── Typography ───────────────────────────────────────────────────────────────
export const typography = {
  families: {
    sans:  'System',
    mono:  Platform_mono(),
  },
  sizes: {
    xs:   11,
    sm:   13,
    base: 15,
    md:   17,
    lg:   20,
    xl:   24,
    '2xl': 28,
    '3xl': 34,
    '4xl': 42,
  },
  weights: {
    regular:  '400' as const,
    medium:   '500' as const,
    semibold: '600' as const,
    bold:     '700' as const,
    heavy:    '800' as const,
  },
  lineHeights: {
    tight:    1.2,
    snug:     1.4,
    normal:   1.6,
    relaxed:  1.75,
    loose:    2.0,
  },
  letterSpacings: {
    tight:  -0.5,
    normal:  0,
    wide:    0.5,
    wider:   1,
    widest:  2,
  },
} as const

function Platform_mono() {
  // Avoid importing Platform here to keep tokens pure
  return 'Courier'
}

// ── Shadow tokens ─────────────────────────────────────────────────────────────
export const shadows = {
  none: {},
  xs: {
    shadowColor: palette.stone900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: palette.stone900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: palette.stone900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: palette.stone900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
} as const

// ── Animation durations ──────────────────────────────────────────────────────
export const duration = {
  fast:    150,
  normal:  250,
  slow:    400,
  slower:  600,
} as const
