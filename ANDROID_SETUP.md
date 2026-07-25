# Tonu Study Android

This repository now contains the first-party Android source for Tonu Study.
The app loads `https://tonustudy.vercel.app/`, so normal web deployments appear
in the Android app without rebuilding the APK. Native-only changes still need a
new APK.

## What changed from the old wrapper

- Native Android Credential Manager opens the phone's Google account picker.
- The returned Google ID token is exchanged by the existing Firebase web auth,
  keeping the same Firebase user and cloud data.
- Only HTTPS is allowed. The WebView bridge is usable only on
  `tonustudy.vercel.app`.
- Browser storage, cookies, file selection, pull-to-refresh, Android back
  navigation, external links, and a bundled offline app shell are supported.
- No legacy external-storage permission and no third-party wrapper branding or
  test-mode page.

## One-time Firebase / Google configuration

Native Google sign-in requires Android to recognize the app's package and
signing certificate.

1. Create or retain one permanent release keystore. Do not lose it.
2. In Firebase Console, open project `tonustudy`.
3. Add an Android app with package `app.tonustudy.vercel.app`.
4. Add both release and debug SHA-1/SHA-256 fingerprints.
5. Confirm Google is enabled under Authentication > Sign-in method.
6. Keep the Web OAuth client ID used in `app/build.gradle.kts`.

To print a keystore fingerprint:

```powershell
keytool -list -v -keystore .\tonu-study-release.jks -alias tonu-study
```

The old APK was signed by the previous wrapper service. Without that provider's
private key, Android will require users to uninstall the old APK once before
installing this first-party build. Future builds signed by the new permanent
key will update normally.

## Compatibility and installation

The project produces one universal APK (no ABI split or native-library
restriction) and supports Android 6.0 / API 23 and newer, including 32-bit
emulators. If BlueStacks reports only “Installation error,” the most common
cause is an installed APK with the same package but a different signature:

1. Export/backup any data from the old wrapper.
2. Uninstall the old Tonu Study app.
3. Install the new signed universal APK.
4. Keep using the same permanent keystore for every later release.

For an exact emulator error, run:

```powershell
adb install -r .\Tonu-Study-v2.1-universal.apk
```

An `INSTALL_FAILED_UPDATE_INCOMPATIBLE` result confirms a signing-key conflict,
not a 32-bit compatibility problem.

## Offline behavior

- The Android client tries the live HTTPS app first.
- Without validated internet, the same app shell is served from bundled assets.
- Local study edits remain available and save locally.
- Chat, Google sign-in, cloud upload, and cloud restore show a connection notice
  instead of discarding input or pretending a sync succeeded.

## GitHub Actions secrets

Add these repository Actions secrets:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Create the Base64 value on Windows:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes(".\tonu-study-release.jks")) |
  Set-Clipboard
```

Run the **Android APK** workflow. With signing secrets present, enabling
`publish_android_release` replaces the APK and AAB assets on the existing
`android` release.

## Local build

Install JDK 17 and Android SDK 36, then run:

```powershell
.\gradlew.bat assembleDebug
```

The debug APK is created under `app\build\outputs\apk\debug`.
