import type { ReactNode } from 'react'
import { Children, Fragment } from 'react'
import { View } from 'react-native'

export function ListGroup({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children)
  return (
    <View className="overflow-hidden rounded-card border border-line bg-surface">
      {rows.map((row, index) => (
        <Fragment key={index}>
          {index > 0 ? <View className="h-px bg-line" /> : null}
          {row}
        </Fragment>
      ))}
    </View>
  )
}
