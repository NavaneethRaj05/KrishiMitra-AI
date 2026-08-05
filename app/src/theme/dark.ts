/**
 * KrishiMitra AI — Dark Theme
 *
 * Design intent:
 *  - Deep stone base (not pure black) — natural depth, reduced eye strain
 *  - Careful elevation: darker base, lighter surfaces
 *  - Accent teal is slightly lighter for better contrast on dark backgrounds
 *  - Avoid neon / glowing effects — keep it calm and readable
 *  - All status/sync states are accessible on dark surfaces
 */

import { palette } from './tokens'
import type { Theme } from './types'

export const darkTheme: Theme = {
  // ── Backgrounds ─────────────────────────────────────────────────────────
  bg: {
    base:        '#141210',            // deepest background — warm dark, not pure black
    surface:     '#1E1C18',            // cards, inputs
    elevated:    '#272420',            // modals, sheets, bottom sheets
    input:       '#1E1C18',
    overlay:     'rgba(0, 0, 0, 0.70)',
    subtle:      '#2A2825',            // section dividers
    tinted:      '#0E2820',            // teal-tinted highlights
    warning:     '#2A1E06',
    error:       '#220C08',
    success:     '#0C2016',
    info:        '#12103A',
  },

  // ── Text ─────────────────────────────────────────────────────────────────
  text: {
    primary:     '#F0EDE8',            // warm off-white — not stark white
    secondary:   '#9A9288',            // subdued text
    tertiary:    '#5C5750',            // hints, placeholders
    disabled:    '#3A3530',
    inverse:     '#141210',            // text on light/colored surfaces
    accent:      '#34D9A4',            // elevated teal for dark mode
    warning:     '#F5C842',
    error:       '#FF6B5B',
    success:     '#54D68A',
    info:        '#8B87F5',
  },

  // ── Brand accent ─────────────────────────────────────────────────────────
  accent: {
    primary:     '#29C08D',            // brighter teal for dark mode visibility
    primaryHover:'#34D9A4',
    primaryDim:  '#0D2E20',
    primaryMid:  '#0F3D28',
    secondary:   '#F0A42A',
    secondaryDim:'#2A1C06',
  },

  // ── Borders ───────────────────────────────────────────────────────────────
  border: {
    subtle:      '#252220',
    default:     '#322F2C',
    strong:      '#454240',
    focus:       '#29C08D',
    accent:      '#1A4D38',
  },

  // ── Status colors ─────────────────────────────────────────────────────────
  status: {
    success:     '#54D68A',
    successBg:   '#0C2016',
    warning:     '#F5C842',
    warningBg:   '#2A1E06',
    error:       '#FF6B5B',
    errorBg:     '#220C08',
    info:        '#8B87F5',
    infoBg:      '#12103A',
  },

  // ── Offline / sync states ─────────────────────────────────────────────────
  sync: {
    online:      '#54D68A',
    onlineBg:    '#0C2016',
    offline:     '#F5C842',
    offlineBg:   '#2A1E06',
    syncing:     '#8B87F5',
    syncingBg:   '#12103A',
    pending:     '#5C5750',
    pendingBg:   '#252220',
  },

  // ── Message bubbles ───────────────────────────────────────────────────────
  bubble: {
    user:        '#1A5C46',            // deeper teal for user in dark mode
    userText:    '#D0F5E8',
    assistant:   '#1E1C18',
    assistantText: '#F0EDE8',
    assistantBorder: '#322F2C',
  },

  // ── Citation chips ────────────────────────────────────────────────────────
  citation: {
    gold:        '#F0D070',
    goldBg:      '#2A1E06',
    goldBorder:  '#5A4210',
    silver:      '#9A9288',
    silverBg:    '#252220',
    silverBorder:'#3A3530',
    bronze:      '#E8A070',
    bronzeBg:    '#261408',
    bronzeBorder:'#5A3418',
    basic:       '#5C5750',
    basicBg:     '#252220',
    basicBorder: '#322F2C',
  },

  // ── Tab bar ───────────────────────────────────────────────────────────────
  tab: {
    background:  '#1A1815',
    border:      '#2A2825',
    active:      '#29C08D',
    inactive:    '#5C5750',
    indicator:   '#29C08D',
  },

  // ── Skeleton loader ───────────────────────────────────────────────────────
  skeleton: {
    base:        '#252220',
    highlight:   '#322F2C',
  },
} as const
