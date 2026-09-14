# Build Wallaa v4.0.12 on Mac

```bash
cd /Users/luca/Downloads/Wallaa_Personal_Safety_Ecosystem_v4_0_12_READY
cp .env.production.example .env.production
npm install
npm test
npm run build
npm run cap:sync
npm run ios:open
```

In Xcode:
1. Select the Wallaa target.
2. Confirm Team `THREER GROUP SRL` and Bundle ID `it.wallaa.safebutton`.
3. Product → Clean Build Folder.
4. Select a real iPhone and Run.

Expected: Version 4.0.12 / Build 13.
