import { QADA_COPY } from '@nabd/shared'
import { View } from 'react-native'

import { PageHeader } from '../app/PageHeader'
import { ScreenContainer } from '../app/ScreenContainer'
import { QadaLedger } from './QadaLedger'

export function QadaRoute() {
  return (
    <ScreenContainer testID="qada-route">
      <View className="gap-6">
        <PageHeader backHref="/stats" title={QADA_COPY.pageTitle} />
        <QadaLedger />
      </View>
    </ScreenContainer>
  )
}
