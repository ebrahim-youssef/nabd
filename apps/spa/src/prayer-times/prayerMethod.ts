import { DEFAULT_METHOD_ID, isCalculationMethodId } from '@nabd/shared'
import type { CalculationMethodId } from '@nabd/shared'

const METHOD_KEY = 'nabd:calc-method'
export const METHOD_EVENT = 'nabd:calc-method'

export function readCalculationMethodId(): CalculationMethodId {
  try {
    const value = window.localStorage.getItem(METHOD_KEY)
    return isCalculationMethodId(value) ? value : DEFAULT_METHOD_ID
  } catch {
    return DEFAULT_METHOD_ID
  }
}

export function applyCalculationMethodId(methodId: CalculationMethodId): void {
  try {
    window.localStorage.setItem(METHOD_KEY, methodId)
  } catch {
    // The method is a convenience preference; a storage failure must not break the screen.
  }
  window.dispatchEvent(new Event(METHOD_EVENT))
}
