# Testing Wallaa Pro during beta

The app cannot grant itself Pro. Entitlement is server-side.

For a controlled beta account, run in PostgreSQL:

```sql
UPDATE wallaa_users
SET subscription_tier='pro', updated_at=NOW()
WHERE LOWER(email)=LOWER('YOUR_TEST_EMAIL');
```

Then sign out and sign in again.

Restore Basic with:

```sql
UPDATE wallaa_users
SET subscription_tier='basic', updated_at=NOW()
WHERE LOWER(email)=LOWER('YOUR_TEST_EMAIL');
```
