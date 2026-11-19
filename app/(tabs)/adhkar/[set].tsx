import { useLocalSearchParams } from 'expo-router'

import { AdhkarRoute as NativeAdhkarRoute } from '../../../src/adhkar/AdhkarRoute'

export default function AdhkarSetRoute() {
  const { set } = useLocalSearchParams<{ set?: string | string[] }>()
  const categoryId = Array.isArray(set) ? set[0] : set
  return <NativeAdhkarRoute key={categoryId} initialCategoryId={categoryId} />
}
