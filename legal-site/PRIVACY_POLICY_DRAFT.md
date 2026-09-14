# WALLAA — Privacy Policy (production draft)

**Version:** 7 September 2026

> IMPORTANT BEFORE PUBLICATION: add the complete registered office, VAT/company registration details and a final legal review for THREER GROUP SRL. Do not publish with placeholders.

## Data controller
THREER GROUP SRL — [REGISTERED OFFICE TO INSERT] — contact: info@wallaa.it.

## What Wallaa processes
Wallaa processes account data (name, email, phone), Wallaa account and installation identifiers, Wallaa Button identifiers and BLE telemetry, guardian/safety-network relationships and permissions, APNs push tokens, SOS metadata, and precise location during active safety features.

The safety word is stored on the user's device and is transmitted only when a real SOS is sent so the guardian alert can be constructed. Wallaa does not persist the safety word in its alert database tables.

## Purposes
Data is processed to create and authenticate the account, pair and monitor the Wallaa Button, deliver SOS alerts, share live location with authorized guardians, deliver push/email alerts, operate the Wallaa Safety Network, prevent duplicate or fraudulent alerts, and provide account deletion and support. Wallaa does not use safety data for targeted advertising or cross-app tracking.

## Recipients and processors
Authorized guardians receive only information allowed by their permissions. For Wallaa Pro accounts, real SOS alerts may also be copied to the Wallaa Operating Center safety inbox. Wallaa Basic does not forward alerts to that inbox. Wallaa Operating Center is not a public emergency service, does not replace 112, and does not guarantee human intervention. Hosting/database, SMTP/email and Apple Push Notification service providers process data only as needed to provide the service. List the exact production providers and contractual roles before publication.

## Location
Precise location is used when the user enables SOS location or requests location features, subject to iOS permission. Wallaa Basic sends the initial SOS position only. Wallaa Pro may continue sharing position updates while an active alert is open until the user marks themselves safe. Background location is used only for an active Pro live-tracking safety session. The in-app map uses OpenStreetMap map tiles; Wallaa does not send the Wallaa account identity to the map provider, but the map provider may receive the device IP address and requested map tile area as part of normal HTTPS delivery.

## Retention
Production defaults: live location history 30 days; device heartbeat records 30 days; alert metadata and activity history 30 days. Account data is retained while the account is active. Account deletion removes account-associated server records unless retention is legally required. These periods must match production environment settings.

## Rights and choices
Users can access Privacy and Terms inside the app, sign out, control guardian permissions, control iOS permissions in Settings, and initiate account deletion directly in Wallaa. Requests can be sent to info@wallaa.it. Add all GDPR rights and the competent supervisory-authority information after legal review.

## Security
Passwords are stored as salted hashes; installation sessions use per-installation authentication tokens; transport uses HTTPS; access to live alert links is tokenized and revoked when the alert is closed.

## Children
[DEFINE MINIMUM AGE / CHILD POLICY BEFORE PUBLICATION.]

## Changes
Material changes are versioned. Wallaa can require users to review updated notices where appropriate.
