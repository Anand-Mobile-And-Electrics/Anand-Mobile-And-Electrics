# Website Integration Readiness

**Scope:** `02 - Website/Customer Website/Source Code` (read-only review of application interfaces and environment integration). No remote actions were performed and no application modules were changed.

## Executive summary

The site has two explicit runtime paths:

- **Demo path:** `VITE_DEMO_MODE=true` selects deterministic in-memory adapters for repairs and inventory and injects a synthetic Owner session. It is suitable for UI/local workflow demonstrations only.
- **Live path:** unset/false `VITE_DEMO_MODE` uses the browser Supabase client for Auth, Postgres, Storage, and database RPCs. It is the required path for real staff accounts, authorization, persistence, concurrency, and private media.

The service boundary is reasonably clear (`src/services/repairs.ts`, `src/services/inventory.ts`, `src/lib/supabase.ts`, and `src/contexts/AuthContext.tsx`). The main readiness gate is operational: production must have the correct public runtime variables, the approved migrations/storage/RLS configuration, and authorized role accounts. The existing source also includes a standalone connection-test script with connection material; it should be treated as sensitive operational material and removed or sanitized before distribution. This document intentionally does not reproduce any value.

## Interfaces and services used

| Area | Interface/service | Runtime contract |
|---|---|---|
| Browser client | `@supabase/supabase-js` via `src/lib/supabase.ts` | Creates one client from Vite-exposed URL and publishable/anon key. Never place a service-role key in frontend variables. |
| Authentication | `supabase.auth.getSession`, `onAuthStateChange`, `signInWithPassword` (`src/contexts/AuthContext.tsx`, `src/pages/admin/Login.tsx`) | Restores/listens for sessions, signs staff in/out, and loads `public.profiles.role`. |
| Repairs data | `src/services/repairs.ts` | CRUD/search/pagination over `repairs`, `customers`, `devices`, `profiles`; reads `repair_history`; status/notes updates. |
| Repair media | Supabase Storage bucket `repair-photos` plus `repair_photos` table | Uploads compressed images, records metadata, and obtains short-lived signed URLs. Bucket is expected to remain private. |
| Inventory data | `src/services/inventory.ts` | Reads `categories`, `brands`, and `products`; creates products and looks up barcodes. |
| Stock control | Supabase RPC `adjust_stock` | Applies validated stock movements atomically; the client then rereads the product. |
| Product media | Supabase Storage bucket `product-images` | Uploads/upserts product image and stores its public URL/path on `products`. Confirm bucket visibility matches the approved deployment policy. |
| Demo adapters | `src/data/demoRepairs.ts`, `src/data/demoInventory.ts` | In-memory synthetic records; no live database calls when selected. State resets with the process/module lifecycle. |
| PWA/deployment | Vite, Vercel SPA rewrite, service worker | Static shell/assets are deployable; cross-origin Supabase/private data must not be considered offline-cached. |

## Required environment variables

### Frontend/build variables

| Variable | Required when | Purpose | Secret handling |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Live/demo builds that initialize the client | Supabase project API URL | Public configuration, but must identify the intended environment. Do not document its concrete value here. |
| `VITE_SUPABASE_ANON_KEY` | Live builds | Browser publishable/anon credential | Not a privileged secret, but keep values out of source control and this document. Never substitute a service-role key. |
| `VITE_DEMO_MODE` | Optional | Exact value `true` selects demo adapters; unset/false selects live services | Use only in local/demo deployment configuration; do not enable in production. |

### Test/script-only variables

The README documents throwaway test-account variables for the live test matrix (`TEST_OWNER_EMAIL`, `TEST_OWNER_PASSWORD`, `TEST_MANAGER_EMAIL`, `TEST_MANAGER_PASSWORD`, `TEST_TECH_EMAIL`, `TEST_TECH_PASSWORD`). Keep them in an ignored test environment only; never put credentials in markdown, logs, browser bundles, or commits.

The standalone `test_supabase.mjs` uses separate process environment names (`SUPABASE_URL` and `SUPABASE_KEY`). Prefer one documented, sanitized test harness and process environment variables; inspect/remove any embedded fallback connection material before sharing or deploying the repository.

## Production versus demo separation

| Concern | Demo | Production/live |
|---|---|---|
| Data source | In-memory synthetic repair/inventory adapters | Supabase Postgres and Storage |
| Identity | Synthetic `demo-owner` / Owner role | Supabase Auth session and `profiles.role` |
| Persistence | Local process/module state; not business data | Durable database records and storage objects |
| Authorization | UI can exercise Owner workflows; no real RLS proof | Postgres RLS, storage policies, triggers, and RPC are the security boundary |
| Stock/repair invariants | Adapter behavior only | DB-generated job numbers, controlled completion timestamps, append-only history, atomic stock RPC, negative-stock protection |
| Media | Synthetic adapter result | Real uploads, metadata rows, private repair-photo signed URLs |
| Failure interpretation | Useful for deterministic UI tests | Must surface actual auth/network/RLS/storage errors; live failures must never silently fall back to demo data |

