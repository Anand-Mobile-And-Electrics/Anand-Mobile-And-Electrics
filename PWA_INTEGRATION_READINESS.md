# PWA / mobile integration readiness

## Scope and decision

This review covers the installable PWA shell, `public/manifest.webmanifest`, `public/sw.js`, build-time precaching, the authenticated mobile admin routes (inventory and repairs), camera/barcode handling, product and repair-photo uploads, and the checked-in automated tests.

**Decision: conditionally ready for controlled browser/device testing; not signed off for live mobile operations.** The application has an explicit offline shell and an explicit boundary around Supabase data, but installability, offline behavior, camera permissions, barcode decoding, photo capture/upload, and the deployed Supabase policy/configuration still require verification on an owner's device and a test project. This review performed no remote actions and used no credentials.

## Environment and configuration requirements

### Build/runtime

* Build with the repository's Node/npm toolchain and run `npm run build`; the build must emit `dist/precache-manifest.js` and the route chunks consumed by `sw.js`.
* Deploy over HTTPS for a real device. `localhost` is suitable for local preview, but an insecure remote origin will not satisfy browser camera/PWA requirements.
* Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the target project. Only the publishable/anon key belongs in browser configuration; never place a service-role key in source, Vite variables, or this document.
* Leave `VITE_DEMO_MODE` unset/false for integration evidence. Demo mode is an in-memory synthetic adapter and cannot prove Auth, RLS, Storage, RPC, or mobile network recovery.
* Configure the target Auth site/redirect URLs for the deployed origin. Use throwaway synthetic staff identities for testing, with owner, manager, assigned technician, unassigned technician, inactive, no-profile, and signed-out cases as applicable.
* Apply and verify the intended Supabase migrations, including the private `repair-photos` bucket and the role/RLS/RPC definitions. A successful UI load alone is not evidence that deployed policies match the checked-in migrations.
* Preserve the SPA rewrite (`vercel.json`) so `/admin` and deep repair routes load when opened from an installed app or a browser refresh.

### PWA assets and registration

* The manifest starts at `/admin`, uses standalone portrait display, and references the checked-in 192px, 512px, and maskable icons.
* Production startup registers `/sw.js`; development does not register it.
* `sw.js` imports the generated `/precache-manifest.js`. A deployment must publish both files at the site root. An old service worker may need to be updated/removed during testing when validating a new build.

## What is live-Supabase dependent

The following cannot be proved by unit tests or demo mode and must be run against a disposable/staging Supabase project with synthetic records:

* sign-in, session restore after refresh/reopen, expiry/sign-out, profile role lookup, and access denial;
* inventory catalog reads, barcode lookup, product creation, stock adjustment through `adjust_stock`, duplicate/invalid input handling, and product-image Storage upload;
* repair/customer/device visibility and role/assignment isolation;
* repair status/notes writes, database-generated job/history/completion behavior;
* repair-photo upload, private bucket access, signed URL generation, metadata RLS, and orphan cleanup when metadata insert fails;
* retry/error behavior when connectivity or the session is interrupted during reads, RPCs, or uploads.

The browser role filter is only usability. RLS, Storage policies, Auth, and RPC authorization are the security boundary. Do not approve a technician workflow based only on hidden buttons or a successful demo run.

## Private-data caching guarantees and limits

The checked-in service worker provides these code-level guarantees:

* only same-origin `GET` requests are handled;
* cross-origin requests (including Supabase API and Storage), all non-GET requests, Auth traffic, uploads, and signed-URL requests are passed directly to the network;
* navigation is network-first and falls back to cached `/index.html` when offline;
* only filename-matched static assets (`js`, `css`, images, fonts, etc.) are cached; HTML responses, staff routes, and data endpoints are not cached;
* the precache is an app shell/route-asset cache, not a database or offline queue.

Therefore the intended guarantee is **no private Supabase response or signed photo URL is deliberately stored in Cache Storage by this service worker**. It does not guarantee that the browser, Supabase client, OS, screenshots, download manager, or another extension retains no data. It also does not make mutations durable offline: stock changes, repairs, and photo uploads require network and must show an error/retry state when unavailable. Offline reload may render the shell and previously cached route code, but it must not be described as an offline staff-data mode.

