# Wallaa — App Privacy data map (App Store preparation, 2026-10-11)

Use this as the engineering basis for App Store Connect. Final legal validation remains required.

## Data linked to the user / App Functionality
- Name
- Email Address
- Phone Number
- Precise Location: SOS, private location snapshots, enabled Sentinel availability and opted-in Wallaa network sightings. Guardian visibility is restricted to authorized active SOS access; this is different from service-side collection.
- User ID / Wallaa account identifiers
- Device ID / Wallaa installation and paired-button identifiers
- Contacts / Safety Network relationships and permissions
- Push notification token
- Alert metadata and device telemetry needed to operate the service
- Emails or Text Messages: private user chats and operational SOS chats
- Photos or Videos: Sentinel identity documents/selfies uploaded for verification
- Other User Content: Sentinel application information and chat abuse reports
- Health/Fitness: wellbeing confirmations and derived movement/activity used by Health Check; raw iPhone sensor samples stay on the phone

All listed categories support App Functionality and are linked to the account. No advertising tracking purpose is declared. The manifest now includes message, photo and other user content categories; App Store Connect labels must be aligned separately.

## Not used for tracking
Wallaa does not use these data for advertising tracking or cross-app profiling.

## Retention defaults
- Alert/activity metadata: 30 days
- Live location history: 30 days
- Device heartbeat history: 30 days
- Account/profile data: while the account remains active, unless legal retention is required
- Chat reports: currently retained until account deletion; message references become null if the conversation is deleted. Do not claim that every data category is automatically removed after 30 days.

## Third-party processing
- Apple Push Notification service: delivery of iOS push notifications
- Production hosting/database provider: backend and PostgreSQL
- Production SMTP/email provider: alert email delivery
- OpenStreetMap tile service: in-app map tiles. Wallaa does not send Wallaa account identity to OpenStreetMap; normal HTTPS requests may expose IP address and requested tile area to the tile provider.

## Wallaa Operating Center
Only Wallaa Pro accounts are eligible for automatic forwarding of real SOS emails to the Wallaa Operating Center safety inbox. It is not a public emergency service and does not guarantee human intervention.

## Account deletion
Available directly inside Settings / Privacy Center. Server-side user-linked records are deleted through database cascades unless retention is legally required.
