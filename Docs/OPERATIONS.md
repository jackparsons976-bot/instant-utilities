# Operations Runbook — Instant Utilities

**Supabase project ref:** `wqkwdjxpmvluiuvwnldf`  
**Vercel project:** `glass-trial/instant-utilities`  
**Live URL:** https://instant-utilities.vercel.app

---

## Backup

Supabase performs automated daily backups on the Pro plan. For manual point-in-time snapshots:

```bash
# Requires supabase CLI and Docker
supabase db dump --project-ref wqkwdjxpmvluiuvwnldf -f backups/$(date +%Y%m%d_%H%M%S)_dump.sql

# Restore to a branch or local instance
supabase db reset --db-url "<connection-string>"
```

Supabase Dashboard backup controls: **Project → Settings → Backups**  
Backups are retained for **7 days** (Pro plan). Download before rotation if you need longer retention.

---

## Database migrations

```bash
# Apply pending local migrations to remote
supabase db push --project-ref wqkwdjxpmvluiuvwnldf

# Check migration history
supabase migration list --project-ref wqkwdjxpmvluiuvwnldf

# Mark a migration applied without running (sync drift)
supabase migration repair --status applied <timestamp> --project-ref wqkwdjxpmvluiuvwnldf
```

---

## Edge Functions

SOS rate-limiting is handled by `sos-handler` deployed to Supabase Edge Functions.

```bash
# Redeploy after changes
supabase functions deploy sos-handler --project-ref wqkwdjxpmvluiuvwnldf

# View logs
supabase functions logs sos-handler --project-ref wqkwdjxpmvluiuvwnldf
```

Dashboard: https://supabase.com/dashboard/project/wqkwdjxpmvluiuvwnldf/functions

---

## Monitoring

**Sentry** is integrated for client and server error tracking.

1. Create a project at https://sentry.io
2. Copy the DSN from **Project → Settings → Client Keys**
3. Set in Vercel: `vercel env add NEXT_PUBLIC_SENTRY_DSN production`
4. Also add to `.env.local` for local capture

Key Sentry alerts to configure:
- Unhandled exceptions with `platform_role = platform_admin` context
- Error rate spike > 10 errors/min on `/api/sos`
- `rate_limit_exceeded` DB exceptions from `check_sos_rate_limit()`

**Supabase Logs** (Dashboard → Logs):
- API logs: query latency and 5xx errors
- Auth logs: failed login attempts
- Realtime: subscription health

---

## Deployments

```bash
# Production deploy
vercel --prod

# Preview deploy (auto-triggered on push to main)
git push origin main
```

Vercel project dashboard: https://vercel.com/glass-trial/instant-utilities

---

## SLA and emergency procedures

| Severity | Definition | Target response |
|---|---|---|
| P0 | Platform down / emergency coordination unavailable | 15 minutes |
| P1 | SOS not sending / realtime subscriptions offline | 1 hour |
| P2 | Non-critical page errors / display bugs | Next business day |

**P0 response steps:**
1. Check Vercel deployment status — roll back if last deploy caused the incident
2. Check Supabase project status at https://status.supabase.com
3. Check Sentry for the root exception
4. If DB is unresponsive, Supabase Dashboard → Settings → Danger Zone → Restart

**Emergency page offline fallback:**  
The emergency page shows a static "call 000 immediately" message when the realtime subscription cannot connect after 3 retry attempts. Do not remove this fallback.

---

## Access control

- Platform admins: `public.users.platform_role = 'platform_admin'`
- Facility managers: `facility.members.role = 'manager'`
- RLS is enabled on all 24 tables — do not disable without a security review
- JWT custom hook (`public.custom_access_token_hook`) populates `app_metadata` — if auth claims break, check this function first

---

## Contact

- Supabase support: https://supabase.com/dashboard/support
- Vercel support: https://vercel.com/help
- Sentry docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
