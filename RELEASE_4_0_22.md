# Wallaa 4.0.22 — session invalidation + safe button re-pairing

## Fixes
- If an account is deleted remotely from the Operating Console, a persisted app session is now invalidated automatically on launch, on return to foreground, or during periodic account validation.
- Remote account deletion clears the local profile, Guardians, paired Wallaa Button, active alert, native background configuration and cached session before the app returns to onboarding/login.
- The account is validated against the server before a previously paired hardware button is restored at startup. This prevents a deleted account from briefly re-arming stale hardware state.
- The physical button press used during pairing is recorded and suppressed from the SOS monitor for the repeated advertisement window, so pairing cannot immediately generate an SOS.
- HTTP API errors now retain the status code so `401` / invalid-session responses can be handled explicitly instead of being treated as generic offline errors.

## iOS build
- Marketing version: 4.0.22
- Build: 25
