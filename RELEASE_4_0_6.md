# Wallaa Personal Safety Ecosystem v4.0.6

## Guardian Alert Upgrade

- SOS activation remains completely silent on the protected person's iPhone. Haptics remain available for confirmation.
- QR-linked Wallaa guardians with **SOS Alerts** enabled receive an APNs alert with a dedicated `wallaa-guardian-siren.wav` sound.
- The guardian siren is a 10-second high-intensity emergency wail and is bundled as a native iOS resource.
- When Wallaa is already open, an incoming SOS also opens the Wallaa emergency overlay. The siren is stopped when the guardian acknowledges the alert.
- The alert includes a direct **Call person** action when the protected person's phone number is available.

## Emergency Email

- Rebuilt as an email-client-safe transactional layout using presentation tables and inline styles.
- Compact Wallaa logo and product header.
- Stronger hierarchy for protected person's name, latest location, safety word and emergency procedure.
- Direct actions for live location, calling the person and emergency services.
- Safety-word escalation protocol preserved and made more prominent.

## Network behavior

A Wallaa user connected through the personal QR is treated as a Wallaa guardian. If **SOS Alerts** is enabled and the guardian has registered an iOS push token, the backend sends the SOS directly to that guardian's iPhone. Live location is included only when **Live Location** permission is enabled.

## iOS limitation

The custom siren uses the normal APNs notification sound mechanism with a time-sensitive interruption level. iOS still controls final playback according to the recipient's notification permissions, device volume, Silent Mode and Focus settings. Bypassing those controls requires Apple's separate Critical Alerts entitlement and is not enabled in this release.
