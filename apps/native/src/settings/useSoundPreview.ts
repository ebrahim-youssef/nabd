import { createAudioPlayer, setAudioModeAsync } from 'expo-audio'
import type { AudioPlayer } from 'expo-audio'
import { useCallback, useEffect, useRef, useState } from 'react'

import { logger } from '../observability/logger'
import { SOUND_PREVIEWS, type SoundPreviewId } from './soundPreviews'

const START_TIME_SECONDS = 0

type ActivePreview = {
  id: SoundPreviewId
  player: AudioPlayer
  subscription: { remove: () => void }
}

export function useSoundPreview() {
  const activePreviewRef = useRef<ActivePreview | null>(null)
  const [currentId, setCurrentId] = useState<SoundPreviewId | null>(null)

  const releasePreview = useCallback((activePreview: ActivePreview) => {
    activePreview.subscription.remove()
    try {
      activePreview.player.pause()
    } finally {
      activePreview.player.release()
    }
  }, [])

  const resetAfterError = useCallback(
    (activePreview: ActivePreview, cause: unknown) => {
      if (activePreviewRef.current !== activePreview) return
      logger.error('Native sound preview playback failed', cause, {
        previewId: activePreview.id,
      })
      activePreviewRef.current = null
      releasePreview(activePreview)
      setCurrentId(null)
    },
    [releasePreview],
  )

  const play = useCallback(
    (id: SoundPreviewId) => {
      const previousPreview = activePreviewRef.current
      if (previousPreview) {
        activePreviewRef.current = null
        releasePreview(previousPreview)
      }

      const preview = SOUND_PREVIEWS.find((entry) => entry.id === id)
      if (!preview) return

      try {
        const player = createAudioPlayer(preview.asset)
        const activePreview = { id, player } as ActivePreview
        activePreview.subscription = player.addListener('playbackStatusUpdate', (status) => {
          if (status.error) {
            resetAfterError(activePreview, new Error(status.error))
          }
          if (status.didJustFinish && activePreviewRef.current === activePreview) {
            activePreviewRef.current = null
            releasePreview(activePreview)
            setCurrentId(null)
          }
        })
        activePreviewRef.current = activePreview
        setCurrentId(id)

        void player
          .seekTo(START_TIME_SECONDS)
          .then(() => {
            if (activePreviewRef.current === activePreview) player.play()
          })
          .catch((cause: unknown) => resetAfterError(activePreview, cause))
      } catch (cause: unknown) {
        logger.error('Native sound preview player creation failed', cause, { previewId: id })
        setCurrentId(null)
      }
    },
    [releasePreview, resetAfterError],
  )

  const stop = useCallback(() => {
    const activePreview = activePreviewRef.current
    if (!activePreview) return
    activePreviewRef.current = null
    releasePreview(activePreview)
    setCurrentId(null)
  }, [releasePreview])

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: false, shouldPlayInBackground: false }).catch(
      (cause: unknown) => {
        logger.error('Native sound preview audio mode setup failed', cause, {
          operation: 'configure-sound-preview',
        })
      },
    )

    return () => {
      const activePreview = activePreviewRef.current
      if (!activePreview) return
      activePreviewRef.current = null
      releasePreview(activePreview)
    }
  }, [releasePreview])

  return { currentId, play, stop }
}
