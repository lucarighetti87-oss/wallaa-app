# App Review Notes — Wallaa

Wallaa is a personal safety communication app. It does not provide or replace public emergency services and does not guarantee intervention by 112, police, medical services or Wallaa personnel.

## Suggested reviewer flow
1. Sign in using the review account supplied in App Store Connect.
2. Add a Guardian in Contacts.
3. Use the on-screen SOS control; no physical Wallaa Button is required to test the full alert workflow.
4. The sender phone remains silent. Guardians can receive push/email alerts subject to iOS notification settings.
5. Location sharing follows the account entitlement: Basic sends the initial SOS position; Pro test accounts may provide movement live tracking until “I’m Safe” is confirmed.
6. Account deletion is available in Settings → Privacy Center / Delete Account.

## Physical BLE accessory
Wallaa also supports a BLE Wallaa Button. The app uses CoreBluetooth background mode to listen for the configured gesture. A review video can be supplied demonstrating foreground, background and locked-screen operation with the real accessory.

## Wallaa Operating Center
Automatic forwarding to the Wallaa Operating Center safety inbox is a Wallaa Pro entitlement only. The inbox is not a public emergency response service and does not guarantee human monitoring or dispatch.

## Privacy
Privacy Policy, Terms and Privacy Choices are accessible in onboarding and Settings. Wallaa does not use personal-safety data for advertising tracking.
