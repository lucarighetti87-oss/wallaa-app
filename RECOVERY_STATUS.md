# Wallaa App recovery status — 4.0.66 build 69

Recovered on 2026-09-14.

## Ground truth used
- Complete source: Wallaa 4.0.49.
- Compiled app snapshots: v4.0.57 and v4.0.64.
- Retained cumulative/hotfix packages: v4.0.59–v4.0.65, including the v4.0.62 cumulative repair.

## Reconstructed missing layer (v4.0.50–v4.0.57)
The original JSX/source for these versions was not retained. The missing layer was reconstructed from the actual v4.0.57 compiled bundle and includes:
- Sentinel API client and Sentinel screen;
- Sentinel push offers;
- Sentinel navigation/home entry;
- nearby Sentinel map integration;
- Notification Center API helpers needed by v4.0.59;
- Sentinel assets/styles recovered from the compiled v4.0.57 app.

## Retained patches applied unchanged
- v4.0.58 prerequisite repair from cumulative v4.0.61;
- v4.0.59 notification persistence / Sentinel privacy;
- v4.0.60 Basic/Standard Sentinel role access;
- v4.0.61 Sentinel map visibility;
- v4.0.62 Guardian SOS real-map + authorized location snapshot;
- v4.0.63 Sentinel foreground heartbeat;
- v4.0.64 SOS OSM layout correction;
- v4.0.65 reliable foreground Sentinel heartbeat.

## Validation completed in recovery environment
- 50 JavaScript/JSX source files parsed successfully with Babel parser: 0 syntax errors.
- package.json version: 4.0.65.
- iOS MARKETING_VERSION: 4.0.65.
- iOS CURRENT_PROJECT_VERSION: 68.
- Patch markers through v4.0.65 are present.

## Important validation still required on Luca's Mac
The retained node_modules are macOS ARM binaries, while the recovery environment is Linux. Therefore the final Vite/Xcode compilation must be performed on the Mac using a fresh `npm install`.

This is a maintainable recovered source tree, but the missing v4.0.50–v4.0.57 original JSX cannot be made byte-identical because those original source files were not preserved. Functional behavior was reconstructed from the compiled v4.0.57 artifact.

## v4.0.66 follow-up
- Removed stale Pro-only SideMenu gate for Sentinel.
- Sentinel role/network entry is now visible to Basic/Standard and Pro users; backend retains Pro-only SOS dispatch.
