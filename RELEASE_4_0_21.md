# Wallaa 4.0.21

Hotfix production/TestFlight API configuration.

- Adds the real `.env.production` used by Vite production builds.
- Production API base: `https://api.wallaasafety.com`.
- Prevents Release/TestFlight from falling back to the local development server `http://localhost:8787`, which caused `Load Failed` on login.
- iOS marketing version set to 4.0.21, build 24.
