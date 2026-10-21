# PROJECT COMPLETION TRACKER — Anand Mobile & Electrics

_Last updated: 2026-10-15. Local engineering state. Nothing deployed; no live SQL;
no live auth/role/settings changes. Statuses: ✅ done · 🟡 partial · ⛔ owner/device-gated._

## Build & quality baseline (last verified green)
`tsc -b` exit 0 · direct Vitest entry 19/19 · `vite build` exit 0 (main chunk remains just over 500 kB) ·
`oxlint` 0 errors · no secrets in `src`/`dist` · `.env.local`/`.env.test.local` gitignored.

## Feature matrix
| Feature | State | Key files | Tests / evidence | Blockers |
|---|---|---|---|---|
| Customer website (Home/About/Services/ServiceDetail/Products/Contact/404) | ✅ | `src/pages/*` | build; website+a11y review | — |
| Contact form (mailto, validated, a11y labels) | ✅ | `src/pages/Contact.tsx` | code review | real send is email-client based (documented) |
| Products page (Coming Soon, honest) | ✅ | `src/pages/Products.tsx` | live: products/categories/brands = 0 | needs real data + catalog view approval |
| Navbar/Footer/mobile menu, skip-link, reduced-motion | ✅ | `src/components/*`, `src/index.css`, `PublicLayout.tsx` | a11y review | per-component brand-blue contrast is a minor follow-up |
| Auth + roles (owner/manager/technician) | ✅ | `src/contexts/AuthContext.tsx`, `components/admin/AdminLayout.tsx` | live 20/20 (owner+manager) | — |
| Admin dashboard | ✅ | `src/pages/admin/Dashboard.tsx` | build | — |
| Inventory + barcode + stock RPC | ✅ | `src/pages/admin/Inventory.tsx` | live INV-01/02/03; scanner cleanup fixed | camera scan = device-gated ⛔ |
| Repairs (intake/status/history/photos) | ✅ | `src/pages/admin/Repairs*.tsx`, `components/repairs/*`, `services/repairs.ts` | live 20/20 | — |
| Repair search (job/customer/phone/device/problem) | ✅ | `services/repairs.ts` | live 13/13 | — |
| Private repair-photos (signed URLs) | ✅ | `services/repairs.ts` | live STOR tests | — |
| Supabase schema + RLS + triggers | ✅ (reviewed) | `supabase/migrations/*` | security review | live grant/owner check ⛔ |
| handle_new_user role-escalation fix | 🟡 staged | `supabase/migrations/20261011000000_*.sql` | static review done | owner apply + live signup verify ⛔ |
| public_catalog view | 🟡 proposal | `supabase/proposed/public_catalog_REVIEW_ONLY.sql` | review-only | data + approval ⛔ |
| PWA (manifest/sw/install) | ✅ wired | `public/manifest.webmanifest`, `public/sw.js`, `vite.config.ts`, `src/main.tsx` | build emits precache manifest; server-side verified | live install/offline ⛔ (device) |
| Automated tests (vitest) | ✅ | `src/services/repairs.test.ts`, `src/data/demoRepairs.test.ts`, `src/pwa.test.ts` | 19/19 | browser/device flows remain manual |
| Docs | ✅ | `README.md`, this file, `SPRINT_LEDGER.md` | — | — |
| Android staff app | ✅ as PWA (decision) | PWA above | — | native APK = separate effort if ever wanted |

## Architectural decision — "Android staff app" = PWA
`03 - Mobile App/Staff App/` is empty; no native project exists. Per the owner's earlier
choice, the staff app is delivered as the **installable PWA** of this same web app
(`start_url:/admin`, standalone, offline app-shell, cross-origin/private data never cached).
This is ₹0, one codebase, no Play Store. A separate native Kotlin app was deliberately
**not** scaffolded (would duplicate logic and add cost); it remains an optional future effort.

## Owner-gated / device actions still open
1. Apply + live-verify `handle_new_user` hardening migration (signup test matrix).
2. Confirm public-signup is disabled in the dashboard.
3. Live RLS/grant/owner verification queries.
4. PWA install/offline/reconnect on Chrome (Windows).
5. Barcode camera + photo upload on a physical Android phone.
6. Products: enter real data + approve `public_catalog` view.
7. Deployment to Vercel.

## Staging handoff
The ordered application, PWA, security, SQL, browser, and Android verification
checklist is maintained in `README.md` under **Staging verification checklist**.
Each item must be recorded as PASS, FAIL, NOT VERIFIED, or OWNER ACTION REQUIRED.
Local code/build success must not be substituted for live RLS or device evidence.

## Known limitations
- `npm audit`: advisories in dev-only vitest transitive deps (not shipped); not force-fixed.
- Brand-blue small-text contrast: minor WCAG AA follow-up in a few CSS modules.
- PWA build now precaches generated JS/CSS route chunks; offline navigation still needs browser verification.
- PWA icons now include real 192px, 512px, and padded maskable PNGs derived from the approved shop logo.
- Free tier: Supabase pauses after ~7 days inactivity.
