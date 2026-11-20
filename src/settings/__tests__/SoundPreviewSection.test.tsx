import { fireEvent, render, screen } from '@testing-library/react-native'

import { SoundPreviewSection } from '../SoundPreviewSection'
import { SOUND_PREVIEWS } from '../soundPreviews'
import { useSoundPreview } from '../useSoundPreview'
import { NATIVE_SETTINGS_COPY } from '../constants'
import { uiCopy } from '../../ui/copy'

jest.mock('../useSoundPreview', () => ({ useSoundPreview: jest.fn() }))
jest.mock('lucide-react-native', () => ({ Play: () => null, Square: () => null }))

const mockedUseSoundPreview = useSoundPreview as jest.MockedFunction<typeof useSoundPreview>
const play = jest.fn()
const stop = jest.fn()

describe('SoundPreviewSection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedUseSoundPreview.mockReturnValue({ currentId: null, play, stop })
  })

  it.each(SOUND_PREVIEWS)('starts the $id preview', async ({ id, label }) => {
    await render(<SoundPreviewSection />)
    await fireEvent.press(screen.getByRole('button', { name: `${uiCopy.play}، ${label}` }))
    expect(play).toHaveBeenCalledWith(id)
  })

  it('stops the active preview', async () => {
    mockedUseSoundPreview.mockReturnValue({ currentId: 'adhan', play, stop })
    await render(<SoundPreviewSection />)
    await fireEvent.press(
      screen.getByRole('button', {
        name: `${uiCopy.stop}، ${NATIVE_SETTINGS_COPY.sounds.previews.adhan.label}`,
      }),
    )
    expect(stop).toHaveBeenCalledTimes(1)
    expect(play).not.toHaveBeenCalled()
  })

  it('shows the volume and silent mode hint', async () => {
    await render(<SoundPreviewSection />)
    expect(screen.getByText(NATIVE_SETTINGS_COPY.sounds.note)).toBeTruthy()
  })
})
