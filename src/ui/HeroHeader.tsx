import { useEffect, useMemo, useState } from 'react'
import { PixelRatio, View } from 'react-native'
import { useColorScheme } from 'nativewind'
import Svg, { Circle, Defs, Path, Pattern, Polygon, Rect } from 'react-native-svg'

import { formatPrayerTime } from '../prayer-times/formatPrayerTime'
import { nightTimings } from '../day-plan/logic'
import type { DayPlanHeader } from '../day-plan/types'
import type { DayPrayerTimes } from '../prayer-times/logic'
import { toArabicIndic } from '../lib/format'
import { HERO_HEIGHT, PATTERN_SIZE, useThemeColors } from '../../theme/tokens'
import { Text } from '../shell/Text'
import { heroPathGeometry } from './heroPathGeometry'

type HeroHeaderProps = {
  header: DayPlanHeader | null
  times: DayPrayerTimes | null
  nextFajr?: number | null
  now: number
  dateLabel: string
  noLocationPrompt: string
  currentPrayer?: string
  progress?: { done: number; required: number }
}

const HERO_WIDTH = 350
const ARC_HEIGHT = 124
const LARGE_FONT_SCALE = 1.3
const FONT_SCALE_FLOAT_TOLERANCE = 0.000001
const MARKER_INNER_RADIUS = 4.8
const MARKER_OUTER_RADIUS = 3.8
const PATTERN_OPACITY_LIGHT = 0.15
const PATTERN_OPACITY_DARK = 0.08
const PATTERN_STROKE_WIDTH = 1.2
const SUN_GLOW_RADIUS = 14
const SUN_RADIUS = 6.5
const MOON_RADIUS = 7
const MOON_CUT_RADIUS = 6.2
const MOON_CUT_OFFSET_X = 3.5
const MOON_CUT_OFFSET_Y = 2
const SUN_GLOW_OPACITY = 0.28
const COUNTDOWN_INTERVAL_MS = 1_000
const SECONDS_PER_HOUR = 3_600
const SECONDS_PER_MINUTE = 60
const STAR_POINT_COUNT = 16
const STAR_INNER_RADIUS_SCALE = 0.58
const ANGLE_HALF_TURN = 2
const ANGLE_INCREMENT_DENOMINATOR = 8
const ANGLE_START_OFFSET = 0.5
const TIME_PART_WIDTH = 2
const ARABIC_ZERO = '٠'
const STAR_PATTERN =
  '28,6 34.1,13.2 43.6,12.4 42.8,21.9 50,28 42.8,34.1 43.6,43.6 34.1,42.8 28,50 21.9,42.8 12.4,43.6 13.2,34.1 6,28 13.2,21.9 12.4,12.4 21.9,13.2'

type StripEntry = { id: string; label: string; at: number }

