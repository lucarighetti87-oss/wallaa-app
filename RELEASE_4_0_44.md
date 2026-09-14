# Wallaa 4.0.44 — Permanent Button Ownership

## Scope
This release adds account-bound ownership for a physical Wallaa Button without changing the SOS, Guardian, live-location or background BLE flows introduced in 4.0.43.

## Device ownership
- First successful pairing claims the Button on the authenticated Wallaa account.
- A claimed Button cannot be paired by another account.
- Signing out, reinstalling the app, changing SIM or changing iPhone does not release ownership.
- The same account may pair the same Button again on a new iPhone.
- The app exposes no user action to release, transfer or reset the Button owner.
- Existing 4.0.43 local pairings are migrated automatically when the app observes the Button's stable advertised serial.

## Hardware identity
The app requires a stable advertised hardware identity (for example the K11-style unique device-name suffix). iOS `CBPeripheral.identifier` is retained only as the current-phone transport identifier and is not used as the permanent owner key.

## Security
The backend issues a random claim token when ownership is established. Hardware SOS and device heartbeat requests from 4.0.44 carry the permanent hardware id + claim token. Administrative reassignment rotates the token.

## User copy
Before pairing:
> Questo Wallaa Button verrà associato in modo permanente al tuo account. Una volta completata l’associazione, non potrà essere utilizzato con un altro account.

After pairing:
> Wallaa Button registrato. Questo dispositivo appartiene ora al tuo account.

Conflict:
> Questo Wallaa Button è già registrato e non può essere associato a questo account.

## iOS
- Marketing version: 4.0.44
- Build: 47
