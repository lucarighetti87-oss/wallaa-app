# Update to v4.0.7

1. Deploy `Wallaa_Backend_v4_0_7_GitHub_ROOT` to the existing GitHub repository and wait for Render to become Live.
2. Use the v4.0.7 app folder. Copy/create `.env.production` as in the previous build.
3. Run:

```bash
npm install
npm run build
npm run cap:sync
npm run ios:open
```

4. In Xcode use Product → Clean Build Folder, select the real iPhone, then Run.
5. Test in this order:
   - My Button → select 1 click and verify foreground SOS.
   - Put Wallaa in background by opening another app; press the selected button gesture.
   - Lock the iPhone; press the selected button gesture.
   - Verify guardian push/email delivery and that the protected phone stays silent.
   - Return to Wallaa and verify the Active Alert session is restored.

Do not test background behavior by swiping Wallaa away from the app switcher; that is a separate iOS force-quit state.