export function HeroHeader({
  header,
  times,
  nextFajr,
  now,
  dateLabel,
  noLocationPrompt,
  currentPrayer,
  progress,
}: HeroHeaderProps) {
  const theme = useThemeColors()
  const { colorScheme } = useColorScheme()
  const [tick, setTick] = useState(0)
  const clockNow = Math.max(now, tick)
  const isDark = colorScheme === 'dark'

  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), COUNTDOWN_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [])

  const strip = useMemo(
    () => makeStrip(times, nextFajr, header?.mode ?? 'day'),
    [header?.mode, times, nextFajr],
  )
  const progressFraction = header?.position ?? 0
  const geometry = heroPathGeometry(HERO_WIDTH, ARC_HEIGHT, progressFraction)
  const countdown = formatCountdown(header, clockNow)
  const heroTitle = header?.nextEvent?.label ?? currentPrayer ?? 'الصلاة القادمة'

  if (
    PixelRatio.getFontScale() >= LARGE_FONT_SCALE - FONT_SCALE_FLOAT_TOLERANCE ||
    !times ||
    !header
  ) {
    return (
      <View
        className="min-h-[76px] justify-center rounded-b-hero bg-hero px-5 py-3"
        testID="hero-collapsed"
      >
        {times && header ? (
          <View className="flex-row items-center justify-between">
            <Text className="font-display text-prayer-name text-hero-ink">{heroTitle}</Text>
            <Text className="font-sans-medium text-countdown text-gold">{countdown}</Text>
          </View>
        ) : (
          <Text className="font-sans-medium text-body text-hero-ink" testID="hero-location-prompt">
            {noLocationPrompt}
          </Text>
        )}
      </View>
    )
  }

  const markerTimes = header.markers
  const firstMarker = markerTimes[0]?.at ?? 0
  const lastMarker = markerTimes[markerTimes.length - 1]?.at ?? 1
  const duration = lastMarker - firstMarker || 1
  const markerPosition = (at: number) => Math.max(0, Math.min(1, (at - firstMarker) / duration))
  const sunOrMoon = geometry.pointAt(progressFraction)

  return (
    <View
      className="overflow-hidden rounded-b-hero bg-hero text-hero-ink"
      style={{ height: HERO_HEIGHT }}
      testID="hero-expanded"
    >
      <Svg
        accessible={false}
        height="100%"
        style={{ opacity: isDark ? PATTERN_OPACITY_DARK : PATTERN_OPACITY_LIGHT }}
        width="100%"
      >
        <Defs>
          <Pattern
            id="home-star-pattern"
            patternUnits="userSpaceOnUse"
            width={PATTERN_SIZE}
            height={PATTERN_SIZE}
          >
            <Polygon
              points={STAR_PATTERN}
              fill="none"
              stroke={theme.gold}
              strokeWidth={PATTERN_STROKE_WIDTH}
            />
          </Pattern>
        </Defs>
        <Rect fill="url(#home-star-pattern)" height="100%" width="100%" />
      </Svg>
      <View className="absolute inset-x-0 top-0 px-5 pt-[22px]">
        <View className="flex-row items-center justify-between">
          <Text className="font-sans text-body text-hero-mute">{dateLabel}</Text>
          {progress ? (
            <Text className="rounded-pill border border-hero-mute px-2 py-0.5 font-sans-medium text-caption text-hero-ink">
              يومك{' '}
              <Text className="font-sans-bold text-caption text-gold">
                {toArabicIndic(progress.done)}/{toArabicIndic(progress.required)}
              </Text>
            </Text>
          ) : null}
        </View>
        <View className="mt-1 h-[124px]">
          <Svg
            accessible={false}
            height={ARC_HEIGHT}
            viewBox={`0 0 ${HERO_WIDTH} ${ARC_HEIGHT}`}
            width="100%"
          >
            <Path
              d={geometry.restPath}
              fill="none"
              stroke={theme['path-rest']}
              strokeDasharray="2 6"
              strokeLinecap="round"
              strokeWidth={1.5}
            />
            {geometry.travelledPath ? (
              <Path
                d={geometry.travelledPath}
                fill="none"
                stroke={theme.gold}
                strokeLinecap="round"
                strokeWidth={2}
              />
            ) : null}
            {markerTimes.map((marker) => {
              const point = geometry.pointAt(markerPosition(marker.at))
              return (
                <Polygon
                  key={marker.id}
                  fill={marker.at <= clockNow ? theme.gold : theme['mark-rest']}
                  points={starPoints(
                    point.x,
                    point.y,
                    marker.at <= clockNow ? MARKER_INNER_RADIUS : MARKER_OUTER_RADIUS,
                  )}
                />
              )
            })}
            {header.mode === 'day' ? (
              <>
                <Circle
                  cx={sunOrMoon.x}
                  cy={sunOrMoon.y}
                  fill={theme.sun}
                  opacity={SUN_GLOW_OPACITY}
                  r={SUN_GLOW_RADIUS}
                />
                <Circle cx={sunOrMoon.x} cy={sunOrMoon.y} fill={theme.sun} r={SUN_RADIUS} />
              </>
            ) : (
              <>
                <Circle cx={sunOrMoon.x} cy={sunOrMoon.y} fill={theme.moon} r={MOON_RADIUS} />
                <Circle
                  cx={sunOrMoon.x - MOON_CUT_OFFSET_X}
                  cy={sunOrMoon.y - MOON_CUT_OFFSET_Y}
                  fill={theme.hero}
                  r={MOON_CUT_RADIUS}
                />
              </>
            )}
          </Svg>
          <View className="absolute inset-x-0 top-[34px] items-center">
            <Text className="font-display text-prayer-name text-hero-ink">{heroTitle}</Text>
            <Text className="font-sans-medium text-countdown text-gold">{countdown}</Text>
          </View>
        </View>
        <View className="mt-2 flex-row justify-between">
          {strip.map((entry) => {
            const isCurrent = isCurrentEntry(entry, times, clockNow, nextFajr, header.mode)
            return (
              <View className="flex-1 items-center" key={entry.id}>
                <Text
                  className={`text-caption ${
                    isCurrent ? 'font-sans-bold text-gold' : 'font-sans-medium text-hero-ink'
                  }`}
                >
                  {formatPrayerTime(entry.at)}
                </Text>
                <Text
                  className={`text-caption ${
                    isCurrent ? 'font-sans-bold text-gold' : 'font-sans text-hero-mute'
                  }`}
                >
                  {entry.label}
                </Text>
              </View>
            )
          })}
        </View>
      </View>
    </View>
  )
}

