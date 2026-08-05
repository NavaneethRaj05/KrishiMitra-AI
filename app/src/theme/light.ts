/**
 * KrishiMitra AI — Light Theme
 *
 * Design intent:
 *  - Warm off-white base (not stark white) — field-friendly, reduces glare
 *  - Clear elevation hierarchy: base → surface → elevated surface
 *  - High contrast text for outdoor readability
 *  - Teal accent is calm and trustworthy, not aggressive
 */

import { palette } from './tokens'
import type { Theme } from './types'

export const lightTheme: Theme = {
  // ── Backgrounds ─────────────────────────────────────────────────────────
  bg: {
    base:        palette.stone50,      // app background
    surface:     palette.white,        // cards, modals, sheets
    elevated:    palette.white,        // top-level modal surfaces
    input:       palette.white,        // text inputs
    overlay:     'rgba(24, 22, 20, 0.45)', // modal scrim
    subtle:      palette.stone100,     // section backgrounds, dividers
    tinted:      palette.teal50,       // highlighted / selected areas
    warning:     palette.amber50,
    error:       palette.red50,
    success:     palette.green50,
    info:        palette.indigo50,
  },

  // ── Text ─────────────────────────────────────────────────────────────────
  text: {
    primary:     palette.stone900,     // main body, headings
    secondary:   palette.stone600,     // subtext, metadata
    tertiary:    palette.stone400,     // hints, placeholders
    disabled:    palette.stone300,
    inverse:     palette.white,        // text on dark/colored backgrounds
    accent:      palette.teal600,      // interactive text, links
    warning:     palette.amber700,
    error:       palette.red600,
    success:     palette.green700,
    info:        palette.indigo600,
  },

  // ── Brand accent ─────────────────────────────────────────────────────────
  accent: {
    primary:     palette.teal500,
    primaryHover:palette.teal600,
    primaryDim:  palette.teal50,
    primaryMid:  palette.teal100,
    secondary:   palette.amber500,
    secondaryDim:palette.amber50,
  },

  // ── Borders ───────────────────────────────────────────────────────────────
  border: {
    subtle:      palette.stone150,     // light dividers
    default:     palette.stone200,     // card borders
    strong:      palette.stone300,     // emphasized borders
    focus:       palette.teal500,      // focused input ring
    accent:      palette.teal200,
  },

  // ── Status colors ─────────────────────────────────────────────────────────
  status: {
    success:     palette.green500,
    successBg:   palette.green50,
    warning:     palette.amber500,
    warningBg:   palette.amber50,
    error:       palette.red500,
    errorBg:     palette.red50,
    info:        palette.indigo500,
    infoBg:      palette.indigo50,
  },

  // ── Offline / sync states ─────────────────────────────────────────────────
  sync: {
    online:      palette.green500,
    onlineBg:    palette.green50,
    offline:     palette.amber500,
    offlineBg:   palette.amber50,
    syncing:     palette.indigo500,
    syncingBg:   palette.indigo50,
    pending:     palette.stone400,
    pendingBg:   palette.stone100,
  },

  // ── Message bubbles ───────────────────────────────────────────────────────
  bubble: {
    user:        palette.teal500,
    userText:    palette.white,
    assistant:   palette.white,
    assistantText: palette.stone900,
    assistantBorder: palette.stone200,
  },

  // ── Citation chips ────────────────────────────────────────────────────────
  citation: {
    gold:        '#8B6914',
    goldBg:      '#FEF8E7',
    goldBorder:  '#F0D070',
    silver:      palette.stone600,
    silverBg:    palette.stone100,
    silverBorder:palette.stone300,
    bronze:      '#8B4513',
    bronzeBg:    '#FDF0E6',
    bronzeBorder:'#E8B086',
    basic:       palette.stone500,
    basicBg:     palette.stone100,
    basicBorder: palette.stone200,
  },

  // ── Tab bar ───────────────────────────────────────────────────────────────
  tab: {
    background:  palette.white,
    border:      palette.stone200,
    active:      palette.teal500,
    inactive:    palette.stone400,
    indicator:   palette.teal500,
  },

  // ── Skeleton loader ───────────────────────────────────────────────────────
  skeleton: {
    base:        palette.stone150,
    highlight:   palette.stone100,
  },
}

export type { Theme } from './types'
