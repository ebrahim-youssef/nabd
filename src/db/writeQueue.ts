let tail: Promise<void> = Promise.resolve()

// Expo opens a separate connection for exclusive transactions, so serialize competing writes.
export function queueWrite<T>(write: () => Promise<T>): Promise<T> {
  const result = tail.then(write)
  tail = result.then(
    () => undefined,
    () => undefined,
  )
  return result
}

export async function whenWritesIdle(): Promise<void> {
  let current: Promise<void>
  do {
    current = tail
    await current
  } while (current !== tail)
}
