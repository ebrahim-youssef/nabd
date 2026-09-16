type NativeTheme = {
  colors: {
    gold: string
    'muted-foreground': string
    primary: string
    'on-primary': string
    'ring-track': string
  }
}

export const NATIVE_THEME = require('../../generated/nativewind-theme.cjs') as NativeTheme
export const ICON_SIZE = 20
