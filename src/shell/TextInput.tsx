import { TextInput as NativeTextInput } from 'react-native'
import type { TextInputProps } from 'react-native'

import { withDefaultBodyFont } from './fontFamily'

type AppTextInputProps = TextInputProps & { className?: string }

export function TextInput({ className, ...props }: AppTextInputProps) {
  return <NativeTextInput {...props} className={withDefaultBodyFont(className)} />
}
