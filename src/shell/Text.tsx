import { createContext, useContext } from 'react'
import { Text as NativeText } from 'react-native'
import type { TextProps } from 'react-native'

import { withDefaultBodyFont } from './fontFamily'

type AppTextProps = TextProps & { className?: string }
const TextNestingContext = createContext(false)

export function Text({ className, ...props }: AppTextProps) {
  const isNested = useContext(TextNestingContext)
  return (
    <TextNestingContext.Provider value>
      <NativeText {...props} className={withDefaultBodyFont(className, !isNested)} />
    </TextNestingContext.Provider>
  )
}
