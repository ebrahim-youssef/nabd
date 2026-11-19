import { TextInput as NativeTextInput } from 'react-native'
import type { TextInputProps } from 'react-native'

import { withDefaultSansFont } from './fontFamily'

type AppTextInputProps = TextInputProps & { className?: string }

export function TextInput({ className, ...props }: AppTextInputProps) {
  return <NativeTextInput {...props} className={withDefaultSansFont(className)} />
}
