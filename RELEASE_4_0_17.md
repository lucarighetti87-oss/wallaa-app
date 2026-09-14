# WALLAA 4.0.17 — Registration verification

App Store version: **1.0**  
Build: **18**

## Changes
- Fixes the registration logo distortion introduced by the v4.0.16 centering rule.
- Adds password confirmation during account creation.
- New accounts require email verification before first login.
- Sends a 24-hour single-use verification link by email.
- Adds resend-verification flow from the registration screen.
- Existing accounts remain usable without retroactive verification lockout.
- Verification email uses the configured Wallaa SMTP sender (`safety@wallaasafety.com`).

## Deployment dependency
Deploy the matching backend before testing registration. Ensure SMTP is configured and `PUBLIC_BASE_URL` points to the public HTTPS backend URL.
