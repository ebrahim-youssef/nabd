import { qadaRemaining } from '../logic/qada'
import { dayCompletion } from '../logic/stats'
import { versionInForce } from '../logic/wird'
import { DEFAULT_NOTIFICATION_PREFS, type NotificationPrefs } from '../logic/notification-prefs'
import type {
  DhikrCompletionRepository,
  OnboardingRepository,
  QadaRepository,
  WirdRepository,
} from '../contracts/repositories'
import type { Coords } from '../types/location'
import type { Mode, Theme } from '../types/appearance'
import type { CalculationMethodId } from '../logic/prayer-calc'
import type { WirdDefinition, WirdVersion } from '../types/wird'

const FIRST_DAY = '2026-08-10'
const SECOND_DAY = '2026-08-11'
const FIRST_CREATED_AT = 1_786_089_600_000
const SECOND_CREATED_AT = FIRST_CREATED_AT + 86_400_000
const FIRST_CHECKED_AT = SECOND_CREATED_AT + 1_000
const FIRST_UNCHECKED_AT = FIRST_CHECKED_AT + 1_000
const SECOND_CHECKED_AT = FIRST_UNCHECKED_AT + 1_000
const SECOND_UNCHECKED_AT = SECOND_CHECKED_AT + 1_000
const SECOND_RECHECKED_AT = SECOND_UNCHECKED_AT + 1_000
const QADA_DEBT_AT = SECOND_RECHECKED_AT + 1_000
const QADA_PAYMENT_AT = QADA_DEBT_AT + 1_000

const FIRST_DEFINITION: WirdDefinition = {
  areas: [{ id: 'first-area', label: 'الأول', order: 1 }],
  items: [{ id: 'first-item', areaId: 'first-area', label: 'ورد النسخة الأولى', kind: 'checkbox' }],
}

const SECOND_DEFINITION: WirdDefinition = {
  areas: [{ id: 'second-area', label: 'الثاني', order: 1 }],
  items: [
    { id: 'second-item', areaId: 'second-area', label: 'ورد النسخة الثانية', kind: 'checkbox' },
    { id: 'second-extra', areaId: 'second-area', label: 'إضافة النسخة الثانية', kind: 'checkbox' },
  ],
}

export const repositoryCharacterizationFixture = {
  firstDay: FIRST_DAY,
  secondDay: SECOND_DAY,
  firstDefinition: FIRST_DEFINITION,
  secondDefinition: SECOND_DEFINITION,
  qadaDebtDays: 3,
  qadaPaymentPrayerId: 'fajr' as const,
} as const

export type CharacterizationRepositories = {
  wird: WirdRepository
  qada: QadaRepository
  dhikrCompletion: DhikrCompletionRepository
  onboarding: OnboardingRepository
}

export type SeededRepositoryCharacterization = {
  firstVersion: WirdVersion
  secondVersion: WirdVersion
}

function valueOrThrow<T>(
  result: { ok: true; value: T } | { ok: false; error: string },
  action: string,
): T {
  if (!result.ok) throw new Error(`characterization seed failed while ${action}: ${result.error}`)
  return result.value
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(
      `characterization assertion failed: ${message}; expected ${String(expected)}, got ${String(actual)}`,
    )
  }
}

