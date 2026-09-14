# Wallaa v4.0.14 — App Store launch crash fix

Development package version: **4.0.14**  
iOS App Store version: **1.0**  
Build: **15**

## Critical fix

- Fixes the immediate launch crash seen in TestFlight build 14.
- `ITSAppUsesNonExemptEncryption` is now guaranteed to exist only at the top level of `Info.plist`.
- Removes any accidental nested copies from `UIApplicationSceneManifest` / `UISceneConfigurations`.
- Preserves the UIKit scene lifecycle dictionary/array types expected by iOS.
- Sets the home-screen display name to **WALLAA**.
- Keeps the v4.0.13 animated startup and six-language i18n work.

## App Store

Archive/upload this package as **Version 1.0, Build 15**. Do not submit build 14 for review.
