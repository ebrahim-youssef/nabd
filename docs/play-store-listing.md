# Google Play — store listing & submission pack

Everything needed to publish نبض on Google Play once the developer account exists.
Copy lives here; the ready-made image assets live in [`store-assets/`](../store-assets/).
Owner-only steps (account, keystore, privacy-policy hosting, upload) are called out.

Related: [`release-android.md`](./release-android.md) (build + signing), backlog NBD-59.

---

## 1. Listing text

### App name (max 30 chars)

```
نبض — رفيق الوِرد
```

Fallback if the dash is not wanted: `نبض: رفيق الوِرد اليومي`.

### Short description (max 80 chars)

```
رفيقك اليومي للوِرد: صلاة وأذكار ونيّات ومحاسبة، يعمل دون إنترنت.
```

### Full description (max 4000 chars)

```
نبض رفيقٌ يعينك على المداومة على وِردك اليومي: صلواتك، وأذكارك، ونيّاتك،
ثم يحاسبك على ما التزمت به بلطفٍ وصدق.

الفكرة بسيطة: تُحدِّد ما تريد المداومة عليه كل يوم، ويذكّرك نبض به،
ويحفظ لك أثرك، ويُريك استمرارك أسبوعًا بعد أسبوع حتى تثبت العادة.

ما يقدّمه نبض:

• وِرد اليوم في مكانٍ واحد: صلواتك الخمس ونوافلها، وأذكارك، وقراءتك،
  ونوايا عملك، تتابعها وتُعلّم ما أتممته.

• مواقيت الصلاة على جهازك: تُحسب محليًّا حسب موقعك وطريقة الحساب التي
  تختارها، وتعمل دون إنترنت.

• أذان وتنبيهات: تنبيه قبل دخول الوقت وعند دخوله، بأصواتٍ حقيقية، مع
  خيارٍ لإسماع الأذان حتى في الوضع الصامت.

• مكتبة الأذكار: أذكار الصباح والمساء وأدبار الصلوات والنوم بنصوصها
  ومصادرها، مع عدّادٍ يُحصي لك التكرار.

• مكتبة النوايا: نيّاتٌ تستحضرها قبل عملك، فإنما الأعمال بالنيّات.

• المحاسبة والإحصاءات: تُريك استمرارك، وأفضل سلاسلك، ونسبة إتمامك،
  وتفصيل يومك عنصرًا عنصرًا.

• يعمل دون إنترنت: بياناتك محفوظة على جهازك أولًا، فتفتح التطبيق
  وتتابع وِردك ولو انقطعت الشبكة.

• حسابٌ اختياري: سجّل الدخول لمزامنة بياناتك بين أجهزتك، أو استعمله
  دون حساب كما تحب.

نبض عربيٌّ بالكامل، من اليمين إلى اليسار، صُمِّم ليكون هادئًا لا يشتّتك،
يعينك على القرب من الله بالمداومة، لا بالكثرة.
```

**English mirror** (for an optional `en-US` listing — Arabic stays primary):

- Short: `Your daily wird companion: prayers, adhkar, intentions, and self-review. Works offline.`
- Full (summary): نبض (nabd) helps you keep a consistent daily wird — your prayers, adhkar, intentions (niyyāt) — and holds you to gentle self-accountability (muḥāsaba). On-device prayer times and adhan alarms, a referenced adhkar library with a counter, streaks and completion stats, and full offline support. Arabic-first, RTL. Optional account syncs across devices.

> Authoring note: keep this copy plain and warm. No marketing dashes, no emoji
> headers, no "download now" endings — the same house style as the READMEs.

---

## 2. Graphic assets (in `store-assets/`)

| Asset                    | Play requirement             | Status                                                                              |
| ------------------------ | ---------------------------- | ----------------------------------------------------------------------------------- |
| App icon                 | 512×512 PNG, 32-bit          | ✅ `store-assets/icon-512.png` (brand mark)                                         |
| Feature graphic          | 1024×500 PNG/JPG             | ✅ starter in `store-assets/feature-graphic/` — replace with an AI/design pass (§4) |
| Phone screenshots        | 2–8, 16:9–9:16, ≥320px       | ✅ 5 × 1080×1920 in `store-assets/screenshots/`                                     |
| 7" / 10" tablet shots    | optional                     | ⬜ not provided (phone-only launch is fine)                                         |
| Promo / lifestyle images | optional, for listing polish | ⬜ generate from §4 prompts                                                         |