// The seed and assertion paths intentionally stay independent so each client can seed a fresh
// engine, then execute the same characterization assertions against its own repositories.
export async function seedRepositoryCharacterization(
  repositories: CharacterizationRepositories,
): Promise<SeededRepositoryCharacterization> {
  const firstVersion = valueOrThrow(
    await repositories.onboarding.seedWirdFromLevel(FIRST_DEFINITION, FIRST_DAY, FIRST_CREATED_AT),
    'seeding onboarding',
  )
  if (firstVersion === null)
    throw new Error('characterization seed failed: onboarding already exists')

  const secondVersion = valueOrThrow(
    await repositories.wird.addVersion(SECOND_DAY, SECOND_DEFINITION, SECOND_CREATED_AT),
    'adding the second wird version',
  )

  valueOrThrow(
    await repositories.wird.appendEntry(
      FIRST_DAY,
      firstVersion.id,
      'first-item',
      true,
      FIRST_CHECKED_AT,
    ),
    'checking the first version item',
  )
  valueOrThrow(
    await repositories.wird.appendEntry(
      FIRST_DAY,
      firstVersion.id,
      'first-item',
      false,
      FIRST_UNCHECKED_AT,
    ),
    'unchecking the first version item',
  )
  valueOrThrow(
    await repositories.dhikrCompletion.completeDhikr(
      SECOND_DAY,
      secondVersion.id,
      'second-item',
      SECOND_CHECKED_AT,
    ),
    'checking the second version item',
  )
  valueOrThrow(
    await repositories.wird.appendEntry(
      SECOND_DAY,
      secondVersion.id,
      'second-item',
      false,
      SECOND_UNCHECKED_AT,
    ),
    'unchecking the second version item',
  )
  valueOrThrow(
    await repositories.wird.appendEntry(
      SECOND_DAY,
      secondVersion.id,
      'second-item',
      true,
      SECOND_RECHECKED_AT,
    ),
    'rechecking the second version item',
  )
  valueOrThrow(await repositories.qada.addQadaDebt(3, QADA_DEBT_AT), 'adding qada debt')
  valueOrThrow(
    await repositories.qada.payQadaPrayer('fajr', QADA_PAYMENT_AT),
    'paying one fajr qada',
  )

  return { firstVersion, secondVersion }
}

export async function assertRepositoryCharacterization(
  repositories: CharacterizationRepositories,
  seeded: SeededRepositoryCharacterization,
): Promise<void> {
  const versions = await repositories.wird.listVersions()
  const firstDayVersion = versionInForce(versions, FIRST_DAY)
  const secondDayVersion = versionInForce(versions, SECOND_DAY)
  assertEqual(firstDayVersion?.id, seeded.firstVersion.id, 'the first version governs its day')
  assertEqual(secondDayVersion?.id, seeded.secondVersion.id, 'the second version governs its day')

  const firstEntries = await repositories.wird.getDayEntries(FIRST_DAY)
  const secondEntries = await repositories.wird.getDayEntries(SECOND_DAY)
  assertEqual(firstEntries.length, 2, 'the first day retains both check and uncheck events')
  assertEqual(secondEntries.length, 3, 'the second day retains all state events')
  assertEqual(
    await repositories.dhikrCompletion.isWirdItemDoneToday(FIRST_DAY, 'first-item'),
    false,
    'the latest first-day event determines item state',
  )
  assertEqual(
    await repositories.dhikrCompletion.isWirdItemDoneToday(SECOND_DAY, 'second-item'),
    true,
    'the latest second-day event determines item state',
  )

  const allEntries = await repositories.wird.getAllEntries()
  const historicalBeforeVersionChange = dayCompletion([seeded.firstVersion], allEntries, FIRST_DAY)
  const historicalAfterVersionChange = dayCompletion(versions, allEntries, FIRST_DAY)
  assertEqual(historicalBeforeVersionChange?.total, 1, 'the original historical denominator')
  assertEqual(
    historicalAfterVersionChange?.total,
    historicalBeforeVersionChange?.total,
    'version change leaves historical totals unchanged',
  )
  assertEqual(
    historicalAfterVersionChange?.done,
    historicalBeforeVersionChange?.done,
    'version change leaves historical completion unchanged',
  )

  const remaining = qadaRemaining(await repositories.qada.listQadaEvents())
  assertEqual(remaining.fajr, 2, 'the qada payment reduces fajr debt')
  assertEqual(remaining.dhuhr, 3, 'other qada debt remains unchanged')

  assertEqual(await repositories.onboarding.countWirdVersions(), 2, 'onboarding remains complete')
  const repeatOnboarding = valueOrThrow(
    await repositories.onboarding.seedWirdFromLevel(FIRST_DEFINITION, FIRST_DAY, FIRST_CREATED_AT),
    'checking repeat onboarding',
  )
  assertEqual(repeatOnboarding, null, 'onboarding does not return after the first version exists')
}

