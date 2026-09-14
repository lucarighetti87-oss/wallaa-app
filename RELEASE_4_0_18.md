# Wallaa 4.0.18 — App Store 1.0 build 19

Hotfix account/installation and verification flow.

## Fixes
- New Wallaa accounts are no longer tied one-to-one to the physical app installation.
- `wallaa_users.installation_id` is now legacy/nullable and no longer UNIQUE; active device sessions live in `wallaa_installations`.
- A single iPhone can log out and create/sign in to another Wallaa account without `wallaa_users_installation_id_key` conflicts.
- Existing legacy accounts remain compatible through the legacy authentication fallback.
- Repeating registration for an existing unverified email is recoverable: Wallaa resends verification instead of attempting a second account insert.
- If the account is created but SMTP delivery fails, the account remains pending and the app opens the verification screen with a resend action.
- Raw PostgreSQL duplicate/constraint errors are no longer returned to the registration UI.
- Production API defaults now use `https://api.wallaasafety.com`.

## Database migration
The backend performs the migration automatically during `initDb()`:

```sql
ALTER TABLE wallaa_users ALTER COLUMN installation_id DROP NOT NULL;
ALTER TABLE wallaa_users DROP CONSTRAINT IF EXISTS wallaa_users_installation_id_key;
CREATE INDEX IF NOT EXISTS idx_wallaa_users_installation_id
ON wallaa_users(installation_id) WHERE installation_id IS NOT NULL;
```

No manual SQL is required when deploying the complete 4.0.18 backend.

## Validation
- Automated frontend/static suite: 55/55 passing.
- Backend JavaScript syntax check: passing.
- Full Vite build could not be completed in the packaging environment because dependency installation timed out; run `npm install && npm run build` on the Mac before Xcode/TestFlight.
