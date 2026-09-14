# Wallaa Personal Safety Ecosystem v4.0.7

## Critical safety fixes

- Native iOS CoreBluetooth background monitor for Wallaa Button when Wallaa is in another app or the iPhone is locked.
- Existing foreground BLE/BTHome parser remains unchanged and continues to handle the button while Wallaa is open.
- Native background SOS posts directly to the authenticated Wallaa API and remains silent on the protected person's iPhone.
- Core Bluetooth state restoration identifier added for system restoration where iOS permits it.
- Recent BTHome packet deduplication on the backend prevents a foreground/background transition from sending the same SOS twice.

## Wallaa Button gesture selection restored

My Button now exposes:

1. 1 click
2. 2 clicks
3. 3 clicks
4. Continuous press
5. Random clicks / any recognized gesture

The selected gesture is stored locally and is also used by the native background monitor.

## Immediate SOS feedback

After a valid SOS gesture is recognized, Wallaa immediately switches to the full-screen `Sending emergency alert` state while GPS, email and guardian push delivery are processed. The user no longer sees an apparently frozen screen while network/location work is happening.

## Background location resilience

Hardware SOS delivery is not blocked waiting indefinitely for GPS. Native iOS attempts to obtain a recent/current location for up to a short window; if unavailable, the backend still delivers the SOS and the live session can report that location is being acquired.

## iOS limitation

Background/locked operation is different from force-quitting the app from the iOS app switcher. iOS can suspend and reactivate a Bluetooth-capable app in normal background use, but a user force-quit can prevent Bluetooth relaunch. Do not market force-quit operation as guaranteed without completing the required Apple accessory setup path and device validation.

## Build

- App source: 4.0.7
- iOS Marketing Version: 4.0.7
- iOS Build: 8
