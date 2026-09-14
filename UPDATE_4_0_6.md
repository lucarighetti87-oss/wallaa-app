# Update to v4.0.6

This release requires both the iPhone app update and the matching backend update because APNs now references the custom guardian siren and includes the protected person's phone number in the SOS payload.

1. Upload the files from `Wallaa_Backend_v4_0_6_GitHub_ROOT.zip` to the existing `wallaa-safe-button-api` repository root and wait for Render to become Live.
2. Copy your existing `.env.production` into the v4.0.6 app folder.
3. Run `npm install`, `npm run build`, `npm run cap:sync`, `npm run ios:open`.
4. In Xcode use **Product → Clean Build Folder**, select the real iPhone and Run.
5. Test with two Wallaa accounts connected via QR. On the protected phone the SOS must remain silent. On the guardian phone the incoming SOS must show a notification and use the Wallaa guardian siren when iOS permits notification sound playback.
