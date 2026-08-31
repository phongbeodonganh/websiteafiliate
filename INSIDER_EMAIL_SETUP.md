# AIDEALSUK Insider email setup

## Production requirements

1. Verify `aidealsuk.com` in the Resend dashboard.
2. Add the Insider variables documented in `DEPLOY.md` to the production `.env.local`.
3. Generate separate production secrets:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

Use one output for `INSIDER_TOKEN_SECRET` and the other for `INSIDER_CRON_SECRET`.

## Daily schedule

The digest endpoint is:

```text
POST /api/v1/cron/insider-digest
Authorization: Bearer <INSIDER_CRON_SECRET>
```

It sends the summary for the GMT+12 calendar day that just ended. Since midnight GMT+12 is 12:00 UTC, install this crontab on the production VPS:

```cron
CRON_TZ=UTC
0 12 * * * curl -fsS -X POST -H "Authorization: Bearer <INSIDER_CRON_SECRET>" https://aidealsuk.com/api/v1/cron/insider-digest | logger -t aidealsuk-insider
```

Check cron output with:

```bash
journalctl -t aidealsuk-insider
```

The application sends through Resend's batch API in groups of 100 recipients. A per-day marker on each subscriber and a Resend idempotency key prevent ordinary cron retries from sending duplicate digests.
