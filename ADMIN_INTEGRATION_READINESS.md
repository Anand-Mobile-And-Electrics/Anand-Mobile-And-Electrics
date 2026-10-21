# Admin integration readiness

## Scope and conclusion

Reviewed the integrated staff UI under `src/pages/admin`, `src/components/admin`, `src/contexts/AuthContext.tsx`, the inventory/repairs services, and the checked-in Supabase migrations. The UI is wired to a real Supabase client by default, with an explicit in-memory demo adapter when `VITE_DEMO_MODE=true`. The browser role checks are useful for usability, but the security boundary is Supabase Auth plus database/storage RLS and RPC authorization. A live integration sign-off still requires the verification scenarios below against the deployed project; this review did not connect to Supabase or execute remote actions.

## Auth, session, and role dependencies

### Browser flow

* `App.tsx` wraps all routes in `AuthProvider`; `/admin/login` is public and all `/admin/*` routes are nested under `AdminLayout`.
* `AuthContext` restores the session with `supabase.auth.getSession()` and subscribes to `onAuthStateChange`. It fetches `profiles.role` for the authenticated user's UUID using `.single()`.
* `AdminLayout` waits for `isLoading`, redirects a missing session to `/admin/login`, and permits only `owner`, `manager`, or `technician`. A missing/invalid profile produces “Staff profile unavailable” and a logout action.
* Login uses `signInWithPassword`; successful auth is expected to produce the auth event and role lookup. Sign-out calls Supabase `auth.signOut()` and clears local state.
* Demo mode bypasses Supabase entirely, creates a synthetic owner session, and routes service calls to session-only in-memory data. It must never be used as evidence that live auth/RLS works.

### Database prerequisites

* `auth.users` must have a matching `public.profiles` row with a valid role and (normally) `active=true`.
* `profiles` has RLS: a user can read their own row; owners/managers can read staff; only owners can write profiles.
* `get_auth_role()` is a `SECURITY DEFINER` helper used by most policies and RPCs. Its deployed definition and function permissions must match the migrations.
* The user-creation trigger creates a default technician. `20261011000000_harden_handle_new_user_role.sql` is explicitly staged for review, so verify whether it has actually been applied before relying on its protection against client-supplied role metadata.
* The UI does not check `profiles.active`; confirm that inactive users are prevented by deployed policies or add that requirement to the operational process.

## Role-aware UI versus the real RLS boundary

### UI-only affordance filtering

* Inventory hides product creation for technicians and hides all stock types except `used_for_repair`.
* Navigation is identical for all accepted roles; Dashboard links, Repairs, repair detail status/notes controls, and the new-repair route are not role-filtered in React.
* Therefore a technician can still open routes directly or submit calls from the browser. UI hiding is not authorization.

### Expected enforced boundary

* Product/category/brand writes and product-image writes should be owner/manager-only; product/catalog reads are authenticated reads according to the phase-2 migrations.
* `adjust_stock` is the authoritative stock mutation. Verify its deployed signature matches the client call (the client supplies four named parameters) and that it rejects unauthorized roles/types, negative/invalid quantities, and insufficient stock.
* Repairs, customers, and devices are owner/manager-wide; technicians should see and mutate only assigned records, with insert assignment constrained to `auth.uid()`.
* Repair history is read-only to clients and appended by the database trigger. Repair status changes should create history and manage `completed_at`; clients must not be able to set job numbers or `completed_at` directly.
* Repair photo metadata and the private `repair-photos` bucket should be owner/manager-wide, technician-assigned only, and path-bound to the repair. Signed URLs—not public URLs—are required for repair photos.
* Product images intentionally use a public bucket/read URL; verify that this is acceptable for catalog imagery and that only owner/manager writes are allowed.

## Environment and deployment requirements

Required at build/runtime:

* `VITE_SUPABASE_URL`: the target Supabase project URL.
* `VITE_SUPABASE_ANON_KEY`: the publishable/anon key for that same project. Never put service-role keys in Vite variables or browser code.
* Optional `VITE_DEMO_MODE=true` only for synthetic local work; leave unset/false for live integration.

The target project must have the migrations applied in dependency order: profiles, phase-2 catalog/inventory/storage migrations, then phase-3 repair schema/logic. Confirm the `repair-photos` bucket is private, `product-images` has the intended public-read policy, all tables have RLS enabled, and the deployed RPC/function signatures match source. Configure Auth redirect/site URLs for the deployed origin and use invited staff accounts rather than relying on open registration.

