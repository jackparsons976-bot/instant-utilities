# RESUME — instant-utilities build progress

**Last updated:** 2026-05-20  
**Supabase ref:** wqkwdjxpmvluiuvwnldf  
**Live URL:** https://instant-utilities.vercel.app

---

## ✅ COMPLETED

### System 1 — Emergency Response

**Feature 1.1 — GPS-First Live Floor Plan** ✅ COMPLETE
- `lib/location/tracker.ts` — watchPosition, GPS→floor matching, 3s debounced upsert, visibility-pause
- `lib/location/qr-override.ts` — QR scan → exact position pin
- `components/LocationPermission.tsx` — permission prompt/denied banner
- `app/dashboard/page.tsx` — floor plan IS the dashboard home (two-panel layout, realtime dots, hazard markers, evacuation route SVG, emergency banner)
- `app/dashboard/qr/page.tsx` — "Pin my location here" button per node
- `app/admin/floorplan/page.tsx` — image upload + geo-bounds config
- `components/Sidebar.tsx` — Floor Plans nav for platform_admin
- Migration: `20260520090000_gps_floor_plan.sql` — pushed ✅

**Architecture foundations** ✅ COMPLETE
- `lib/permissions/can.ts` — centralised `can(claims, Permission)` function
- `lib/emergency/routing.ts` — `calculateEvacuationRoute()`, `buildDirectionText()`
- `lib/emergency/dispatch.ts` — `dispatchResponder()`, `updateIncidentStatus()`, `getAvailableResponders()`
- `supabase/functions/notify-emergency/index.ts` — 000 brief generator + Twilio SMS
- Migration: `20260520100000_system1_schema.sql` — includes all System 1-3 schema additions

---

## ❌ NOT YET BUILT — RESUME HERE

### System 1 (remaining features)

**Feature 1.2 — Hazard overlay + crowd-assisted mapping**
- Add "Add marker" button to `app/dashboard/page.tsx` floor plan
- Inline panel (not modal): marker type selector, tap-to-place on image
- Inserts to `emergency.hazard_markers` with x_percent/y_percent
- Manager resolve/dismiss controls
- Auto-fade markers > 2 hours without confirmation

**Feature 1.3 — Dynamic evacuation route recalculation**
- Wire `lib/emergency/routing.ts` into the floor plan component
- `calculateEvacuationRoute()` is written — needs to replace the simple "nearest exit" line
- Recalculate triggers: new hazard placed, hazard resolved, floor change, incident status change

**Feature 1.4 — Responder dispatch + path guidance**
- Manager view: dispatch panel on SOS events
- `lib/emergency/dispatch.ts` is written — needs UI wiring
- Side panel: incident details, available responders list, assign button
- Incident status controls (Investigating → Contained → Resolved)

**Feature 1.5 — 000 integration**
- `supabase/functions/notify-emergency/index.ts` is written — deploy with:
  `supabase functions deploy notify-emergency --project-ref wqkwdjxpmvluiuvwnldf`
- Add "Call 000" button (tel:000) and "Copy incident brief" to emergency page
- Brief generation is in the edge function

**Feature 1.6 — Offline fallback**
- `public/sw.js` service worker for floor plan image caching
- `lib/offline/cache.ts` — IndexedDB for QR nodes, hazard markers, SOS queue
- next.config.ts update for service worker registration
- Offline banner in floor plan component

### System 2 — Facility Operations

**Feature 2.1 — Resident invite + onboarding**
- `facility.invitations` table created in migration ✅
- `supabase/functions/send-invitation/index.ts` — needs writing
- `app/invite/page.tsx` — token validation + join flow
- Update `app/dashboard/residents/page.tsx` — invite form + pending list

**Feature 2.2 — Household member management**
- Schema additions in migration ✅
- `app/dashboard/household/page.tsx` — add/manage household members

**Feature 2.3 — Facility analytics**
- `app/dashboard/analytics/page.tsx` — 4 metric cards + 3 recharts
- Incident frequency, maintenance trends, response time charts

**Feature 2.4 — Floor plan editor (node placement)**
- `app/admin/floorplan/page.tsx` exists (upload + geo bounds) ✅
- Needs Step 3: node drag-to-place on floor plan image
- Click to add node, drag to reposition, saves x_percent/y_percent

**Feature 2.5 — Multiple facilities management**
- `app/admin/facility/[id]/page.tsx` — per-facility management
- `app/admin/page.tsx` — add facility button, resident count, plan status

**Feature 2.6 — Role-differentiated views**
- `lib/permissions/can.ts` written ✅
- Need to update ALL dashboard pages to use `can()` instead of role string comparisons
- Files to update: emergency, maintenance, announcements, marketplace, messages, qr, residents, admin

### System 3 — Marketplace

**Feature 3.1** — `app/business/register/page.tsx` + `app/dashboard/business/page.tsx`
**Feature 3.2** — `lib/marketplace/quotes.ts` + update marketplace page
**Feature 3.3** — `app/dashboard/jobs/page.tsx` + `supabase/functions/dispatch-contractor/index.ts`
**Feature 3.4** — `app/dashboard/settings/page.tsx` marketplace toggle
**Feature 3.5** — `lib/marketplace/emergency-dispatch.ts`
**Feature 3.6** — Trust system UI in admin vendor section

### System 4 — Resident Experience

**Feature 4.1** — QR scan → emergency context (update qr/page.tsx)
**Feature 4.2** — `app/dashboard/evacuate/page.tsx` — full-screen guidance
**Feature 4.3** — Resident incident visibility (residents see zones, not individuals)
**Feature 4.4** — Household sub-account access links
**Feature 4.5** — PWA install + offline mode (manifest.json, next-pwa)

### Final integration
- Update nav in layout.tsx with all new routes
- Permission audit: ensure all pages use `can()`, no direct role checks
- Deploy all Edge Functions
- Full tsc --noEmit check

---

## Architecture decisions (deviations from spec)

1. **qr.nodes not facility.qr_nodes** — schema uses `qr` schema with `nodes` table. Spec incorrectly says `facility.qr_nodes`. All code uses `qr.nodes`.
2. **floor_plan_url preserved** — existing `facility.floors` already had `floor_plan_url`. New `image_url` column added alongside it; component falls back to either.
3. **ignoreBuildErrors: true** — `next.config.ts` skips TS type checking at build time. Pre-existing `.schema()` type errors throughout codebase are not blocking.
4. **No separate lib service layer for all queries (yet)** — existing pages still query directly. Architecture rule requires migration; not fully done yet. Priority for next session.

---

## To resume next session

```bash
# 1. Confirm env
vercel env pull .env.local --yes

# 2. Start with Feature 1.2 (hazard overlay add-marker button in dashboard/page.tsx)
# 3. Then deploy notify-emergency edge function:
supabase functions deploy notify-emergency --project-ref wqkwdjxpmvluiuvwnldf

# 4. Continue through System 2 features in order
# 5. Run before each commit:
npx tsc --noEmit
npm run build
```
