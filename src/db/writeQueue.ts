let tail: Promise<void> = Promise.resolve()
let sequence = 0

// Expo opens a separate connection for exclusive transactions, so serialize competing writes.
export function queueWrite<T>(write: () => Promise<T>): Promise<T> {
  sequence += 1
  const result = tail.then(write)
  tail = result.then(
    () => undefined,
    () => undefined,
  )
  return result
}

export function getWriteQueueSequence(): number {
  return sequence
}

export async function whenWritesIdle(): Promise<void> {
  // Refresh waits through a burst, so continuous writes can defer it until the queue drains.
  let current: Promise<void>
  do {
    current = tail
    await current
  } while (current !== tail)
}
