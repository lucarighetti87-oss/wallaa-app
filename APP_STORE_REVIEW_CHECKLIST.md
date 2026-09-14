# Wallaa v4.0.12 — App Store Review checklist

## Before upload
- [ ] Privacy Policy published at the exact production URL used by the app.
- [ ] Terms & Conditions published at the exact production URL used by the app.
- [ ] Privacy Choices page published.
- [ ] Full THREER GROUP SRL legal details inserted; no placeholders remain.
- [ ] App Privacy labels completed from APP_PRIVACY_DATA_MAP.md.
- [ ] Reviewer demo account created and tested.
- [ ] Reviewer can test SOS without owning the physical Wallaa Button.
- [ ] Review Notes explain BLE/background behavior and that Wallaa is not a replacement for 112.
- [ ] TestFlight internal regression completed on a real iPhone: foreground, background, locked screen.
- [ ] Verify profile edit lock, 30-day activity behavior, map, QR, push, email, account deletion.

## Basic / Pro
- Wallaa Basic: up to 2 personal SOS contacts; initial SOS location only; no Wallaa Operating Center forwarding.
- Wallaa Pro backend entitlement exists for testing: up to 5 contacts, Operating Center forwarding, movement live tracking.
- No paid Pro subscription is sold in this build. Do not describe Pro as purchasable in App Store metadata until Apple In-App Purchase is implemented.
- SMS SOS is intentionally not exposed in the UI until implementation is complete.

## Map / privacy
- The in-app map uses OpenStreetMap tiles with visible attribution.
- Privacy Policy must mention the map tile provider before submission.

## App completeness
- No dead buttons, placeholder purchase flows or inaccessible advertised features.
- Delete Account works in-app.
- Privacy/Terms links open successfully.
- Version/build shown in Xcode: 4.0.12 / 13.