## Live Supabase behaviors to verify (read/write test account matrix)

Use separate owner, manager, technician-assigned, technician-unassigned, inactive, no-profile, and signed-out test identities. Use synthetic records only. Record the project migration revision, role, request result, and whether any data was returned.

1. **Session lifecycle:** sign in, hard refresh, close/reopen the tab, expire/revoke the session, and sign out. Expected: loading resolves; refresh restores the same user/role; expiry returns to login; sign-out clears access.
2. **Profile lookup:** valid profile loads its role; no-profile and invalid-role users reach access denied; profile lookup failure does not grant access.
3. **Role escalation:** attempt signup/invite metadata containing an elevated role (where registration is enabled). Expected: new account is least-privilege technician unless an owner promotes it; verify the hardened trigger is deployed.
4. **Catalog reads/writes:** all authenticated staff can read permitted catalog data; technician insert/update/delete of categories, brands, products, and product images is denied; manager can create/update products but cannot delete unless policy permits; owner can perform owner actions.
5. **Stock RPC:** owner/manager allowed stock movements succeed and update both product stock and movement audit; technician can perform only the intended repair-use operation; unauthorized movement types, invalid quantity, and insufficient stock fail atomically. Confirm the client call is compatible with the deployed function signature.
6. **Repair visibility:** owner/manager can list/count/open all synthetic repairs; technician sees only assigned repairs and related customer/device/history/photo rows; unassigned records are absent or denied, not merely hidden by the UI.
7. **Repair writes:** technician can create only an appropriately assigned job, update only permitted assigned fields/status/notes, and cannot reassign or alter identity fields. Owner/manager can assign and update according to policy.
8. **Database invariants:** create a repair and change status. Expected DB-generated `JOB-*`, history entry with authenticated actor, automatic `completed_at` on completion, clearing on reopening, and rejection of direct job/completion manipulation.
9. **Photos:** upload an allowed image on an assigned repair; expected compression, object + metadata row, and signed URL access. Try wrong repair path, disallowed MIME/size, another user's repair, and metadata insert with another uploader; expected denial and no orphaned object after metadata failure.
10. **Error/retry behavior:** revoke network/session during list, upload, RPC, and refresh. Expected visible error/retry, no false success, no demo fallback, and no duplicate repair/photo/stock mutation after retry.

## Synthetic integration scenarios and expected outcomes

| Scenario | Setup/action | Expected outcome |
|---|---|---|
| S1 unauthenticated route guard | Visit `/admin`, `/admin/inventory`, and a repair deep link signed out | Each redirects to `/admin/login`; no staff data request succeeds. |
| S2 valid owner | Sign in as owner and refresh | Dashboard loads owner role; inventory and repairs load; owner writes succeed. |
| S3 valid manager | Sign in as manager; open direct product and repair routes | Staff workspace loads; catalog/repair management allowed by RLS; owner-only profile/delete actions remain denied. |
| S4 assigned technician | Sign in as technician assigned repair A; list/search/open A and B | A is visible and editable within policy; B is not disclosed and direct access fails or returns no row. |
| S5 technician inventory | Search product; attempt each stock type and new product | Read works; only policy-approved repair-use operation succeeds; product creation and forbidden stock types fail server-side. |
| S6 missing profile | Auth user has no profile row | Authenticated session never becomes staff access; access-denied screen appears after role lookup. |
| S7 status audit | Change assigned repair from received to completed | Status write succeeds where policy permits, one history row is added, `completed_at` is set; reopening clears it as designed. |
| S8 photo isolation | Upload to assigned repair, then request another repair's path | Own upload/signed URL works; other repair is denied; metadata failure cleans up the object. |
| S9 stale/repeated actions | Double-click save and retry after a timeout | Buttons prevent duplicate in-flight writes; final DB state has one intended mutation and UI reports the actual result. |
| S10 demo/live separation | Run once with `VITE_DEMO_MODE=true`, once unset against test Supabase | Demo data is synthetic and session-only; live run uses Supabase and reflects RLS. A live failure never silently shows demo data. |

## Readiness decision

**Conditionally ready for controlled integration testing, not live sign-off yet.** The route/session wiring and explicit demo boundary are identifiable, and the migrations document a meaningful RLS model. Sign-off depends on executing the live matrix, confirming migration state (especially the staged role-hardening migration), checking RPC signature compatibility, and proving technician isolation and storage behavior with real Supabase responses. No credentials or secret values are included here.