## Mobile admin UI readiness observations

* `/admin/inventory` supports manual barcode entry and `html5-qrcode` camera scanning. It stops/clears the scanner on decode, explicit stop, and component unmount; permission/start failures provide manual-entry fallback messaging.
* Product photos are selected from a file input, previewed locally, compressed before upload, and uploaded after the product row is created. A product can therefore exist if its image upload fails; the UI reports that partial result.
* Repair photos are compressed client-side, uploaded to `repair-photos`, then recorded in `repair_photos`; a metadata failure attempts to remove the just-uploaded object. The bucket is intended to be private and accessed with signed URLs.
* The UI is responsive code, but viewport fit, touch targets, camera orientation, browser permission prompts, backgrounding, and installed-standalone behavior remain physical-device checks.

## Automated and synthetic checks

Run from this Source Code directory:

```text
npm run build
npm run test
npm run lint
```

The existing `src/pwa.test.ts` checks real manifest icon files, service-worker safeguards (`GET`, same-origin, static assets, navigation fallback), and generated precache/route assets. Existing service/data tests cover synthetic inventory and repair behavior. These are useful regression checks, but they do not exercise a browser service-worker lifecycle, camera hardware, Storage, Auth, RLS, or a real network transition.

Use this synthetic matrix without real customer data:

| Check | Setup/action | Expected result |
|---|---|---|
| Shell/install | Production build served over HTTPS; visit `/admin` online | Manifest/icons load, worker activates, browser offers install, installed app opens standalone at `/admin`. |
| Offline shell | Visit admin routes online, then disable network and reload a visited route | Shell/route assets render; data is empty/loading/error as appropriate; no private records appear from Cache Storage. |
| Recovery | Restore network and retry a failed read | Auth/data reload normally; no duplicate mutation is created. |
| Barcode | Synthetic product with known barcode; scan, then manually enter same value | Existing product opens; no duplicate product is created; manual fallback works. |
| Camera denial | Deny camera permission or use a browser without camera access | Clear fallback message; manual barcode entry remains usable; camera stream is stopped. |
| Product photo | Create synthetic product with a sample image, then force/observe upload failure | Product and image outcomes are accurately reported; no false full-success message. |
| Repair photo | Upload a synthetic image to an assigned repair, view via signed URL, then test metadata/policy failure | Compression and signed access work; unauthorized repair/path is denied; failed metadata attempts cleanup. |
| Mobile lifecycle | Rotate/background/foreground, refresh, and navigate away while scanning/uploading | No leaked camera stream, broken layout, stale success state, or duplicate action. |

Record each result as `PASS`, `FAIL`, `NOT VERIFIED`, or `OWNER ACTION REQUIRED`, including browser/device/OS, build revision, and whether the run used demo or staging. Do not record credentials or secret values.

## Device-gated stop conditions

Stop the test and do not claim readiness if any of the following occurs:

* the installed app opens a blank page, cannot load a deep route, or the manifest/worker/chunks are missing;
* offline mode displays a previously cached private record, signed photo, or other authenticated response;
* a failed network mutation is reported as successful, is silently queued without an explicit product requirement, or is duplicated after retry;
* camera permission denial has no safe manual fallback, scanning leaves the camera active after leaving the page, or a barcode opens/creates the wrong product;
* photo capture/upload exposes a private repair object publicly, bypasses assignment/RLS, leaves uncontrolled orphaned objects, or shows false success;
* a technician can read or mutate an unassigned repair, forbidden inventory action succeeds, or a no-profile/inactive/signed-out user reaches staff data;
* testing requires production customer data, real credentials in logs, service-role browser exposure, or an unapproved migration/remote action;
* the required owner device/browser check has not been completed. Code inspection and local unit tests are insufficient evidence for install, offline, camera, barcode, or photo readiness.

## Remaining owner action

Run the matrix on at least one supported physical Android device and one desktop browser, against a disposable/staging Supabase project, then attach only redacted results. Resolve all stop conditions and confirm the deployed migration/policy revision before enabling the PWA for staff operations.
