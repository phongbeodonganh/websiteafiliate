# TheHavenDeals Insider email setup

## Production requirements

1. Verify `aidealsuk.com` in the Resend dashboard and keep Resend's SPF and DKIM records in the verified state.
2. Publish a DMARC record for the same From domain. Start with reporting (`p=none`) while checking the reports, then tighten the policy when every legitimate sender is aligned.
3. Keep `EMAIL_FROM` on that authenticated domain, for example `TheHavenDeals Insider <insider@aidealsuk.com>`. Do not use a free Gmail or Outlook address as the From address.
4. Add the Insider variables documented in `DEPLOY.md` to the production `.env.local`.
5. Generate separate production secrets:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

Use one output for `INSIDER_TOKEN_SECRET` and the other for `INSIDER_CRON_SECRET`.

## Resend webhook

Create a Resend webhook pointing to:

```text
POST https://aidealsuk.com/api/v1/webhooks/resend
```

Subscribe it to `email.opened`, `email.bounced`, `email.complained`,
`email.failed`, and `email.suppressed`, then copy its signing secret to
`RESEND_WEBHOOK_SECRET`. The application automatically stops future digests
after a spam complaint, a permanent bounce, or a Resend suppression. Transient
bounces remain subscribed so a temporary mailbox problem does not remove a
reader permanently.

## Deliverability checks

- Keep the visible unsubscribe link and the one-click unsubscribe headers enabled.
- Send only to confirmed Insider subscribers; never import purchased or scraped addresses.
- Use Google Postmaster Tools to keep the user-reported spam rate below 0.1% and never let it reach 0.3%.
- Warm up a new domain gradually and avoid sudden jumps in daily volume.
- Send subscription mail from `insider@aidealsuk.com`; keep password resets and other transactional mail on a different address.
- Confirm SPF, DKIM, and DMARC pass on a real Gmail message by opening **Show original** before enabling the full daily schedule.

## Daily schedule

The digest endpoint is:

```text
POST /api/v1/cron/insider-digest
Authorization: Bearer <INSIDER_CRON_SECRET>
```

It sends a daily catalogue snapshot containing up to 10 best product deals,
10 newest published products, and 10 active coupon deals. The production
PM2 configuration starts `websiteafiliate-insider-cron` automatically on every
deploy. The worker performs one idempotent catch-up run after deployment, then
runs daily at 12:00 UTC (midnight GMT+12). No server crontab setup is required.

Check scheduler output with:

```bash
pm2 logs websiteafiliate-insider-cron
```

The application sends through Resend's batch API in groups of 100 recipients. A per-day marker on each subscriber and a Resend idempotency key prevent ordinary cron retries from sending duplicate digests.
