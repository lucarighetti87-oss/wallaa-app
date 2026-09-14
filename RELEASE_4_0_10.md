# Wallaa Personal Safety Ecosystem v4.0.10

Build iOS: 11

## Changes
- Adds Wallaa Operating Center as a permanent system recipient for real SOS emails (`safety@wallaasafety.com`).
- The system recipient is shown in Emergency Contacts but is separate from personal Guardian counts and cannot be edited or deleted.
- When no personal Guardian exists, real SOS is not blocked: the app shows a clear warning and the server still emails Wallaa Operating Center.
- Manual SOS test with no Guardian returns a friendly `NO_GUARDIANS` message instead of an APNs technical error.
- Invalid APNs tokens such as `BadDeviceToken` are automatically disabled so users do not see repeated raw Apple errors.
- Existing v4.0.9 event-only Button behavior, background BLE and live tracking remain unchanged.

Important: Wallaa Operating Center email delivery is not, by itself, a guarantee of human monitoring or emergency-service intervention. This must match the actual operating model and Privacy Policy.
