# Update to v4.0.9

No backend deployment is required for this build.

1. Create `.env.production` from `.env.production.example` (or copy the working file from the previous app build).
2. Run `npm install`.
3. Run `npm run build`.
4. Run `npm run cap:sync`.
5. Run `npm run ios:open`.
6. In Xcode use **Product > Clean Build Folder**, select the real iPhone and Run.

Expected Xcode version: **4.0.9 (10)**.

Validation: Home remains green/ready while the event-only button is silent; pressing the button briefly shows Signal verified and then returns to Standby. Auto appearance follows iOS.