export type SharedPreferenceFixture = {
  theme: Theme
  mode: Mode
  calculationMethod: CalculationMethodId
  coords: Coords
  // No client implements this cache today; the legacy third-party reverse geocode is a separate
  // porting decision, so clients without it explicitly omit the optional adapter methods below.
  city?: string
  notifications: NotificationPrefs
}

export type NativeOnlyPreferenceFixture = {
  alarmOnSilent: boolean
  permanentCountdown: boolean
}

export const preferenceCharacterizationFixture: {
  shared: SharedPreferenceFixture
  nativeOnly: NativeOnlyPreferenceFixture
} = {
  shared: {
    theme: 'dark',
    mode: 'modern',
    calculationMethod: 'umm_al_qura',
    coords: { latitude: 21.4225, longitude: 39.8262 },
    city: 'مكة المكرمة',
    notifications: { ...DEFAULT_NOTIFICATION_PREFS, enabled: true, atIqamah: false },
  },
  // Native-only: the SPA must neither persist nor assert these keys.
  nativeOnly: { alarmOnSilent: true, permanentCountdown: true },
}

export type PreferenceCharacterizationAdapter = {
  writeSharedPreferences(values: SharedPreferenceFixture): Promise<void>
  readSharedPreferences(): Promise<SharedPreferenceFixture>
  writeCachedCity?(city: string): Promise<void>
  readCachedCity?(): Promise<string>
  writeNativeOnlyPreferences?(values: NativeOnlyPreferenceFixture): Promise<void>
  readNativeOnlyPreferences?(): Promise<NativeOnlyPreferenceFixture>
}

export async function seedPreferenceCharacterization(
  adapter: PreferenceCharacterizationAdapter,
  options: { includeNativeOnly: boolean },
): Promise<void> {
  await adapter.writeSharedPreferences(preferenceCharacterizationFixture.shared)
  if (preferenceCharacterizationFixture.shared.city && adapter.writeCachedCity) {
    await adapter.writeCachedCity(preferenceCharacterizationFixture.shared.city)
  }
  if (options.includeNativeOnly) {
    if (!adapter.writeNativeOnlyPreferences) {
      throw new Error('characterization seed failed: native-only preference writer is missing')
    }
    await adapter.writeNativeOnlyPreferences(preferenceCharacterizationFixture.nativeOnly)
  }
}

export async function assertPreferenceCharacterization(
  adapter: PreferenceCharacterizationAdapter,
  options: { includeNativeOnly: boolean },
): Promise<void> {
  const shared = await adapter.readSharedPreferences()
  assertEqual(
    shared.theme,
    preferenceCharacterizationFixture.shared.theme,
    'dark theme round-trips',
  )
  assertEqual(shared.mode, preferenceCharacterizationFixture.shared.mode, 'modern mode round-trips')
  assertEqual(
    shared.calculationMethod,
    preferenceCharacterizationFixture.shared.calculationMethod,
    'calculation method round-trips',
  )
  assertEqual(
    shared.coords.latitude,
    preferenceCharacterizationFixture.shared.coords.latitude,
    'latitude round-trips',
  )
  assertEqual(
    shared.coords.longitude,
    preferenceCharacterizationFixture.shared.coords.longitude,
    'longitude round-trips',
  )
  if (adapter.readCachedCity && preferenceCharacterizationFixture.shared.city) {
    assertEqual(
      await adapter.readCachedCity(),
      preferenceCharacterizationFixture.shared.city,
      'cached city round-trips',
    )
  }
  assertEqual(shared.notifications.enabled, true, 'notification master switch round-trips')
  assertEqual(shared.notifications.atIqamah, false, 'disabled notification moment round-trips')

  if (options.includeNativeOnly) {
    if (!adapter.readNativeOnlyPreferences) {
      throw new Error('characterization assertion failed: native-only preference reader is missing')
    }
    const nativeOnly = await adapter.readNativeOnlyPreferences()
    assertEqual(nativeOnly.alarmOnSilent, true, 'alarm-on-silent round-trips')
    assertEqual(nativeOnly.permanentCountdown, true, 'permanent countdown round-trips')
  }
}
