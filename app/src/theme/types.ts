/**
 * Theme interface — structural type for both light and dark themes.
 * All color values are `string` so both themes can be assigned to this type.
 */

export interface Theme {
  bg: {
    base: string
    surface: string
    elevated: string
    input: string
    overlay: string
    subtle: string
    tinted: string
    warning: string
    error: string
    success: string
    info: string
  }
  text: {
    primary: string
    secondary: string
    tertiary: string
    disabled: string
    inverse: string
    accent: string
    warning: string
    error: string
    success: string
    info: string
  }
  accent: {
    primary: string
    primaryHover: string
    primaryDim: string
    primaryMid: string
    secondary: string
    secondaryDim: string
  }
  border: {
    subtle: string
    default: string
    strong: string
    focus: string
    accent: string
  }
  status: {
    success: string
    successBg: string
    warning: string
    warningBg: string
    error: string
    errorBg: string
    info: string
    infoBg: string
  }
  sync: {
    online: string
    onlineBg: string
    offline: string
    offlineBg: string
    syncing: string
    syncingBg: string
    pending: string
    pendingBg: string
  }
  bubble: {
    user: string
    userText: string
    assistant: string
    assistantText: string
    assistantBorder: string
  }
  citation: {
    gold: string
    goldBg: string
    goldBorder: string
    silver: string
    silverBg: string
    silverBorder: string
    bronze: string
    bronzeBg: string
    bronzeBorder: string
    basic: string
    basicBg: string
    basicBorder: string
  }
  tab: {
    background: string
    border: string
    active: string
    inactive: string
    indicator: string
  }
  skeleton: {
    base: string
    highlight: string
  }
}
