# FINAL MULTI-AGENT AUDIT — Anand Mobile & Electrics

_Date: 2026-10-11. Local engineering audit. No live SQL, no deploy, no auth/role/
settings changes; public signup remains disabled. Three independent read-only
audit agents (A+E website/PWA, B+D admin/workflow, C database/security) + a
coordinator (F: builds/tests/secrets/deps). Confirmed defects were fixed locally
and the suite re-run._

## Local hardening update — 2026-10-17

### Fresh commands and results

| Check | Command | Exit/result |
|---|---|---|
| Tests | `npm test` | exit 0; 4 files, 22 tests passed |
| Typecheck + production build | `npm run build` | exit 0; successful Vite build |
| Lint | `npm run lint` | exit 0; 10 advisory warnings, no errors |
| Secret scan | search `src` for service-role/JWT-like secrets | no matches |

### Warning classification

- Fixed correctness risks: demo inventory now rejects blank names, duplicate barcodes,
  and negative stock; inventory initialization no longer captures an inline function;
  footer year is stable across renders.
- Lifecycle advisories retained: async data-loading effects in repairs/photo gallery
  and inventory are guarded or intentionally synchronize remote data; they do not
  write live data without an explicit user action.
- Safe existing exceptions: unused variables in `scratch/verify_*` live-test scripts,
  Fast Refresh export advice in `AuthContext`, and React advisory diagnostics in
  existing remote-data components. These do not affect production behavior.

### Bundle review

The production build still reports the main application chunk at approximately
503 kB minified and the Inventory chunk at approximately 382 kB. Inventory already
lazy-loads and its image-compression dependency is isolated in a separate chunk.
The remaining main chunk contains shared React/router/Supabase/application modules.
Further splitting is possible but was not forced because it would add build-risk
without a measured runtime problem. The warning is non-blocking.

### Synthetic workflow coverage

`src/data/demoInventory.test.ts` now verifies synthetic barcode lookup, stock receive,
duplicate barcode rejection, negative-stock rejection, product creation, and image
upload simulation. Existing repair and PWA tests remain green. Production requests
still never fall back to demo data after an error; demo mode is explicit via
`VITE_DEMO_MODE=true`.

### Local startup

From this directory, run `npm install`, then `npm run dev`. For synthetic local admin
workflows, set `VITE_DEMO_MODE=true` in the gitignored `.env.local`; do not put a
service-role key in browser environment variables. Use `npm run build`, `npm test`,
`npm run lint`, and `npm run preview` for local verification.

### Still requiring Supabase or a device

Live RLS/auth/storage/role behavior, migration application, real product data,
anonymous catalog access, and production deployment require Supabase/Vercel owner
access. PWA installation, standalone launch, camera permission, barcode scanning,
photo capture/upload, and offline/reconnect behavior require Chrome/Android device
testing and are not claimed as passed here.

## Fresh integrated results (actual, this run)
| Check | Command | Result |
|---|---|---|
| Typecheck | `tsc -b` | **exit 0** |
| Unit tests | `vitest run` | **11/11 pass** (1 file) |
| Prod build | `vite build` | **success**, index 498.88 kB gzip 145, Inventory lazy chunk 377 kB, **no 500 kB warning** |
| Lint | `oxlint src` | **0 errors** (warnings only, pre-existing class) |
| Secret scan | grep `src`/`dist` | **none** (anon key only; env files gitignored) |

## Agent B+D (admin/auth + inventory/repair) — CONFIRMED DEFECTS FIXED
1. **Success-shown-on-failure (functional):** Inventory `handleCreateProduct` always printed "Product created successfully", clobbering a prior image-failure error. → Now tracks `imageFailed`; success message is conditional. **FIXED.**
2. Stock qty accepted non-integers despite "whole number" copy → added `!Number.isInteger`. **FIXED.**
3. Orphaned storage object when upload succeeds but row-link update fails → added `storage.remove` cleanup (parity with `repairs.ts`). **FIXED.**
4. Image extension from filename not MIME → now uses shared `extFromMime`. **FIXED.**
5. `loadCategoriesAndBrands` swallowed query errors → now surfaces a message. **FIXED.**
Confirmed clean: AuthContext (`.catch`, role-error, unmount guard), AdminLayout guard (usability-only; RLS is boundary), repairs service (job_number/completed_at DB-controlled, append-only history, search sub-query errors surfaced, atomic photo upload+signed URLs), Repairs list (out-of-order guard), RepairDetails (write vs refetch failure separated), RepairForm (tech self-assign), Login, PhotoGallery.

## Agent A+E (website + PWA) — CONFIRMED LOW DEFECTS FIXED
1. **Heading hierarchy:** Services "Why Choose Us?" cards used `<h4>` under an `<h2>` → changed to `<h3>`. **FIXED.**
2. **SEO:** no `og:image`/`og:url`/`twitter:image` → added, using existing `/logo.jpg`; twitter card upgraded to `summary_large_image`. **FIXED.**
3. **Scanner `setTimeout` edge:** unmount within the 100 ms window could still construct a scanner → store timeout id, `clearTimeout` on stop + unmount. **FIXED.**
Confirmed clean: scanner lifecycle (clear on stop/unmount/decode), service worker (cross-origin + non-GET bypass, nav network-first with cached shell, static cache-first, versioned), SW registration/scope, skip-link, focus-visible, reduced-motion, mobile-menu aria, single h1 per page, alt text, contact mailto validation, internal links, local-shop honesty (no delivery/checkout).
Owner/device-gated (NOT RUN): real Chrome install prompt, offline nav, reconnect, camera/barcode.
Owner decision: PNG 192/512 + maskable PWA icons would need assets derived from the locked logo — **not generated** without approval (SVG `any` + 1024² jpg currently satisfy Chrome installability).

