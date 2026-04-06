# Co-Captain Development Log — Android Platform Setup & Fixes

## Overview

This log documents the process of setting up Android development for Co-Captain on macOS, configuring the emulator, and fixing platform-specific issues to achieve feature parity with the iOS Capacitor app.

---

## Android Dev Environment Setup

**Brief:** Full Android toolchain setup on a Mac with no prior Android tools installed.

**Detailed:**
- **Starting state:** The `android/` directory was already scaffolded via `npx cap add android`, but no builds had been completed. Web assets were missing (`app/src/main/assets` directory absent). No JDK, no Android Studio, no environment variables configured.
- **Android SDK:** Already partially present at `~/Library/Android/sdk` (build-tools, emulator, platform-tools, API 36) from a prior Capacitor setup step.
- **JDK:** Initially installed JDK 17 via Homebrew, but the Capacitor 8 / Android Gradle Plugin requires **JDK 21** (`error: invalid source release: 21`). Installed JDK 21 via `brew install openjdk@21`. Required `sudo ln -sfn` symlink to `/Library/Java/JavaVirtualMachines/` for macOS to discover it via `/usr/libexec/java_home`.
- **Homebrew quirk:** JDK was installed under `/usr/local/Cellar/` (Intel Mac Homebrew prefix), not `/opt/homebrew/` (Apple Silicon prefix). Initial `JAVA_HOME` fallback path pointed to the wrong location.
- **Android Studio:** Installed via `brew install --cask android-studio`. Linked binary at `/usr/local/bin/studio`.
- **Environment variables** added to `~/.zshrc`:
  ```bash
  export JAVA_HOME=$(/usr/libexec/java_home -v 21 2>/dev/null || echo "/usr/local/opt/openjdk@21")
  export ANDROID_HOME=$HOME/Library/Android/sdk
  export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
  ```

### First Successful Build
- `npm run build` to generate web assets in `dist/`
- `npx cap sync android` to copy assets into `android/app/src/main/assets/public/`
- `./gradlew assembleDebug` produced `app-debug.apk` (4.3MB) after fixing `gradlew` execute permission (`chmod +x`)

---

## Emulator Setup

**Brief:** Created and configured a Pixel 7 emulator with Google Play system image.

**Detailed:**
- **System image:** Downloaded `system-images;android-36;google_apis_playstore;x86_64` via `sdkmanager`.
- **SDK root mismatch:** `sdkmanager` (installed via Homebrew at `/usr/local/share/android-commandlinetools/`) downloaded the system image to its own SDK root, not `~/Library/Android/sdk`. The emulator couldn't find the image (`FATAL: Cannot find AVD system path`). Fixed by symlinking:
  ```bash
  ln -s /usr/local/share/android-commandlinetools/system-images/android-36/google_apis_playstore/x86_64 \
        ~/Library/Android/sdk/system-images/android-36/google_apis_playstore/x86_64
  ```
- **AVD creation:** `avdmanager create avd -n Pixel7 -k "system-images;android-36;google_apis_playstore;x86_64" -d "pixel_7"`
- **Headless launch issue:** First launch used `-no-window` flag, producing no visible emulator window. Relaunched without the flag.
- **Hardware keyboard:** Mac keyboard input didn't work in the emulator. Fixed by setting `hw.keyboard=yes` in `~/.android/avd/Pixel7.avd/config.ini` (was `no` by default). Required emulator restart.

---

## Fix: Bottom Tab Bar on Android

**Brief:** Android showed a sidebar navigation instead of the bottom tab bar that iOS uses.

**Detailed:**
- **Symptom:** On the Android emulator, navigation items appeared as a sidebar on the left side of the screen, while iOS showed them as a bottom tab bar.
- **Root Cause:** In `src/App.tsx`, the layout conditional only checked `isIOS`:
  ```tsx
  const { isIOS } = usePlatform();
  // ...
  if (isIOS) {
    // bottom tab bar layout
  }
  // else: sidebar layout (web)
  ```
  Android fell through to the web/sidebar layout.
