import { Platform } from 'react-native'

function setPlatform(os: string): void {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: os })
}

describe('device platform selector', () => {
  afterEach(() => {
    jest.resetModules()
    setPlatform('ios')
  })

  it.each([
    ['android', 'androidDevicePlatform'],
    ['ios', 'iosDevicePlatform'],
    ['web', 'iosDevicePlatform'],
  ])('selects the %s implementation for %s', (os, implementation) => {
    setPlatform(os)

    jest.isolateModules(() => {
      jest.doMock('../android', () => ({ androidDevicePlatform: { name: 'android' } }))
      jest.doMock('../ios', () => ({ iosDevicePlatform: { name: 'ios' } }))
      const selected = require('../index') as typeof import('../index')
      expect(selected.selectDevicePlatform(os)).toBe(
        selected[implementation as keyof typeof selected],
      )
    })
  })
})
