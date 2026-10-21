# Anand Mobile & Electrics — Customer Website & Staff App

A React + Vite + TypeScript web app for a local mobile/electronics repair shop in
Sachin, Surat. It serves a public marketing site and an authenticated staff area
(inventory + repair management) backed by Supabase, and is installable as a PWA.

> Local physical shop only — no delivery/shipping/online checkout. Do not add
> invented products, prices, hours, testimonials, or business claims.

## Tech stack
React 19, Vite, TypeScript, React Router 7, react-helmet-async, lucide-react,
Supabase (Auth + Postgres + Storage), html5-qrcode, browser-image-compression.

## Development setup
```bash
# from this folder: 02 - Website/Customer Website/Source Code
npm install
npm run dev        # dev server
npm run build      # typecheck (tsc -b) + production build to dist/
npm run preview    # serve the production build locally (PWA installable on localhost)
  npm run test       # vitest unit tests (use the direct local Vitest entry if npm mis-parses this workspace path on Windows)
npm run lint       # oxlint
```

### Required environment variables (names only — never commit values)
Create `.env.local` (git-ignored) with:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
Only the **anon/publishable** key belongs in the frontend. The **service-role**
key must NEVER be in `.env.local`, source, or Git — pass it as a transient shell
env var only when running admin/setup scripts.

For running the live test matrix, `.env.test.local` (git-ignored) holds throwaway
role logins: `TEST_OWNER_EMAIL/PASSWORD`, `TEST_MANAGER_EMAIL/PASSWORD`,
`TEST_TECH_EMAIL/PASSWORD`.

## Architecture / route map
- Public (in `PublicLayout`): `/`, `/about`, `/services`, `/services/:id`,
  `/products` (Coming Soon), `/contact`, `*` (404). Routes are lazy-loaded.
- Staff (in `AdminLayout`, auth-gated): `/admin/login`, `/admin` (dashboard),
  `/admin/inventory`, `/admin/repairs`, `/admin/repairs/new`, `/admin/repairs/:id`.
- Service layer: `src/services/repairs.ts` holds all repair/customer/device/photo
  Supabase queries. Auth/session in `src/contexts/AuthContext.tsx`.

## Authentication & roles
Roles live in `public.profiles.role`: `owner | manager | technician` (default
`technician`). The app's intended accounts are one Owner and one Manager. Frontend
role checks are **usability only** — the real boundary is Postgres RLS. Only an
Owner can change roles (done via the dashboard SQL editor; the client cannot).

## Security boundaries (enforced in the database)
- RLS on customers/devices/repairs/repair_history/repair_photos/products/etc.
- `repair_history` is append-only (trigger-written; no client insert/update/delete).
- `repairs.job_number` DB-generated; `completed_at` DB-controlled (client values rejected).
- Device↔customer integrity via composite FK.
- `products.current_stock` only mutated through the `adjust_stock()` RPC (direct
  writes blocked; negative stock prevented).
- Private `repair-photos` bucket: served via short-lived signed URLs only, never
  public URLs; technicians limited to their assigned repairs.
- Verified by live tests: Owner+Manager 20/20, repair search 13/13 (historical
  Owner+Technician 27/27). Re-run with the authorized accounts via a scratch script.

## Database migrations
Active schema: `supabase/migrations/` (phased, 2026). Apply with the Supabase CLI
(`supabase db push`) against the linked project — **owner-approved changes only**.
`supabase/proposed/` holds review-only SQL that must NOT be in the execution path
(e.g. `public_catalog_REVIEW_ONLY.sql`).

## PWA — manual verification (Chrome on Windows, localhost or deployed HTTPS)
Server-side wiring is verified; installation/offline must be tested in a browser:
1. Load the production build online once (the build emits `precache-manifest.js`, and the service worker caches route JS/CSS chunks).
2. Confirm Chrome offers **Install**; install and confirm it opens in its own window.
3. Go offline, reload a visited route → the **shell and previously built route chunks** render with empty/loading/
   error states — **no real private data** should appear from cache.
4. Reconnect → normal recovery.
The service worker (`public/sw.js`) precaches generated route assets and never caches cross-origin (Supabase) or
non-GET requests, so authenticated/private data and signed URLs are not cached.

The manifest uses the approved shop logo in `public/icon-192.png`,
`public/icon-512.png`, and the padded `public/icon-512-maskable.png`. The PNG
dimensions and manifest paths are checked by `src/pwa.test.ts`.

## Barcode scanning — manual verification (physical Android phone)
Open `/admin/inventory`, grant camera permission, scan an existing product's
barcode → it must open that product's stock-adjust flow (not create a duplicate).
Manual barcode/no-barcode entry is the fallback when the camera is unavailable.

## Backup / export (procedure — not an automated, tested backup)
- DB: Supabase Dashboard → Database → Backups, or `pg_dump` with the project
  connection string (keep the string out of Git).
- Storage: download the `product-images` / `repair-photos` buckets via dashboard
  or Supabase CLI.
- Code: GitHub repo; tag a release before each deploy.