## Agent C (database + security) — reviewed; no new local code change
- **HIGH (confirmed):** the *currently-applied* `handle_new_user` trusts client signup metadata for role (self-escalation if public signup enabled). The **staged** fix `supabase/migrations/20261011000000_harden_handle_new_user_role.sql` closes it (literal `technician`, pinned `search_path`, preserves owner+trigger binding, sorts last, safe rollback). **Owner-gated: apply + live-verify.**
- Confirmed safe (local review): proposed SQL is outside the execution path; `adjust_stock` SECURITY DEFINER sound; append-only movements & repair_history; technician/customer isolation; repair-photos private bucket + path-scoped policies; `product-images` public by design (catalog images only); client uses anon key only; `sw.js` caches no private/authenticated/signed-URL data; migration ordering correct.
- Low-priority **optional** hardening (NOT applied — would be a separate owner-approved migration): pin `search_path` on the trivial trigger funcs (`normalize_barcode`, `set_updated_at`, `protect_current_stock`); add `pg_temp` to `get_auth_role`; optionally restrict default `EXECUTE`-to-PUBLIC grants (functions already enforce `auth.uid()`/role internally, so low risk).

## Classification of evidence
- **Locally verified:** build, typecheck, unit tests, lint, secret scan, lazy-loading, all code-level fixes above, SW cache-rule inspection, migration static review.
- **Reviewed but NOT executed:** the staged security migration (apply is owner-gated); the `public_catalog` view; low-pri DB hardening.
- **Not yet tested (live/device):** Supabase signup-escalation live test, live RLS/storage matrix under each role after migration, existing Owner/Manager verification post-migration, PWA install/offline/reconnect in Chrome, Android camera/barcode + photo upload, production deployment.

## Remaining risks / limitations
- `npm audit`: advisories in **dev-only** vitest transitive deps (tinypool/esbuild) — not shipped to browser; not force-fixed (would break vitest).
- Minor: a few brand-blue small-text contrast spots (WCAG AA borderline) — cosmetic follow-up.
- Free tier: Supabase pauses after ~7 days inactivity.

## OWNER-TESTING CHECKLIST (ordered; record actual results)
Each step: do it → compare to Expected → write PASS/FAIL. Stop conditions noted.

1. **Confirm public signup is OFF.** Dashboard → Authentication → Sign In / Providers.
   Expected: "Allow new users to sign up" disabled. _Stop if ON_ until the migration is applied. Result: ___
2. **Review the staged migration** `supabase/migrations/20261011000000_harden_handle_new_user_role.sql`.
   Expected: assigns `technician` regardless of metadata; rollback understood. Result: ___
3. **Apply it (only after approval):** `supabase db push` (or paste in SQL editor).
   Expected: applies cleanly; no error. Result: ___
4. **Role-escalation verification (controlled):** create a throwaway signup with
   `options.data.role` = `owner`, then `manager`, then invalid, then none.
   Expected: every resulting `profiles.role` = `technician`. Delete the throwaway user after.
   _Stop + revert if any role is not technician._ Result: ___
5. **Verify existing accounts unchanged:** `select id, role from public.profiles` for the
   Owner and Manager UIDs. Expected: owner=`owner`, manager=`manager`. Result: ___
6. **Live RLS + storage matrix** (authenticated Owner & Manager clients, not service-role):
   anon blocked; manager cannot write profiles; private repair-photo signed-URL access only
   for authorized rows. Expected: all enforced. Result: ___
7. **PWA on Chrome desktop:** `npm run build && npm run preview`, open the localhost URL,
   confirm Install is offered and opens in its own window. Expected: installable. Result: ___
8. **Android staff (PWA):** open the site on an Android phone, grant camera, scan an existing
   product barcode → opens that product's stock-adjust flow (no duplicate); try manual entry;
   capture/upload a repair photo. Expected: all work. Result: ___
9. **Offline + reconnect:** offline-reload a visited route → shell renders, **no real private
   data** from cache; reconnect → recovers. _Stop + report if real data shows offline._ Result: ___
10. **Products catalog:** enter real products via admin Inventory, then review/approve
    `supabase/proposed/public_catalog_REVIEW_ONLY.sql` (exposes only safe columns). Result: ___
11. **Backup/export:** follow README (Supabase dashboard backup or `pg_dump`; bucket export). Result: ___
12. **Authorize deployment (separately):** then I deploy to Vercel. Result: ___
13. **Post-deploy smoke test:** public pages load, `/admin/login` works, `/manifest.webmanifest`
    + `/sw.js` served, Install offered on the live HTTPS URL. Result: ___

## FINAL STATUS: IMPLEMENTATION VERIFIED — READY FOR OWNER TESTING
All authorized local engineering is complete; three independent audits found only
low/medium issues, all fixed and re-verified green. NOT production-ready: the
security migration, live RLS/storage, device (PWA/camera), and deployment checks
above remain owner/device actions.
