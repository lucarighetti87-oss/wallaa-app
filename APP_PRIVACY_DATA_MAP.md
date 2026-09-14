# Wallaa — App Privacy data map (v4.0.12)

Use this as the engineering basis for App Store Connect. Final legal validation remains required.

## Data linked to the user / App Functionality
- Name
- Email Address
- Phone Number
- Precise Location (when SOS location is enabled; Basic sends initial SOS location, Pro may stream updates during an active alert)
- User ID / Wallaa account identifiers
- Device ID / Wallaa installation and paired-button identifiers
- Contacts / Safety Network relationships and permissions
- Push notification token
- Alert metadata and device telemetry needed to operate the service

## Not used for tracking
Wallaa does not use these data for advertising tracking or cross-app profiling.

## Retention defaults
- Alert/activity metadata: 30 days
- Live location history: 30 days
- Device heartbeat history: 30 days
- Account/profile data: while the account remains active, unless legal retention is required

## Third-party processing
- Apple Push Notification service: delivery of iOS push notifications
- Production hosting/database provider: backend and PostgreSQL
- Production SMTP/email provider: alert email delivery
- OpenStreetMap tile service: in-app map tiles. Wallaa does not send Wallaa account identity to OpenStreetMap; normal HTTPS requests may expose IP address and requested tile area to the tile provider.

## Wallaa Operating Center
Only Wallaa Pro accounts are eligible for automatic forwarding of real SOS emails to the Wallaa Operating Center safety inbox. It is not a public emergency service and does not guarantee human intervention.

## Account deletion
Available directly inside Settings / Privacy Center. Server-side user-linked records are deleted through database cascades unless retention is legally required.
