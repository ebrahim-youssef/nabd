# store-assets

Ready-to-upload Google Play graphic assets. Listing copy, form answers, and the
AI image prompts live in [`docs/play-store-listing.md`](../docs/play-store-listing.md).

```
icon-512.png                       512×512 app icon (brand mark) — copy of public/icons/icon-512.png
feature-graphic/
  feature-graphic-1024x500.png     1024×500 starter feature graphic (motif on teal) — replace with a design/AI pass
screenshots/
  01-home.png                      1080×1920 — today's wird
  02-prayer-times.png              1080×1920 — prayer times
  03-stats.png                     1080×1920 — streak & self-review (محاسبة)
  04-adhkar.png                    1080×1920 — adhkar counter (آية الكرسي)
  05-libraries.png                 1080×1920 — adhkar & intentions libraries
```

## Regenerating

- **Launcher icon + splash** (inside the APK): `node scripts/android-icons.mjs`
  (reads `public/icon.svg`; writes `android/app/src/main/res`).
- **Store screenshots**: captured from the running app at a phone viewport, cropped to
  the content column, and framed on a brand-teal gradient at 1080×1920. Re-shoot from the
  app when the UI changes; there is no committed script (it depends on live capture paths).
- **Feature graphic**: `magick`-composed from the brand motif on a teal gradient. Prefer
  a design/AI pass (see the prompts in the listing doc) for the final.

All screens are Arabic (RTL). The demo data shown is a fresh install, so counters read low.
