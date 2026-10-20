# Build 143

The map now attaches its size observer when GPS becomes available after the initial placeholder. Previously the nearby feed and coverage meter could update while all Sentinel markers remained absent because the measured viewport stayed at zero. A WebKit regression test reproduces the failure before the fix and passes afterwards. Existing direction, stale-reference and meter tests pass.

The safety word uses a local editing draft and an explicit Save action. Typing no longer calls profile persistence, Health Check context updates or native configuration on every keystroke. Previously the controlled field waited for the asynchronous Health Check request before its value updated. Draft retention and retry after a failed save are covered with a deliberately blocked save in WebKit. The existing profile persistence and Health Check update flow remains in use on confirmation.

Validation: 86 unit tests, six targeted WebKit tests, production build and native sync passed. No real SOS or notification was sent. Backend unchanged. This fixes a reproducible map rendering path; the two physical accounts in the screenshots have not been inspected directly.
