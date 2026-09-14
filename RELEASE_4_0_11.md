# Wallaa 4.0.11 — App Store Privacy & Review Readiness

- Privacy Center added in-app.
- Registration now separately acknowledges Privacy notice, Terms and the SOS data-sharing notice.
- Legal notice versions are sent to/recorded by backend for new registrations.
- iOS PrivacyInfo.xcprivacy added, including UserDefaults required-reason declaration CA92.1 and collected-data categories.
- No advertising tracking declared.
- Production retention controls added to backend (defaults: live location 30 days, heartbeats 30 days, alert metadata 365 days).
- Guardian notification lifecycle improved: acknowledgement clears delivered notifications; `wallaa_safe` closes stale alert UI.
- App Store privacy map, review notes and checklist updated.
- Legal-site drafts included for final legal review and publication.
- Version 4.0.11 / iOS build 12.
