# Wallaa Safe Button — backend online + TestFlight

1. Deploy the `server/` folder to a paid Render Web Service.
2. Configure SMTP credentials only as Render environment variables/secrets.
3. Confirm `https://YOUR-SERVICE.onrender.com/health` returns `ok:true` and `smtpConfigured:true`.
4. In the app root create/update `.env.production`:

```
VITE_ALERT_API_URL=https://YOUR-SERVICE.onrender.com/api/alert
VITE_DEMO_MODE=false
```

5. Build and sync iOS:

```
npm install
npm run build
npx cap sync ios
npm run ios:open
```

6. In Xcode increase Build number (e.g. 2 -> 3), then Product > Archive > Distribute App > App Store Connect > Upload.

7. Install the new TestFlight build and test TEST SOS using a real contact email.
