# Android Development Setup (macOS)

Complete guide to set up Android development for Co-Captain on a fresh Mac.

## Prerequisites

- macOS (Apple Silicon or Intel)
- Node.js v18+ and npm installed
- Project dependencies installed (`npm install`)

## Step 1: Install Homebrew (if not installed)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

## Step 2: Install Java (JDK 21)

Capacitor 8 requires JDK 21 (source level 21).

```bash
brew install openjdk@21
```

Symlink so macOS can find it:

```bash
sudo ln -sfn /usr/local/opt/openjdk@21/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-21.jdk
```

Add to your shell profile (`~/.zshrc`):

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21 2>/dev/null || echo "/usr/local/opt/openjdk@21")
export PATH="$JAVA_HOME/bin:$PATH"
```

Then reload:

```bash
source ~/.zshrc
```

Verify:

```bash
java -version
# Should show openjdk 21.x.x
```

## Step 3: Install Android Studio

Download and install from: https://developer.android.com/studio

Or via Homebrew:

```bash
brew install --cask android-studio
```

Open Android Studio and complete the initial setup wizard — it will download the default Android SDK.

## Step 4: Install Android SDK Components

Open Android Studio, then go to **Settings > Languages & Frameworks > Android SDK**.

Under the **SDK Platforms** tab, check:

- **Android 16 (API 36)** — this project targets SDK 36

Under the **SDK Tools** tab, check:

- Android SDK Build-Tools
- Android SDK Command-line Tools
- Android SDK Platform-Tools
- Android Emulator

Click **Apply** to install.

## Step 5: Set Environment Variables

Add to your `~/.zshrc`:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$ANDROID_HOME/platform-tools:$PATH
export PATH=$ANDROID_HOME/tools:$PATH
export PATH=$ANDROID_HOME/tools/bin:$PATH
export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$PATH
export PATH=$ANDROID_HOME/emulator:$PATH
```

Reload:

```bash
source ~/.zshrc
```

Verify:

```bash
adb --version
```

## Step 6: Create an Android Emulator

In Android Studio: **Tools > Device Manager > Create Virtual Device**

1. Pick a device (e.g. Pixel 7)
2. Select a system image (API 36 recommended, download if needed)
3. Finish and launch the emulator to verify it boots

Alternatively via CLI:

```bash
# List available system images
sdkmanager --list | grep system-images

# Install a system image
sdkmanager "system-images;android-36;google_apis;arm64-v8a"

# Create the emulator
avdmanager create avd -n Pixel7 -k "system-images;android-36;google_apis;arm64-v8a" -d "pixel_7"

# Launch it
emulator -avd Pixel7
```

## Step 7: Build and Sync the Web App

From the project root:

```bash
# Build the web assets
npm run build

# Sync web assets + plugins into the android project
npx cap sync android
```

## Step 8: Run on Emulator or Device

**Option A — Open in Android Studio:**

```bash
npx cap open android
```

Then click the **Run** button (green play icon) in Android Studio.

**Option B — Run directly from CLI:**

```bash
npx cap run android
```

This will prompt you to select a connected device or running emulator.

## Step 9: Live Reload (Development)

For faster development with live reload:

1. Find your local IP:

```bash
ipconfig getifaddr en0
```

2. Start the dev server on your network:

```bash
npm run dev -- --host
```

3. Temporarily update `capacitor.config.ts` to point to your dev server:

```ts
const config: CapacitorConfig = {
  appId: 'com.co-captain.app',
  appName: 'Co-Captain',
  webDir: 'dist',
  server: {
    url: 'http://YOUR_LOCAL_IP:5173',
    cleartext: true,
  },
};
```

4. Sync and run:

```bash
npx cap sync android
npx cap run android
```

> **Remember** to remove the `server` block from `capacitor.config.ts` before committing or building for production.

## Troubleshooting

### `JAVA_HOME` not set or wrong version

```bash
/usr/libexec/java_home -V
```

Lists all installed JDKs. Make sure JDK 21 is installed and `JAVA_HOME` points to it.

### `app/src/main/assets` directory missing

This means web assets haven't been synced. Run:

```bash
npm run build && npx cap sync android
```

### Emulator won't start on Apple Silicon

Make sure you downloaded an **arm64-v8a** system image, not x86_64.

### Gradle build fails

Try invalidating caches in Android Studio: **File > Invalidate Caches > Invalidate and Restart**.

Or clean from CLI:

```bash
cd android && ./gradlew clean && cd ..
npx cap sync android
```

### `cap doctor` shows errors

Run this to diagnose:

```bash
npx cap doctor
```

It will tell you exactly what's missing or misconfigured.
