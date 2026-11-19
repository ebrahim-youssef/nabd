const { getInvalidFontFiles } = require('../check-fonts.cjs') as {
  getInvalidFontFiles: (paths: string[], fileSizes: Record<string, number | undefined>) => string[]
}
const THMANYAH_FONT_PATHS = require('../../theme/fonts.cjs') as string[]

describe('getInvalidFontFiles', () => {
  it('reports missing font files', () => {
    expect(getInvalidFontFiles(THMANYAH_FONT_PATHS, {})).toEqual(THMANYAH_FONT_PATHS)
  })

  it('reports empty and undersized font files', () => {
    const files = Object.fromEntries(THMANYAH_FONT_PATHS.map((path) => [path, 1024]))
    files[THMANYAH_FONT_PATHS[0]] = 0
    files[THMANYAH_FONT_PATHS[1]] = 1

    expect(getInvalidFontFiles(THMANYAH_FONT_PATHS, files)).toEqual([
      THMANYAH_FONT_PATHS[0],
      THMANYAH_FONT_PATHS[1],
    ])
  })

  it('accepts all complete font files', () => {
    const files = Object.fromEntries(THMANYAH_FONT_PATHS.map((path) => [path, 1024]))

    expect(getInvalidFontFiles(THMANYAH_FONT_PATHS, files)).toEqual([])
  })
})
