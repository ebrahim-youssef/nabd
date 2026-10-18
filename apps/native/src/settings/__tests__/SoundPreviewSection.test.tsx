import { fireEvent, render, screen } from '@testing-library/react-native'

import { SoundPreviewSection } from '../SoundPreviewSection'
import { useSoundPreview } from '../useSoundPreview'

jest.mock('../useSoundPreview', () => ({
  useSoundPreview: jest.fn(),
}))
jest.mock('lucide-react-native', () => ({
  Play: () => null,
  Square: () => null,
}))

const mockedUseSoundPreview = useSoundPreview as jest.MockedFunction<typeof useSoundPreview>
const play = jest.fn()
const stop = jest.fn()

describe('SoundPreviewSection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedUseSoundPreview.mockReturnValue({ currentId: null, play, stop })
  })

  it('renders all four previews and starts the selected sound', async () => {
    await render(<SoundPreviewSection />)

    expect(screen.getByTestId('settings-sounds')).toBeTruthy()
    expect(screen.getByTestId('sound-preview-before')).toBeTruthy()
    expect(screen.getByTestId('sound-preview-adhan')).toBeTruthy()
    expect(screen.getByTestId('sound-preview-adhan-fajr')).toBeTruthy()
    expect(screen.getByTestId('sound-preview-iqama')).toBeTruthy()

    await fireEvent.press(screen.getByTestId('sound-preview-before'))

    expect(play).toHaveBeenCalledWith('before')
  })

  it('turns the active preview button into a stop control', async () => {
    mockedUseSoundPreview.mockReturnValue({ currentId: 'adhan', play, stop })

    await render(<SoundPreviewSection />)
    expect(screen.getByTestId('sound-preview-adhan').props.accessibilityLabel).toBe('إيقاف الأذان')

    await fireEvent.press(screen.getByTestId('sound-preview-adhan'))

    expect(stop).toHaveBeenCalledTimes(1)
    expect(play).not.toHaveBeenCalled()
  })
})
