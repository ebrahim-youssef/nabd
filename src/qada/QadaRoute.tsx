import { QADA_COPY } from './copy'
import { View } from 'react-native'

import { PageHeader } from '../shell/PageHeader'
import { ScreenContainer } from '../shell/ScreenContainer'
import { QadaLedger } from './QadaLedger'

export function QadaRoute() {
  return (
    <ScreenContainer testID="qada-route">
      <View className="gap-6">
        <PageHeader backHref="/more" directBack title={QADA_COPY.pageTitle} />
        <QadaLedger />
      </View>
    </ScreenContainer>
  )
}
