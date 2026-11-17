import { SOUND_PREVIEWS } from '../soundPreviews'

describe('SOUND_PREVIEWS', () => {
  it('maps each preview to its bundled sound asset', () => {
    expect(SOUND_PREVIEWS.map(({ id, asset }) => ({ id, asset }))).toEqual([
      { id: 'before', asset: require('../../../assets/sounds/before.mp3') },
      { id: 'adhan', asset: require('../../../assets/sounds/adhan.mp3') },
      { id: 'adhan-fajr', asset: require('../../../assets/sounds/adhan_fajr.mp3') },
      { id: 'iqama', asset: require('../../../assets/sounds/iqama.mp3') },
    ])
  })
})
