# Expo Build & Command Guide

## 1. Start with Cache Clear
Use this command to start the development server with a clean cache. This is useful for resolving unexpected internal errors or stale dependency issues.

```bash
npx expo start -c
```

---

## 2. Prebuild for Android
This command generates the native Android directories (`android/`). It is necessary if you need to make changes to native configurations or standard gradle files.

**Standard Prebuild:**
```bash
npx expo prebuild --platform android
```

**Clean Prebuild (Recommended):**
This removes the existing `android` folder before regenerating it, ensuring a fresh state.
```bash
npx expo prebuild --platform android --clean
```

---

## 3. Local Development (Native Modules)
When using libraries that require native code (like ML Kit, fast-storage, etc.), you cannot use the standard Expo Go app. You must build a **Development Client**.

**Build & Run on Emulator/Device:**
This builds the native app and installs it on your connected device/emulator. Run this whenever you add new native packages.
```bash
npx expo run:android
// or
npx expo run:android --variant release
```

**Build & Run on Physical Device:**
To install the development build on a real Android device connected via USB:
```bash
npx expo run:android --device
```

**Start Dev Client Server:**
If the custom development app is already installed on your device, you don't need to rebuild. Just start the Metro server and open the app on your device.
```bash
npx expo start --dev-client
```

---

## 4. Build Production Bundles (EAS)

These commands use EAS Build to generate your application binaries.

### Build Android APK (Installable File)
Use this to generate a `.apk` file that you can install directly on a device or share with testers.
*Note: Uses the `apk` profile defined in your `eas.json`.*

```bash
eas build --platform android --profile apk
```

### Build Android Bundle (AAB for Play Store)
Use this to generate an `.aab` (Android App Bundle) for submitting to the Google Play Store.
*Note: Uses the `production` profile.*

```bash
eas build --platform android --profile production
```

### Check Build Status
To see the status of your builds or download artifacts later:

```bash
eas build:list
```

### EAS memory limits
The `preview`, `production` and `apk` profiles set `GRADLE_OPTS` in `eas.json` to turn off Gradle's parallel mode and allow at most 2 tasks at once. Without the cap, free-tier workers ran out of memory while R8 overlapped the native builds ("Gradle build daemon disappeared unexpectedly"). EAS's own `GRADLE_OPTS` overrides `gradle.properties`, so this is the only place the cap takes effect. Setting it also drops EAS's default heap, so `plugins/withGradleMemoryLimits.js` sets Gradle's heap to 3 GB instead.

---

## 4b. Build a Signed AAB Locally
Use this when an EAS build fails or you have no EAS builds left. It produces the same Play Store AAB on your own machine.

**1. Get the upload keystore.** Run `eas credentials -p android` and choose **credentials.json → Download credentials from EAS to credentials.json**. You get `credentials.json` (keystore password, key alias and key password in plain text) and `credentials/android/keystore.jks`. Keep both out of git and somewhere safe; EAS keeps the originals.

**2. Build:**
```bash
npm run build:aab -- --credentials=path/to/credentials.json
```
Or pass the four values yourself:
```bash
npm run build:aab -- --store-file=path/to/keystore.jks --store-password=STORE_PASSWORD --key-alias=KEY_ALIAS --key-password=KEY_PASSWORD
```

The script (`scripts/build-aab.js`):
- runs a clean prebuild with the `production` update channel baked in (`--channel=...` to change it), which `eas build` normally adds itself; without it the build never receives `eas update --channel production`. It restores `app.json` afterwards.
- removes the EAS memory limits from the generated `android/gradle.properties` (parallel mode on, 4 GB heap).
- runs `gradlew bundleRelease`, signed with your keystore, and prints the signer's SHA-1 to compare with the upload key certificate in Play Console → Protected with Play → app signing (Play also rejects a wrong key on upload). It stops if the AAB came out debug-signed.

The AAB lands at `android/app/build/outputs/bundle/release/app-release.aab`. Upload it in Play Console. `--prepare-only` stops after the prebuild and Gradle edits, without building.

Run it from a short path such as `D:\Projects\TOOLS\wealthsnap`, not from a deep worktree folder, or native builds hit the Windows path limit. Passing passwords as arguments leaves them in your shell history; `--credentials` avoids that.

## 5. EAS Update
Use this to push updates to your application without requiring a full rebuild or submission to the Play Store.

### Configure EAS Update
Run this command to configure your Expo project to use EAS Update.

```bash
eas update:configure
```

### Push an Update

```bash
eas update --channel production --message "Testing bytecode diffs"
```

---

## 6. Automated Version Bumping
Run this command to automatically increment the version in `package.json`, `app.json`, and the Android `versionCode` before building.

```bash
npm run bump-version -- [major|minor|patch]
# Example: npm run bump-version -- patch
```

---

## 7. Android Emulator
Commands to manage and launch Android emulators.

**List Available AVDs:**
```bash
emulator -list-avds
```

**Launch a Specific Emulator:**
```bash
emulator -avd Medium_Phone_API_36.1
```

**Launch the Small Phone Emulator (Cold Boot):**
Use this to check layouts on a narrow screen. `-no-snapshot-load` skips the saved snapshot and cold boots, which also fixes an emulator stuck "offline" in `adb devices`.
```bash
emulator -avd Small_Phone -no-snapshot-load
```