## Deployment checklist (Vercel — only when owner authorizes)
1. `npm run build` and `npm run test` pass locally.
2. Vercel env vars set (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
3. SPA rewrite present (`vercel.json`).
4. Deploy, then smoke-test: public pages load, `/admin/login` works, PWA assets
   served (`/manifest.webmanifest`, `/sw.js`).

### Rollback
Vercel → Deployments → promote the previous working deployment. For DB, restore
from a Supabase backup; migrations should be reversible (keep a rollback block).

## Known limitations / owner approval gates
- Products catalog deferred: no product data yet + the public-catalog view needs
  owner approval before applying.
- PWA install/offline and camera/barcode tests require the owner's device.
- `npm audit` reports advisories in **dev-only** vitest transitive deps (not shipped
  to the browser); not auto-fixed to avoid a breaking vitest upgrade.
- Deployment, role changes, new users, and any live SQL/migration are owner-gated.
- Free-first: Supabase free tier pauses after ~7 days inactivity; no paid services.

## Staging verification checklist

Run this checklist against a staging URL or local production preview. Record each
item as `PASS`, `FAIL`, `NOT VERIFIED`, or `OWNER ACTION REQUIRED`; do not infer
browser, device, or live-database results from a local build.

| Area | Check | Expected result | Status |
|---|---|---|---|
| Application | Login/logout for each test account | Correct session starts and ends; protected routes redirect after logout | NOT VERIFIED |
| Application | Owner, manager, technician access | Valid roles reach only their permitted workflows | NOT VERIFIED |
| Application | Missing/invalid profile role | Clear profile-not-configured state with logout; no staff content | PASS (code) |
| Application | Inventory validation and duplicate barcode | Invalid quantities are rejected; existing barcode opens the product instead of creating a duplicate | NOT VERIFIED |
| Application | Repairs and technician assignment | Technician sees/updates only assigned work; owner/manager retain management access | OWNER ACTION REQUIRED |
| Application | Contact form | Validated fields create an encoded mailto message; no backend send is implied | PASS (code) |
| Application | Mobile navigation/layout | Navigation remains usable without covering forms, scanner, or keyboard | NOT VERIFIED |
| PWA | Manifest/icons/service worker | Requests return 200 and icons are valid | NOT VERIFIED |
| PWA | Install/standalone launch | Chrome offers install and opens a standalone window | NOT VERIFIED |
| PWA | Offline visited routes | Previously precached route code reloads; private data is not shown from cache | NOT VERIFIED |
| PWA | Offline mutations/reconnect | Writes fail visibly offline; reconnect restores normal Supabase operation | NOT VERIFIED |
| PWA | Service-worker update/deleted chunks | New cache activates and old cache is removed without stale chunk failure | NOT VERIFIED |
| Security | Anonymous access | Staff routes redirect; protected API/data remains inaccessible | OWNER ACTION REQUIRED |
| Security | Stock RPC/direct mutation | Technician restrictions and direct stock-write protection hold in the database | OWNER ACTION REQUIRED |
| Security | Repair/storage/photo policies | Assignment and role boundaries hold for all tested roles | OWNER ACTION REQUIRED |
| Security | Public signup/function configuration | Signup policy, grants, owners, and security-definer settings match the approved plan | OWNER ACTION REQUIRED |

## Safe live Supabase verification plan (read-only)

An authorized owner can run these in the Supabase SQL editor. Do not paste
credentials or service-role keys into the repository or chat. Replace the UUID
comments only when the owner knows the relevant function signature.

```sql
-- Applied migrations (Supabase-managed history)
select version, name from supabase_migrations.schema_migrations order by version;

-- Relevant functions, ownership, security-definer state, and search_path
select p.oid::regprocedure as signature, pg_get_userbyid(p.proowner) as owner,
       p.prosecdef as security_definer, p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('adjust_stock','get_auth_role','handle_new_user');

-- Function grants
select routine_schema, routine_name, privilege_type, grantee
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in ('adjust_stock','get_auth_role','handle_new_user')
order by routine_name, grantee;

-- RLS enabled and policies for protected tables
select schemaname, tablename, rowsecurity, forcerowsecurity
from pg_tables
where schemaname in ('public','storage')
  and tablename in ('profiles','products','stock_movements','repairs','repair_history','repair_photos');

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where (schemaname = 'public' and tablename in
  ('profiles','products','stock_movements','repairs','repair_history','repair_photos'))
   or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;

-- Stock protection trigger and RPC existence
select tgname, tgrelid::regclass, tgenabled
from pg_trigger
where tgrelid = 'public.products'::regclass and not tgisinternal;

select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in ('repair-photos','product-images');
```

The owner should separately confirm in the Supabase Auth dashboard that public
signup is disabled or intentionally controlled, then run the role matrix with
authorized owner, manager, technician, and anonymous clients. These SQL queries
inspect configuration; they do not prove end-to-end authorization by themselves.

## Browser and Android staging procedure

1. Run `npm run build`, then `npm run preview` from this directory. Use the
   printed localhost URL; use deployed HTTPS for phone camera testing.
2. Open the site online, sign in, visit `/admin`, `/admin/inventory`,
   `/admin/repairs`, and one repair detail route.
3. In Chrome DevTools → Application, inspect the manifest and service worker;
   confirm the worker is activated and the icon requests succeed.
4. Install the PWA, close the browser tab, and reopen the standalone app.
5. Switch DevTools Network to Offline and reload the visited routes. Confirm
   route code loads, Supabase-backed data does not appear from cache, and writes
   show a clear failure rather than being queued or falsely confirmed.
6. Restore the network and verify normal reads/writes recover.
7. Deploy/build a second staging revision only after authorization. Confirm the
   new worker activates, the old cache is removed, and an old route does not
   reference deleted chunks.
8. On Android Chrome, open the HTTPS staging URL, install the PWA, deny camera
   permission once, and confirm the manual barcode path remains usable.
9. Grant camera permission, scan a known barcode, repeat open/close several
   times, and confirm no camera remains active after closing.
10. Capture/select a product or repair photo, upload it, then test a denied or
    failed upload and confirm the error is visible without claiming success.
