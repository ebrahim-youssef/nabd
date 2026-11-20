import { queueWrite } from '../writeQueue'

it('runs concurrent writes in call order and continues after a failure', async () => {
  const applied: number[] = []
  let release: () => void = () => undefined
  const first = queueWrite(async () => {
    await new Promise<void>((resolve) => {
      release = resolve
    })
    applied.push(0)
  })
  const failed = queueWrite(async () => {
    throw new Error('write failed')
  })
  const rest = [1, 2, 3, 4, 5].map((value) =>
    queueWrite(async () => {
      applied.push(value)
    }),
  )
  await Promise.resolve()
  expect(applied).toEqual([])
  release()
  await first
  await expect(failed).rejects.toThrow('write failed')
  await Promise.all(rest)
  expect(applied).toEqual([0, 1, 2, 3, 4, 5])
})
