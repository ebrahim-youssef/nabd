import { BACKUP_MAX_BYTES } from '../logic'
import { pickBackupText, writeBackupFile } from '../transport'
import { getDocumentAsync } from 'expo-document-picker'
import { File, Paths } from 'expo-file-system'
import { shareAsync } from 'expo-sharing'

const mockFile = File as jest.MockedClass<typeof File>
const mockGetDocumentAsync = getDocumentAsync as jest.MockedFunction<typeof getDocumentAsync>
const mockShareAsync = shareAsync as jest.MockedFunction<typeof shareAsync>
const mockWrite = jest.fn()
const mockText = jest.fn()

jest.mock('expo-file-system', () => ({
  File: jest.fn(),
  Paths: { cache: { uri: 'file:///cache/' } },
}))
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn() }))
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }))

describe('backup transport', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFile.mockImplementation(
      () =>
        ({
          size: 12,
          uri: 'file:///cache/nabd-backup-2026-10-18.json',
          text: mockText,
          write: mockWrite,
        }) as unknown as File,
    )
    mockGetDocumentAsync.mockResolvedValue({ canceled: true, assets: null })
    mockShareAsync.mockResolvedValue(undefined)
    mockText.mockResolvedValue('{"backup":true}')
  })

  it('writes a date-only cache filename and shares it as JSON', async () => {
    const result = await writeBackupFile('{"backup":true}', '2026-10-18T10:00:00.000Z')

    expect(result).toEqual({ ok: true, value: undefined })
    expect(mockFile).toHaveBeenCalledWith(Paths.cache, 'nabd-backup-2026-10-18.json')
    expect(mockWrite).toHaveBeenCalledWith('{"backup":true}')
    expect(mockShareAsync).toHaveBeenCalledWith('file:///cache/nabd-backup-2026-10-18.json', {
      mimeType: 'application/json',
    })
  })

  it('returns null when the picker is canceled', async () => {
    expect(await pickBackupText()).toBeNull()
  })

  it('refuses an oversized picked file before reading it', async () => {
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          name: 'too-large.json',
          size: BACKUP_MAX_BYTES + 1,
          uri: 'file:///picked/too-large.json',
          lastModified: 0,
        },
      ],
    })

    await expect(pickBackupText()).resolves.toEqual({ ok: false, error: 'oversized_file' })
    expect(mockText).not.toHaveBeenCalled()
  })

  it('reads a picked JSON file after checking its reported size', async () => {
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [
        { name: 'backup.json', size: 12, uri: 'file:///picked/backup.json', lastModified: 0 },
      ],
    })

    await expect(pickBackupText()).resolves.toEqual({ ok: true, value: '{"backup":true}' })
    expect(mockGetDocumentAsync).toHaveBeenCalledWith({
      type: ['application/json', 'text/plain', 'application/octet-stream'],
      copyToCacheDirectory: true,
    })
    expect(mockFile).toHaveBeenCalledWith('file:///picked/backup.json')
    expect(mockText).toHaveBeenCalledTimes(1)
  })

  it('returns a typed failure when reading the picked file fails', async () => {
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [
        { name: 'backup.json', size: 12, uri: 'file:///picked/backup.json', lastModified: 0 },
      ],
    })
    mockText.mockRejectedValue(new Error('read failed'))

    await expect(pickBackupText()).resolves.toEqual({ ok: false, error: 'read_failed' })
  })

  it('does not use an invalid timestamp as a cache path', async () => {
    await expect(writeBackupFile('{"backup":true}', '../outside.json')).resolves.toEqual({
      ok: false,
      error: 'write_failed',
    })
    expect(mockFile).not.toHaveBeenCalled()
  })
})
