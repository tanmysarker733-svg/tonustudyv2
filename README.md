<img width="1919" height="878" alt="Tonu Study" src="https://github.com/user-attachments/assets/1027c5ab-3905-4819-9a9a-ff2f2f46c63c" />

# Tonu Study

Tonu Study is made by a student for students in the SSC, HSC, and admission
phases, with a focus on online-class and syllabus progress tracking.

The deployed web app is the shared source of truth for browsers and the Android
client. Android source, native Google account sign-in setup, and release
instructions are documented in [ANDROID_SETUP.md](ANDROID_SETUP.md).

## Connectivity and low-end device support

- The web app caches its same-origin shell after the first successful online
  visit. Study data continues to save in browser storage while offline.
- Chat, authentication, cloud restore, and cloud upload are paused offline and
  resume after connectivity returns.
- Android v2.1.11 loads the deployed web app directly, so browser and APK use the
  same interface and receive the same feature updates. Without connectivity it
  shows a clear warning and offers pull-to-retry.
- **Look > Performance** keeps practical low-cost rendering by default, with
  optional Paradox Scroll, Subject Neon, and Extra Subject Glow controls.
