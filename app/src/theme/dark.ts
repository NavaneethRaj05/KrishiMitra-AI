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
    base:        '#08100C',            // deep forest obsidian base
    surface:     '#101C16',            // glassmorphic surface
    elevated:    '#16281F',            // elevated cards, modals, sheets
    input:       '#0D1712',
    overlay:     'rgba(0, 0, 0, 0.75)',
    subtle:      '#1C2E24',            // section dividers
    tinted:      '#0F3826',            // emerald-tinted highlights
    warning:     '#2E1E05',
    error:       '#2B0C0A',
    success:     '#0A291A',
    info:        '#131336',
  },

  // ── Text ─────────────────────────────────────────────────────────────────
  text: {
    primary:     '#F2FBF6',            // crisp mint white
    secondary:   '#94A3B8',            // slate muted
    tertiary:    '#64748B',            // hints, placeholders
    disabled:    '#334155',
    inverse:     '#08100C',            // text on light/colored surfaces
    accent:      '#34D399',            // vibrant electric emerald
    warning:     '#FCD34D',
    error:       '#F87171',
    success:     '#4ADE80',
    info:        '#818CF8',
  },

  // ── Brand accent ─────────────────────────────────────────────────────────
  accent: {
    primary:     '#10B981',            // Stitch electric emerald
    primaryHover:'#34D399',
    primaryDim:  '#064E3B',
    primaryMid:  '#047857',
    secondary:   '#F59E0B',            // Harvest gold
    secondaryDim:'#78350F',
  },

  // ── Borders ───────────────────────────────────────────────────────────────
  border: {
    subtle:      'rgba(255, 255, 255, 0.08)',
    default:     'rgba(16, 185, 129, 0.18)',
    strong:      'rgba(16, 185, 129, 0.35)',
    focus:       '#10B981',
    accent:      '#059669',
  },

  // ── Status colors ─────────────────────────────────────────────────────────
  status: {
    success:     '#34D399',
    successBg:   '#064E3B40',
    warning:     '#FBBF24',
    warningBg:   '#78350F40',
    error:       '#F87171',
    errorBg:     '#7F1D1D40',
    info:        '#818CF8',
    infoBg:      '#312E8140',
  },

  // ── Offline / sync states ─────────────────────────────────────────────────
  sync: {
    online:      '#34D399',
    onlineBg:    '#064E3B40',
    offline:     '#FBBF24',
    offlineBg:   '#78350F40',
    syncing:     '#818CF8',
    syncingBg:   '#312E8140',
    pending:     '#64748B',
    pendingBg:   '#1E293B',
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
