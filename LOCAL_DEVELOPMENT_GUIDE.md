# LOCAL DEVELOPMENT GUIDE — Anand Mobile & Electrics

How to run the full system locally, including **demo mode** (no live database).

## Prerequisites
Node.js 20+ and npm. From `02 - Website/Customer Website/Source Code`:
```bash
npm install
```

## Environment
Copy `.env.example` → `.env.local` (gitignored) and fill in your own values:
```
VITE_SUPABASE_URL="https://<your-project>.supabase.co"
VITE_SUPABASE_ANON_KEY="<your-anon-publishable-key>"
# VITE_DEMO_MODE="true"   # optional — see Demo mode below
```
Only the anon/publishable key goes in the frontend. Never put the service-role key here.

## Commands
```bash
npm run dev       # dev server (hot reload)
npm run build     # tsc -b + production build to dist/
npm run preview   # serve the production build (PWA installable on localhost)
npm run test      # vitest unit tests
npm run lint      # oxlint
```

## Demo mode (run without live Supabase)
Set `VITE_DEMO_MODE="true"` in `.env.local`, then `npm run dev` (or build/preview).

- The repairs domain (list, dashboard counts, search, details, create customer/
  device/repair, status + notes, history) is served from a **deterministic
  in-memory adapter** ([src/data/demoRepairs.ts](src/data/demoRepairs.ts)) — no
  network, no database. All synthetic records are prefixed **"DEMO"**.
- Auth is bypassed with a signed-in **demo Owner**, so `/admin/*` is reachable
  without a real login.
- A fixed **"DEMO MODE — synthetic data, not live"** banner is always visible
  ([src/components/DemoBanner.tsx](src/components/DemoBanner.tsx)).
- The data boundary lives in [src/services/repairs.ts](src/services/repairs.ts):
  each function calls the demo adapter when `isDemoMode()` is true, else live
  Supabase. The UI is identical either way, so the future Supabase path needs no
  UI rewrite.

### What is fully testable in demo mode
Public website (all pages), repairs admin workflow end-to-end (CRUD, search,
status, history), role-aware UI shape, loading/empty/error states, PWA build.

### What demo mode does NOT cover (requires live Supabase — by design)
- **Inventory** (`src/pages/admin/Inventory.tsx`) and **Login** still call
  Supabase directly; they are not behind the demo adapter yet (see
  `FUTURE_SUPABASE_INTEGRATION.md`). In demo mode, Inventory will show
  empty/errors.
- Real authentication, RLS enforcement, DB-side triggers (job numbers,
  completed_at, append-only history), storage/signed URLs, concurrency/atomic
  stock updates. The demo adapter *simulates* some of these in memory but they
  are only truly enforced server-side.
- Repair photos: demo returns a 1×1 placeholder image; real images need storage.

### Safety rules baked in
- The app **never** silently falls back to demo data when a live request fails —
  that could mislead staff about real stock/repairs. Demo mode is an explicit,
  visible, build-time choice.
- Demo data is clearly labelled and separate from any production data.

## Project map
- Public pages: `src/pages/{Home,About,Services,ServiceDetail,Products,Contact,NotFound}.tsx`
- Admin: `src/pages/admin/*`, gated by `src/components/admin/AdminLayout.tsx`
- Data/service boundary: `src/services/repairs.ts` (+ `src/data/*` demo adapter)
- Auth: `src/contexts/AuthContext.tsx`
- PWA: `public/manifest.webmanifest`, `public/sw.js`
- Migrations: `supabase/migrations/*` · review-only: `supabase/proposed/*`

## Tests
`npm run test` runs vitest. Current suites: `src/services/repairs.test.ts`
(sanitizer/phone/mime/status) and `src/data/demoRepairs.test.ts` (adapter
behavior). Add tests next to the code they cover.
