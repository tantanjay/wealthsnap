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

## 3. Build Production Bundles (EAS)

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