Switching to live is an environment/deployment decision, not a data migration: set `VITE_DEMO_MODE` absent/false, provide the intended Supabase URL and publishable key, and ensure the target database has the approved migrations and policies. The demo flag is evaluated in the data/auth layer, so production configuration should be checked in the built artifact/deployment environment before release.

## Features that require live Supabase

These cannot be certified by demo mode:

1. Real sign-in, session restoration, password handling, logout, and role lookup.
2. Role isolation between Owner, Manager, Technician, and anonymous users (RLS/policy behavior).
3. Durable repair/customer/device records, server-side search, pagination, assignments, and status history.
4. DB-generated job numbers and trigger-controlled `completed_at` values.
5. Append-only `repair_history` and audit identity (`changed_by`).
6. Atomic/concurrent stock changes through `adjust_stock`, including no-negative-stock enforcement.
7. Storage policy behavior for private repair photos, signed URL expiry, upload rollback, and technician assignment boundaries.
8. Product image persistence and the intended public/private behavior of `product-images`.
9. Cross-session consistency, multi-user updates, and recovery from expired sessions/network failures.

Public marketing pages, service descriptions, contact `mailto` composition, routing, static assets, and basic UI validation can be exercised without live Supabase. The public Products page remains a deferred/coming-soon surface rather than proof of a live public catalog.

## Synthetic integration test scenarios

These scenarios use synthetic records and test accounts only. Expected outcomes describe the readiness contract; execution against a real Supabase project requires owner authorization and is not claimed here.

| ID | Setup/action | Expected outcome |
|---|---|---|
| D1 | Build/run with `VITE_DEMO_MODE=true`; open admin dashboard, repairs, and inventory. | Synthetic Owner session appears; pages load without Supabase calls; data is visibly marked/demo-scoped; mutations affect only in-memory data. |
| D2 | In demo mode create a synthetic customer/device/repair, change status, add notes, and inspect history. | Validation works; status/history reads reflect the adapter contract; restarting/resetting does not imply durable persistence. |
| D3 | In demo mode create a product, find it by normalized barcode, adjust stock, and upload a synthetic image. | Duplicate/invalid stock rules are enforced by the adapter; synthetic result is returned without a network or real storage write. |
| L1 | Live configuration with valid schema; sign in as each authorized role. | Session restores, role loads from `profiles`, and each role sees only its permitted staff workflows. |
| L2 | Anonymous live browser requests `/admin` and attempts protected reads. | Redirect/login boundary is enforced and RLS denies protected data; no staff content is disclosed. |
| L3 | Owner/manager create a customer, device, and repair; technician views assigned repair. | Rows persist; device/customer relation is valid; job number is DB-generated; technician sees assigned work only. |
| L4 | Search repairs using synthetic name, phone, device, job number, and punctuation/wildcards. | Sanitized search returns only authorized matches; empty/invalid terms do not broaden the query; pagination/counts remain consistent. |
| L5 | Change a repair through statuses, including `completed`, then read history. | Authorized transition persists; `repair_history` is append-only and records actor/time; `completed_at` is DB-controlled. |
| L6 | Attempt direct client stock mutation and then call `adjust_stock` with valid/invalid/overselling quantities. | Direct protected mutation is rejected; valid RPC updates atomically; invalid or negative-resulting adjustment fails without corrupting stock. |
| L7 | Upload a synthetic repair photo, request a signed URL, let it expire, and force metadata failure. | Upload and metadata are linked; signed URL grants temporary access only; failed metadata insert removes the just-uploaded object where permitted. |
| L8 | Technician requests another technician's repair/photo; anonymous requests storage objects. | RLS/storage policies deny access; no private photo or unrelated repair data is returned. |
| L9 | Disable network while viewing a visited PWA route and submit a write; reconnect. | Cached shell/route code may render, but private Supabase data is not served from cache; write visibly fails and normal live operation recovers after reconnect. |
| L10 | Build with production configuration and inspect generated client/runtime configuration. | No demo banner/session is present; only intended public Supabase configuration is bundled; no service-role credential or test password is present. |

## Release gates and evidence still needed

- Run build, lint, and unit tests from the repository; record results separately from live verification.
- Owner-authorized live checks must confirm migrations, RPC grants/ownership, RLS policies, storage buckets/policies, signup posture, and role matrix.
- Verify Vercel has the two frontend variable names with production values and demo mode disabled/unset.
- Verify browser/PWA, camera/barcode, upload failure, and offline recovery behavior on staging HTTPS; local builds do not prove device behavior.
- Before release, sanitize/remove the standalone connection test's fallback connection material and rotate any value that was exposed in source history.

**Readiness conclusion:** the application has a viable integration seam and a useful synthetic demo path. It is ready for owner-authorized staging integration checks, but production readiness is contingent on live Supabase schema/security validation and cleanup of connection material in the standalone test script.
