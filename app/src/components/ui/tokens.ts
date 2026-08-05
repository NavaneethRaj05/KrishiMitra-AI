/**
 * Legacy tokens shim — maintains backwards compatibility.
 * New code should use: import { useTheme } from '../../hooks/useTheme'
 *
 * This file re-exports the shared spacing/radii/typography/shadows
 * from the new theme system, and provides a static light-theme
 * `colors` object for components that haven't been migrated yet.
 */

export { spacing, radii, typography, shadows, palette } from '../../theme/tokens'

import { lightTheme } from '../../theme/light'

/**
 * Static color reference (always light theme).
 * @deprecated Use `const { theme } = useTheme()` in components instead.
 */
export const colors = {
  bg: {
    base:    lightTheme.bg.base,
    card:    lightTheme.bg.surface,
    card2:   lightTheme.bg.tinted,
    input:   lightTheme.bg.input,
    overlay: lightTheme.bg.overlay,
  },
  border: {
    default: lightTheme.border.default,
    strong:  lightTheme.border.strong,
    focus:   lightTheme.border.focus,
  },
  green: {
    bright: lightTheme.accent.primary,
    mid:    lightTheme.accent.primary,
    dark:   lightTheme.text.accent,
    dim:    lightTheme.accent.primaryDim,
  },
  amber: {
    bright: lightTheme.accent.secondary,
    dark:   lightTheme.status.warning,
    dim:    lightTheme.status.warningBg,
  },
  sky: {
    bright: lightTheme.status.info,
    dim:    lightTheme.status.infoBg,
  },
  sand: {
    bright: lightTheme.text.accent,
    dim:    lightTheme.accent.primaryDim,
  },
  text: {
    primary:   lightTheme.text.primary,
    secondary: lightTheme.text.secondary,
    tertiary:  lightTheme.text.tertiary,
    inverse:   lightTheme.text.inverse,
  },
  red:     lightTheme.status.error,
  redDim:  lightTheme.status.errorBg,
} as const
