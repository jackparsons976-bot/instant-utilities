# RESUME — instant-utilities build progress

**Last updated:** 2026-05-23  
**Supabase ref:** wqkwdjxpmvluiuvwnldf  
**Live URL:** https://instant-utilities.vercel.app

---

## ✅ COMPLETED

### System 1 — Emergency Response (commit c31af06)
- Feature 1.1 ✅ GPS-first live floor plan (prior session)
- Feature 1.2 ✅ Hazard overlay + crowd-assisted mapping
- Feature 1.3 ✅ Evacuation routing (calculateEvacuationRoute wired in)
- Feature 1.4 ✅ Responder dispatch UI + incident status controls
- Feature 1.5 ✅ 000 integration (notify-emergency deployed, Call 000 + copy brief)
- Feature 1.6 ✅ Offline fallback (service worker, IndexedDB cache)

### System 2 — Facility Operations (commit 0d7846b)
- Feature 2.1 ✅ Resident invite + onboarding (send-invitation deployed, /invite page)
- Feature 2.2 ✅ Household member management (app/dashboard/household/page.tsx)
- Feature 2.3 ✅ Analytics dashboard with recharts (app/dashboard/analytics/page.tsx)
- Feature 2.4 ✅ Floor plan editor step 3 — node drag-and-place
- Feature 2.5 ✅ Multi-facility management (app/admin/facility/[id]/page.tsx)
- Feature 2.6 ✅ Role-differentiated views via can() across all dashboard pages

### System 3 — Marketplace (commit fb7d9cf)
- Feature 3.1 ✅ Business registration (app/business/register/ + app/dashboard/business/)
- Feature 3.2 ✅ Quote negotiation (lib/marketplace/quotes.ts + marketplace page)
- Feature 3.3 ✅ Jobs dashboard + dispatch-contractor edge function deployed
- Feature 3.4 ✅ Settings page with marketplace toggle
- Feature 3.5 ✅ Emergency provider integration (lib/marketplace/emergency-dispatch.ts)
- Feature 3.6 ✅ Vendor trust system (admin approvals + marketplace badges)

### System 4 — Partial (commit ed89749)
- Feature 4.2 ✅ Evacuation guidance screen (app/dashboard/evacuate/page.tsx)

---

## ❌ NOT YET BUILT — RESUME HERE

### System 4 — COMPLETE (commit 42ce969)

**All features built and deployed to production.**

---

### Remaining (none)

**Feature 4.1 — QR scan → emergency context** (`app/dashboard/qr/page.tsx`)
- After QR scan: show node context (type, zone, nearest exits, active hazards within 20%)
- If active incident on floor: full-screen emergency context with evacuation route from this node
- Actions: "I need help here" (pre-fills SOS with node location), "Report hazard here", "Show evacuation route"
- Link to /dashboard/evacuate when incident active

**Feature 4.3 — Resident incident visibility** (`app/dashboard/page.tsx` adjustments)
- Residents see incidents as coloured zones (NOT individual user dots — privacy already handled by usersOnFloor filter)
- Incident banner at top linking to /dashboard/evacuate
- "All clear" green banner for 30s after incident resolves (track previous incident state)
- Confirm residents cannot see other users' names/positions (check usersOnFloor filter)

**Feature 4.4 — Household member access links** 
- Update `app/dashboard/household/page.tsx`: "Generate access link" button per member
- Add `access_token` column to `facility.household_members` (new migration)
- Create `app/household-access/page.tsx` — read-only simplified floor plan + emergency guidance only, token-auth via URL param

**Feature 4.5 — PWA install + offline mode**
- `npm install next-pwa`
- Create `public/manifest.json` (name: "Instant Utilities", theme: #1D9E75, start_url: /dashboard)
- Generate icons: `public/icon-192.png` and `public/icon-512.png` (use sharp: draw green circle with "IU" text)
- Update `next.config.ts` with withPWA wrapper (disable in dev)
- Install prompt on `/login` for mobile users (show once via localStorage key `pwa-prompt-dismissed`)

### Final integration (do last)
- Update `components/Sidebar.tsx` with all new routes:
  - Manager nav: Home, Emergency, Residents, Maintenance, Announcements, Marketplace, Analytics, Jobs, Messages, QR, Settings
  - Resident nav: Home, Emergency, Maintenance, Messages, Marketplace, My Household, Settings
  - Admin nav: all above + Admin
- Permission audit: grep for `role ===` patterns outside can.ts — replace with can()
- Run: `supabase db push --project-ref wqkwdjxpmvluiuvwnldf`
- Run: `npx tsc --noEmit` (pre-existing schema() errors are OK, no new errors)
- Run: `npm run build`
- Deploy: `vercel --prod`

---

## Architecture decisions (deviations from spec)
- `confirmed_by` on hazard_markers migrated `uuid` → `uuid[]` (migration 20260521180000)
- `placed_by` column kept alongside `created_by` for backward compatibility
- recharts installed as dependency for analytics (was not in original package.json)
- Business registration uses `supabase.auth.signUp` (not admin invite) — simpler public flow
- Evacuate page uses lib/emergency/routing.ts calculateEvacuationRoute directly

## To resume next session
```bash
vercel env pull .env.local --yes
# Start with Feature 4.1: app/dashboard/qr/page.tsx
# Then 4.3, 4.4, 4.5, Sidebar nav update, final deploy
npx tsc --noEmit && npm run build
vercel --prod
```
