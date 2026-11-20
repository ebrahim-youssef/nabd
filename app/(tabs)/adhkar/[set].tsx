import { Redirect, useLocalSearchParams } from 'expo-router'

import { ADHKAR_LIBRARY } from '../../../src/content/adhkar'
import { AdhkarReader } from '../../../src/adhkar/AdhkarReader'

export default function AdhkarSetRoute() {
  const { set } = useLocalSearchParams<{ set?: string | string[] }>()
  const categoryId = Array.isArray(set) ? set[0] : set
  const category = ADHKAR_LIBRARY.find((entry) => entry.id === categoryId)
  return category ? (
    <AdhkarReader key={category.id} category={category} />
  ) : (
    <Redirect href="/adhkar" />
  )
}