The launcher icon inside the APK is now the brand mark too (adaptive icon,
deep-teal backdrop) — see NBD icon fix; regenerate with
`node scripts/android-icons.mjs`.

Screenshot captions (optional overlay text, if a designer adds them — natural Arabic):

1. Home: «وِردك اليومي كلّه في مكانٍ واحد»
2. Prayer times: «مواقيت الصلاة على جهازك، دون إنترنت»
3. Stats: «تابِع استمرارك وحاسِب نفسك»
4. Adhkar: «أذكار الصباح والمساء بعدّادٍ يُحصي لك»
5. Libraries: «مكتبة أذكارٍ ونوايا جاهزة»

---

## 3. Play Console forms

### Data safety (verify against actual sync before submitting)

- **Location**: used only to compute prayer times **on the device**; not collected,
  not sent to any server, not shared. Declare as _not collected_.
- **Account (email)**: collected **only if** the user signs in (Supabase auth), for
  sync and account identification. Encrypted in transit. User can request deletion.
- **App activity (wird / prayer / dhikr records)**: stored locally (Dexie); synced to
  Supabase **only when signed in**. Collected (when signed in), not shared with third
  parties, encrypted in transit, deletable on request.
- No advertising, no data sold, no third-party analytics beyond error reporting
  (Sentry) — confirm whether Sentry captures user data before declaring.

### Permissions declaration

- `USE_EXACT_ALARM` + `SCHEDULE_EXACT_ALARM`: the app is an **alarm/reminder (adhan)**
  app — a permitted use case. Declare it in the Console's exact-alarm form.
- `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`: justified by the same adhan use case
  (alarms must fire with the app in the background on battery-saver OEMs).
- `POST_NOTIFICATIONS`, `ACCESS_COARSE/FINE_LOCATION`, `INTERNET`: standard, explained
  in the listing.

### Content rating

Religious/reference utility, no objectionable content. IARC questionnaire answers are
all "no" → expected **Everyone / 3+**.

### Category & contact

- Category: **Lifestyle** (or Books & Reference). Tags: prayer, adhkar, Islam.
- Privacy policy **URL required** (app uses location + notifications + optional account).
  Draft wording is in the onboarding; host it (e.g. a Vercel route or a static page) and
  paste the URL. **Owner task.**

---

## 4. AI image-generation prompts

For a richer feature graphic and optional promo/lifestyle images. Feed these to an
image model (Imagine/Midjourney/etc.). Keep the brand fixed:

- **Palette**: deep teal `#063E3F` / `#0e5a5a`, cream `#E2E4DE`, muted gold `#B08436`.
- **Motif**: an eight-point Islamic khatam star with a pulse/heartbeat line through it
  (that is the نبض mark — نبض means "pulse").
- **Tone**: calm, spiritual, modern, uncluttered. No faces, no depiction of prayer
  postures, no rendered Quranic text (models garble Arabic script — add text later in a
  design tool, never bake AI-generated Arabic).

**A. Feature graphic (1024×500, text-free)**

```
A serene, minimal banner in deep teal (#063E3F) fading to a slightly lighter teal,
1024x500. Centered: an elegant eight-point Islamic geometric star (khatam) rendered as
thin cream and muted-gold lines, with a single glowing gold spark at its top point. Faint,
large-scale Islamic geometric pattern embossed in the background at very low contrast.
Soft ambient light, premium, spiritual, calm. No text, no people. Flat vector style.
```

**B. Promo / lifestyle image (square or 16:9)**

```
A quiet dawn scene in deep teal and cream tones: a softly lit prayer space with a subtle
Islamic geometric lattice casting gentle shadows, a faint crescent of morning light. Muted
gold accents. Peaceful, contemplative, modern minimal illustration. No faces, no text.
Brand colors: teal #063E3F, cream #E2E4DE, gold #B08436.
```

**C. Icon-in-context / hero (for web or social)**

```
A single rounded-square app icon floating on a deep-teal gradient background, the icon
showing an eight-point Islamic khatam star with a cream heartbeat/pulse line through its
center and a small gold spark. Soft drop shadow, subtle geometric pattern behind. Clean,
premium, spiritual. Flat modern style, no text.
```

**D. Section illustration set (optional, consistent style)**

```
A set of 4 small minimal spot illustrations in a consistent flat style, deep teal and
muted gold on cream: (1) a crescent and star, (2) a prayer-times clock with geometric
rays, (3) prayer beads / tally counter, (4) a small chart showing a growing streak. Thin
lines, calm, uncluttered. No text.
```

After generating, drop finals into `store-assets/` and update §2.