- **Fix:** Changed the condition to check `isNative` instead of `isIOS`, so both iOS and Android get the mobile tab bar layout:
  ```tsx
  const { isNative } = usePlatform();
  // ...
  if (isNative) {
    // bottom tab bar layout with MobileTabBar component
  }
  ```

### Files Modified:
- **`src/App.tsx`** — Changed `isIOS` to `isNative` in destructuring and conditional.

---

## Fix: Android Deep Link / OAuth Redirect

**Brief:** App stuck after Google OAuth login — couldn't return to the app.

**Detailed:**
- **Symptom:** Same issue as iOS v14 — after completing Google OAuth consent, the browser couldn't redirect back to the Co-Captain app. The app was stuck in the browser.
- **Root Cause:** The Android `AndroidManifest.xml` had no intent-filters for the custom URL schemes (`co-captain://` and `com.co-captain.app://`). iOS had these configured in `Info.plist` with `CFBundleURLSchemes`, but the Android manifest only had the default `LAUNCHER` intent-filter.
- **Fix:** Added two intent-filters to the `MainActivity` in `AndroidManifest.xml`:
  ```xml
  <intent-filter>
      <action android:name="android.intent.action.VIEW" />
      <category android:name="android.intent.category.DEFAULT" />
      <category android:name="android.intent.category.BROWSABLE" />
      <data android:scheme="com.co-captain.app" />
  </intent-filter>

  <intent-filter>
      <action android:name="android.intent.action.VIEW" />
      <category android:name="android.intent.category.DEFAULT" />
      <category android:name="android.intent.category.BROWSABLE" />
      <data android:scheme="co-captain" />
  </intent-filter>
  ```
  These match the two URL schemes registered on iOS. The OAuth callback redirects to `co-captain://` (defined as `NATIVE_SCHEME` in `src/integrations/googleCalendar.ts`), which now triggers `appUrlOpen` in `App.tsx`.

### Files Modified:
- **`android/app/src/main/AndroidManifest.xml`** — Added two `intent-filter` blocks for custom URL schemes.

---

## Documentation

- Created **`android/SETUP.md`** — Step-by-step guide for setting up Android development on a fresh Mac, covering Homebrew, JDK 21, Android Studio, SDK components, environment variables, emulator creation, build/sync, live reload, and troubleshooting.

---

## Summary of Issues & Fixes

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Gradle build fails with `invalid source release: 21` | JDK 17 installed, but Capacitor 8 needs JDK 21 | Install JDK 21 via Homebrew + symlink |
| Emulator can't find system image | `sdkmanager` uses different SDK root than `~/Library/Android/sdk` | Symlink system image directory |
| No emulator window visible | Launched with `-no-window` flag | Relaunch without the flag |
| Mac keyboard doesn't work in emulator | `hw.keyboard=no` in AVD config | Set `hw.keyboard=yes` in `config.ini` |
| Sidebar nav instead of bottom tabs on Android | Layout conditional only checked `isIOS` | Changed to `isNative` |
| OAuth redirect doesn't return to app | No intent-filters for custom URL schemes in AndroidManifest | Added intent-filters for `co-captain` and `com.co-captain.app` schemes |

---

## Key Technical Lessons

1. **Capacitor 8 requires JDK 21**, not JDK 17. The Android Gradle Plugin uses source level 21.
2. **Homebrew `sdkmanager` has its own SDK root** (`/usr/local/share/android-commandlinetools/`), separate from Android Studio's default (`~/Library/Android/sdk`). System images downloaded via CLI may not be found by the emulator without symlinking.
3. **`hw.keyboard=yes`** must be explicitly set in the AVD `config.ini` for Mac keyboard input to work in the emulator. It defaults to `no` when creating AVDs via `avdmanager`.
4. **Platform-specific layouts in Capacitor apps** should use `isNative` (not `isIOS`) when the behavior should be shared across all mobile platforms.
5. **Android requires explicit intent-filters** for custom URL schemes in `AndroidManifest.xml`. Unlike iOS where `CFBundleURLSchemes` in `Info.plist` handles this, Android needs `<intent-filter>` blocks with `VIEW` action, `BROWSABLE` category, and `<data android:scheme="..."/>`.
