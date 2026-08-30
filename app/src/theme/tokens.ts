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
  // Electric Emerald & Forest teal — primary brand
  teal50:  '#ECFDF5',
  teal100: '#D1FAE5',
  teal200: '#A7F3D0',
  teal300: '#6EE7B7',
  teal400: '#34D399',
  teal500: '#10B981', // brand accent (Stitch emerald)
  teal600: '#059669',
  teal700: '#047857',
  teal800: '#065F46',
  teal900: '#064E3B',

  // Warm amber / Harvest gold — advisory & alerts
  amber50:  '#FFFBEB',
  amber100: '#FEF3C7',
  amber200: '#FDE68A',
  amber300: '#FCD34D',
  amber400: '#FBBF24',
  amber500: '#F59E0B', // warning accent
  amber600: '#D97706',
  amber700: '#B45309',
  amber800: '#92400E',
  amber900: '#78350F',

  // Meadow green — success
  green50:  '#F0FDF4',
  green100: '#DCFCE7',
  green200: '#BBF7D0',
  green300: '#86EFAC',
  green400: '#4ADE80',
  green500: '#22C55E', // success
  green600: '#16A34A',
  green700: '#15803D',
  green800: '#166534',
  green900: '#14532D',

  // Terra red — error / danger
  red50:   '#FEF2F2',
  red100:  '#FEE2E2',
  red200:  '#FECACA',
  red300:  '#FCA5A5',
  red400:  '#F87171',
  red500:  '#EF4444', // error
  red600:  '#DC2626',
  red700:  '#B91C1C',
  red800:  '#991B1B',
  red900:  '#7F1D1D',

  // Dusk indigo / violet — info / knowledge
  indigo50:  '#EEF2FF',
  indigo100: '#E0E7FF',
  indigo200: '#C7D2FE',
  indigo300: '#A5B4FC',
  indigo400: '#818CF8',
  indigo500: '#6366F1', // info
  indigo600: '#4F46E5',
  indigo700: '#4338CA',
  indigo800: '#3730A3',
  indigo900: '#312E81',

  // Obsidian & Neutral Base
  stone50:  '#F8FAFC',
  stone100: '#F1F5F9',
  stone150: '#E2E8F0',
  stone200: '#CBD5E1',
  stone300: '#94A3B8',
  stone400: '#64748B',
  stone500: '#475569',
  stone600: '#334155',
  stone700: '#1E293B',
  stone800: '#0F172A',
  stone900: '#020617',

  // Obsidian Dark Palette
  obsidian950: '#070D09',
  obsidian900: '#0A130E',
  obsidian800: '#111D16',
  obsidian700: '#182B21',

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
