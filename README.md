<img width="1919" height="878" alt="Tonu Study" src="https://github.com/user-attachments/assets/1027c5ab-3905-4819-9a9a-ff2f2f46c63c" />

# Tonu Study

Tonu Study is made by a student for students in the SSC, HSC, and admission
phases, with a focus on online-class and syllabus progress tracking.

The deployed web app is the shared source of truth for browsers and the Android
client. Android source, native Google account sign-in setup, and release
instructions are documented in [ANDROID_SETUP.md](ANDROID_SETUP.md).

## Connectivity and low-end device support

- **Web 363** caches its same-origin shell after the first successful online
  visit. Study data continues to save in browser storage while offline.
- **Web 363** pauses chat, authentication, cloud restore, and cloud upload
  while offline and
  resume after connectivity returns.
- **Android v2.1.12** loads the deployed web app directly, so browser and APK use the
  same interface and receive the same feature updates. Without connectivity it
  shows a clear retry warning; pull-to-refresh is intentionally disabled so
  nested settings and composer scrolling cannot reload the page by accident.
- **Web 357 / Android v2.1.10** introduced the practical low-cost rendering
  defaults in **Look > Performance**, with
  optional Paradox Scroll, Subject Neon, and Extra Subject Glow controls.

## Version history

The deployed `index.html` is the public web source. Numbered
`hsc-study-os__*.html` files are retained only as local development snapshots
and are intentionally excluded from GitHub.

### Web builds

- **Web 367** — Normalized Smart Update motion to a calmer web-matched cadence
  and removed document pull-to-refresh competition. The Android host now gives
  the WebView sole ownership of vertical scrolling, so upward swipes inside
  Settings and Smart Update no longer surface a native refresh spinner.

- **Web 366** — Native Animation now selects the complete web motion profile
  inside Android: Smart Update restores its smooth step transitions and
  repositioning, while Paradox Scroll runs only when both Native Animation and
  Paradox Scroll are enabled. Turning Native Animation off retains the
  lightweight Android composer path for lower-power devices.

- **Web 365** — Disabled Android's parent refresh gesture so upward scrolling
  stays inside Settings and other nested shells. Smart Update now avoids
  redundant scroll restoration for fixed-value controls and drops Android-only
  glass repaint work inside the active wizard, keeping the existing visual
  hierarchy while reducing input lag.

- **Web 364** — Polished responsive edge cases: Settings tabs now reset to
  the top when switching sections, narrow-screen tab labels remain intact, and
  compact hero statistics no longer clip their text.
- **Web 363** — Compacted Smart Update task text: subject-specific science
  icons, implicit Detailed classes, `O-shot` / `Adv.` / `Adm.` labels, and
  `Lec` lecture notation. Legacy `Lecture`, `Lec`, and class labels remain
  readable by Smart Sync.

- **Web 362** — Added Native Animation controls for mobile/Android parity,
  reliable modal scroll locking, responsive tablet quick-tool labels, smoother
  sliders/font scaling/theme changes, and a GitHub-aware install/update flow.
- **Web 361** — Consolidated the shared mobile and Android interface while
  preserving the lightweight rendering defaults.
- **Web 360** — Added a responsive install hub with separate web-shortcut and
  official Android APK actions; the banner install control is hidden inside the
  Android wrapper.

- **Web 359** — Fixed narrow-screen quick-action label clipping, refreshed the
  service-worker cache to prevent stale UI, and made subject Settings controls
  safer.
- **Web 358** — Optimized the shared browser/Android shell and reduced costly
  rendering work.
- **Web 357** — Improved rendering performance and tuned subject-neon effects.
- **Web 356** — Repaired damaged text encoding and corrected icon assets.
- **Web 355** — Preserved the Web 354 banner-reliability and Android visual
  alignment work as the next validated snapshot.
- **Web 354** — Improved project-banner reliability and aligned Android visual
  behavior with the web interface.

### Android releases

- **Android v2.1.12 (current)** — Removed the native `SwipeRefreshLayout`
  wrapper and Android overscroll so nested upward scrolling stays reliable;
  also removes the now-unused refresh dependency.
- **Android v2.1.11** — Optimized the shared WebView shell, hardened
  native Back navigation, and loads the latest deployed web build.
- **Android v2.1.10** — Fixed Settings re-render locks, restored Android subject
  neon, improved banner reliability, repaired text/icon rendering, and reduced
  expensive visual effects.
- **Android v2.1.9** — Corrected splash-screen sizing and added stable mobile
  display profiles.
- **Android v2.1.8** — Fixed the native Google sign-in bridge and added Android
  visual-quality controls.
- **Android v2.1.7** — Changed the APK to a live deployed-web wrapper so web
  feature updates reach Android without bundling duplicate HTML.
- **Android v2.1.6** — Added Firebase services configuration for native Google
  sign-in.
- **Android v2.1.5** — Fixed Settings modal interaction and scrolling inside
  the Android WebView.
- **Android v2.1.4** — Made the Android shell refresh from production and added
  the project workflow handoff.
- **Android v2.1.3** — Fixed native navigation and Settings viewport behavior.
- **Android v2.1.2** — Automated offline web-shell synchronization.
- **Android v2.1.1** — Synchronized the web shell/offline source and kept login
  copy readable across themes.
- **Android v2.1.0** — Added offline support, universal APK packaging, and
  release backup rules.
- **Android v2.0.0** — Introduced the first first-party Tonu Study Android
  client.