function makeStrip(
  times: DayPrayerTimes | null,
  nextFajr: number | null | undefined,
  mode: DayPlanHeader['mode'],
): StripEntry[] {
  if (!times) return []
  if (mode === 'night' && nextFajr) {
    const middle = nightTimings(times.maghrib, nextFajr)
    return [
      { id: 'maghrib', label: 'المغرب', at: times.maghrib },
      { id: 'isha', label: 'العشاء', at: times.isha },
      { id: 'middleOfNight', label: 'منتصف الليل', at: middle.middleOfNight },
      { id: 'lastThird', label: 'الثلث الأخير', at: middle.lastThird },
      { id: 'fajr', label: 'الفجر', at: nextFajr },
    ]
  }
  return [
    { id: 'fajr', label: 'الفجر', at: times.fajr },
    { id: 'sunrise', label: 'الشروق', at: times.sunrise },
    { id: 'dhuhr', label: 'الظهر', at: times.dhuhr },
    { id: 'asr', label: 'العصر', at: times.asr },
    { id: 'maghrib', label: 'المغرب', at: times.maghrib },
    { id: 'isha', label: 'العشاء', at: times.isha },
  ]
}

function isCurrentEntry(
  entry: StripEntry,
  times: DayPrayerTimes | null,
  now: number,
  nextFajr: number | null | undefined,
  mode: DayPlanHeader['mode'],
): boolean {
  if (!times) return false
  if (mode === 'night') {
    const night = nextFajr ? nightTimings(times.maghrib, nextFajr) : null
    if (!night) return false
    if (entry.id === 'maghrib') return now >= times.maghrib && now < times.isha
    if (entry.id === 'isha') return now >= times.isha && now < night.middleOfNight
    if (entry.id === 'middleOfNight') return now >= night.middleOfNight && now < night.lastThird
    if (entry.id === 'lastThird') return now >= night.lastThird && now < (nextFajr ?? 0)
    return false
  }
  if (entry.id === 'fajr') return times.fajr <= now && now < times.sunrise
  if (entry.id === 'sunrise') return times.sunrise <= now && now < times.dhuhr
  if (entry.id === 'dhuhr') return times.dhuhr <= now && now < times.asr
  if (entry.id === 'asr') return times.asr <= now && now < times.maghrib
  if (entry.id === 'maghrib') return times.maghrib <= now && now < times.isha
  return times.isha <= now && now < (nextFajr ?? Number.POSITIVE_INFINITY)
}

function formatCountdown(header: DayPlanHeader | null, now: number): string {
  const target = header?.countdownTarget
  if (target == null) return '—'
  const remainingSeconds = Math.max(0, Math.floor((target - now) / 1_000))
  const hours = Math.floor(remainingSeconds / SECONDS_PER_HOUR)
  const minutes = Math.floor((remainingSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE)
  const seconds = remainingSeconds % SECONDS_PER_MINUTE
  const remaining = [
    toArabicIndic(hours),
    toArabicIndic(minutes).padStart(TIME_PART_WIDTH, ARABIC_ZERO),
    toArabicIndic(seconds).padStart(TIME_PART_WIDTH, ARABIC_ZERO),
  ].join(':')
  return `بعد ${remaining}`
}

function starPoints(centerX: number, centerY: number, radius: number): string {
  return Array.from({ length: STAR_POINT_COUNT }, (_, index) => {
    const angle = (Math.PI * index) / ANGLE_INCREMENT_DENOMINATOR - Math.PI * ANGLE_START_OFFSET
    const pointRadius = index % ANGLE_HALF_TURN === 0 ? radius : radius * STAR_INNER_RADIUS_SCALE
    const x = (centerX + Math.cos(angle) * pointRadius).toFixed(2)
    const y = (centerY + Math.sin(angle) * pointRadius).toFixed(2)
    return `${x},${y}`
  }).join(' ')
}
