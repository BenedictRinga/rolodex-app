# LoopKeeper — Play Store Release (2026-08-17; identity migrated to LoopKeeper 2026-08-26)

## Already done (this repo)
- **Android platform**: Capacitor 6 android added (`android/`), `@capacitor/android` vendored + in deps.
- **Identity** (2026-08-26 brand migration): applicationId `com.zyppar.loopkeeper` · appName **LoopKeeper** · versionCode 1 · versionName `1.0.0`.
- **Native build**: `yarn build:native` = prod web build with `--base-href /` (the PWA `/loopkeeper/` base is web-only) + the static-block fix + `npx cap sync android`. **Always use this for Android** — never the `/loopkeeper/` web build.
- **Icons**: branded union-palette icon set (legacy mipmaps mdpi→xxxhdpi, adaptive foreground + `#FF6B35` background, round icon), splash = cream layer + the mark (`drawable/splash.xml`, `colors.xml`).
- **Play Store listing assets**: `playstore/icon-512.png`, `playstore/feature-graphic-1024x500.png`.
- **Verified**: `assembleDebug` builds clean (6.4 MB APK).

## One-time: create the upload keystore (you — keep it secret, never commit)
```
mkdir D:\MacBook\noGoogle\rolodex-release && cd D:\MacBook\noGoogle\rolodex-release
keytool -genkeypair -v -keystore loopkeeper-upload.keystore -alias loopkeeper \
  -keyalg RSA -keysize 2048 -validity 10000
```
Save the **keystore path + password + alias** in your password manager.
Back it up to the drive + an external copy — losing it = you cannot update the app.

## Wire the release signing
In `android/app/build.gradle`, under `android { signingConfigs { } }` add:
```gradle
signingConfigs {
    release {
        storeFile file(System.getenv("LOOPKEEPER_STORE_FILE") ?: "D:/MacBook/noGoogle/rolodex-release/loopkeeper-upload.keystore")
        storePassword System.getenv("LOOPKEEPER_STORE_PASS")
        keyAlias System.getenv("LOOPKEEPER_KEY_ALIAS")
        keyPassword System.getenv("LOOPKEEPER_KEY_PASS")
    }
}
buildTypes { release { signingConfig signingConfigs.release } }
```
(Env vars keep the passwords out of the repo. Set them in your shell, not in the file.)

## Build the release AAB (Play Store upload format)
```
yarn build:native
cd android
set LOOPKEEPER_STORE_FILE=...  & set LOOPKEEPER_STORE_PASS=... & set LOOPKEEPER_KEY_ALIAS=loopkeeper & set LOOPKEEPER_KEY_PASS=...
gradlew.bat bundleRelease
```
The uploadable file: `android/app/build/outputs/bundle/release/app-release.aab`.

## Play Console checklist
0. **THE GATE (personal accounts created after Nov 2023): production access requires a closed test with at least 12 testers opted-in continuously for the last 14 days.** Plan around this from day one: set up the closed track early, recruit 15+ testers so dropouts never pull you below 12, keep them engaged daily.
1. Create the app — package name `com.zyppar.loopkeeper`.
2. **App content**: declare your privacy policy URL; content rating questionnaire; ads declaration (none); target audience (13+).
3. **Data safety**: what's collected — contacts are stored per user's choice (Device / Cloud / LoopKeeper server); the app transmits contacts only when the user enables LoopKeeper-server or Cloud storage. Declare data sharing honestly per your actual storage choices.
4. **Store listing**: upload `playstore/icon-512.png` + `playstore/feature-graphic-1024x500.png` + screenshots (take real phone shots of: the card list, the flipped card with chat/reminders, the confidante draft, the loops inbox, billing).
5. **Release**: upload the `.aab` → review → start rollout (closed testing → apply for production access after meeting the gate above).
6. **Play App Signing** is used by default for AABs — the upload key you generated is safe to keep local.

## Version bumps (every release)
- `android/app/build.gradle`: versionCode +1, versionName bump.
- Rebuild via `yarn build:native` → `gradlew.bat bundleRelease`.

## Gotchas
- Never run the `/loopkeeper/` PWA web build into Android — the WebView needs `/`.
- The app talks to `https://zyppar.com/api/loopkeeper` + `/socket-rolodex/` — INTERNET permission is auto-added by Capacitor; no cleartext needed (https only). Legacy `/api/openloop` still resolves server-side.
- The demo room + live chat work from the app exactly like the web.
