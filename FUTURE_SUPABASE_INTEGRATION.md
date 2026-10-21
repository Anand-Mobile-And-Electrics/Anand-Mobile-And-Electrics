# FUTURE SUPABASE INTEGRATION — Anand Mobile & Electrics

**Purpose:** consolidated, owner-gated plan for moving the local/demo build to
controlled Supabase staging and then live operation.

**Execution status:** **Nothing was executed.** No SQL, migration, `supabase db
push`, seed, storage change, deployment, live test, or other remote state change
was performed while preparing this plan. Migrations and application code were
not modified.

## 1. Owner approval checklist

The owner must approve each numbered item in order and record the date, operator,
target environment, and redacted evidence. An unchecked item is a stop.

1. [ ] Confirm the intended Supabase project, branch/database, organization,
   deployment target, and environment (`local`, `staging`, or `production`).
2. [ ] Confirm a tested backup/restore point exists before any remote write.
3. [ ] Approve the read-only inspection session and its identities/roles.
4. [ ] Approve the local disposable Supabase migration rehearsal and review its
   schema, function, trigger, RLS, and storage diff.
5. [ ] Resolve remote/repository migration drift and duplicate-object risks.
6. [ ] Approve the timestamp-ordered migration set, including role hardening;
   approve the public catalog separately (it is not a migration).
7. [ ] Approve the exact modifying commands and their effects in §5 immediately
   before execution; no unlisted command is authorized by this document.
8. [ ] Confirm the environment variable names in §4 are configured without
   recording values, and confirm no service-role key is browser-exposed.
9. [ ] Approve synthetic test identities for owner, manager, assigned and
   unassigned technician, inactive, no-profile, and signed-out cases.
10. [ ] Approve the live-test gate and redacted evidence format in §7.
11. [ ] Approve staging browser/PWA/device checks, including HTTPS, camera,
    barcode, uploads, offline shell, and retry behavior.
12. [ ] Approve production deployment only after every gate passes and all stop
    conditions are cleared.

## 2. Current boundary and readiness

- `src/services/repairs.ts`, `src/services/inventory.ts`,
  `src/lib/supabase.ts`, and `src/contexts/AuthContext.tsx` define the live
  boundary. With `VITE_DEMO_MODE=true`, repairs/inventory and auth use synthetic
  in-memory adapters; unset/false selects Supabase.
- Demo mode proves UI flows only. It cannot prove Auth, RLS, RPC atomicity,
  Storage privacy, persistence, concurrency, or database triggers. A live error
  must never silently fall back to demo data.
- Live operation depends on Auth-linked profiles, database-generated job
  numbers/completion timestamps, append-only repair history, `adjust_stock`,
  private repair photos with signed URLs, and the approved role policies.
- Product images are intentionally expected to be public; repair photos are
  expected to remain private. This privacy boundary requires owner acceptance.
- The product-image upload is not atomic with the product-row update and may
  leave an orphan. Repair-photo metadata failure attempts cleanup; cleanup
  failures require reconciliation. These are release gates, not demo guarantees.

## 3. Strict operation separation

### Read-only inspection (no state change)

Only these activities are inspection: reading repository files; `npm run build`,
`npm run test`, and `npm run lint`; reviewing migration files; local disposable
rehearsal; and remote `SELECT`/metadata queries. Remote inspection may read
migration history, tables, routines, triggers, RLS/policies, storage bucket
configuration, and catalog-view grants. Do not use synthetic inserts, updates,
deletes, uploads, RPC calls, signups, or deployment as “inspection.”

The review SQL in `SUPABASE_INTEGRATION_REVIEW.md` is the approved read-only
baseline. Capture redacted results only. Confirm tables, functions, triggers,
RLS flags/policies, `product-images` and `repair-photos`, and any
`public_catalog` view/grants.

### Modifying operations (owner approval required)

Applying migrations, creating or promoting accounts, changing Auth settings,
creating buckets/policies/views, calling `adjust_stock`, inserting test data,
uploading objects, deploying to Vercel, changing environment variables, and
running any write-based test are modifying operations. Each needs explicit
approval immediately before the command and must be logged with its effect.

## 4. Environments and configuration

Use names only; never put secret values in this plan, logs, bundles, or commits.

- **local:** disposable local Supabase rehearsal; `VITE_DEMO_MODE=true` may be
  used for UI-only work.
- **staging:** isolated Supabase project/branch and HTTPS deployment with
  synthetic identities and `VITE_DEMO_MODE` unset/false.
- **production:** approved live project and Vercel deployment; `VITE_DEMO_MODE`
  unset/false; no open public signup unless separately approved.

Frontend/build names: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
`VITE_DEMO_MODE`. Test-process names: `SUPABASE_URL`, `SUPABASE_KEY`,
`TEST_OWNER_EMAIL`, `TEST_OWNER_PASSWORD`, `TEST_MANAGER_EMAIL`,
`TEST_MANAGER_PASSWORD`, `TEST_TECH_EMAIL`, `TEST_TECH_PASSWORD`. Keep test
values in ignored environment configuration only. Never use a service-role key
in Vite variables or browser code. Sanitize/remove fallback connection material
from `test_supabase.mjs` before distribution and rotate anything exposed in
history.

## 5. Controlled command register (effect before execution)

The owner must approve the command and effect as a pair. These commands are
examples of the only planned modifying steps; do not execute them as part of
this document review.

| Command/action | Effect if executed |
|---|---|
| `supabase link --project-ref <approved-ref>` | Associates the local CLI with the selected remote project; changes local CLI linkage, not schema. |
| `supabase db push` | Applies pending timestamped migrations to the linked database; changes tables, functions, triggers, RLS, and storage configuration. Run only after drift review and backup. |
| Create/invite approved synthetic Auth users | Creates remote Auth identities and potentially profile-trigger rows. Use only staging/test identities. |
| Approved write-based live-test SQL/RPC/storage actions | Creates or changes synthetic rows, audit history, stock, or objects to prove behavior; clean up only with an owner-approved, recorded action. |
| Add a separately approved public-catalog migration | Creates `public.public_catalog` and grants only its approved read surface; must not grant anon access to base `products`. |
| Configure Supabase Auth site/redirect URLs | Changes accepted authentication origins for the named environment. |
| Set Vercel environment variables and deploy | Makes the selected build target use the named Supabase environment and publishes application assets. |
| Promote the previous Vercel deployment | Restores the prior application version without reverting database state. |
| Restore the approved Supabase backup | Replaces database state with the selected restore point; destructive and requires owner confirmation of data loss scope. |

Migration order: profiles/auth foundation; categories; brands; products; stock
movements; stock RPC; product-image storage; Phase 3 schema; Phase 3 logic;
role hardening `20261011000000_harden_handle_new_user_role.sql`. Inspect the
duplicate `set_updated_at()` definition before applying. Keep
`supabase/proposed/public_catalog_REVIEW_ONLY.sql` outside this sequence until
separately approved.

## 6. Exact stop conditions

Stop immediately, do not continue to the next migration or claim readiness, and
preserve redacted evidence if any condition occurs:

- **Migration failure:** any migration errors, timeout, transaction rollback,
  unexpected schema diff, duplicate/non-idempotent policy or trigger conflict,
  unresolved ledger drift, incompatible existing data/constraints, or a function
  replacement whose behavior is not reviewed. Do not retry blindly.
- **Role escalation:** any signup/invite can create owner/manager metadata, a
  technician can elevate itself, an inactive/no-profile user reaches staff data,
  or the hardened signup trigger is absent/mismatched. Revoke/disable the test
  path and stop; do not use the insecure prior rollback.
- **RLS failure:** any anonymous protected read succeeds; any technician sees or
  mutates an unassigned repair, another customer's/device/photo data, forbidden
  inventory action, direct stock, job number, completion, or history mutation
  succeeds; or RPC grants/signature/atomicity differ from approval. Stop all
  live tests and do not proceed to deployment.
- **Storage exposure:** `repair-photos` is public, an unauthorized/wrong-path
  signed URL or upload succeeds, product-image visibility is not owner-approved,
  service credentials are exposed, cleanup leaves uncontrolled orphan objects,
  or a failed upload is reported as full success. Stop uploads and deployment.
- **PWA/device gate:** missing manifest/worker/chunks/deep route, private data in
  Cache Storage, duplicate/silently queued offline mutation, unsafe camera
  fallback, wrong barcode, or broken mobile layout/lifecycle. Mark NOT VERIFIED
  and stop staff enablement.

## 7. Live-test gates and evidence

Run only in staging first with synthetic data; record `PASS`, `FAIL`, `NOT
VERIFIED`, or `OWNER ACTION REQUIRED`, environment, build revision, role, and
redacted result—never credentials or secret values.

1. **Build gate:** `npm run build`, `npm run test`, `npm run lint`; publish the
   generated PWA precache/route assets and retain results.
2. **Schema gate:** read-only checks match approved migrations, dependencies,
   function signatures, triggers, grants, RLS on every relevant table, and
   private/public bucket intent.
3. **Auth/role gate:** session restore/expiry/sign-out, profile lookup, route
   guard, owner/manager/technician isolation, inactive/no-profile denial, and
   hardened signup behavior.
4. **Workflow gate:** catalog reads/writes; direct stock denial; valid and
   invalid `adjust_stock` atomic behavior; repair creation/assignment/status;
   generated job/history/completion behavior; retry without duplicate mutation.
5. **Storage gate:** assigned repair photo upload and signed URL; wrong repair,
   MIME/size, unauthorized path, metadata failure cleanup; product-image policy.
6. **PWA gate:** HTTPS install, deep routes, physical Android and desktop
   browser, camera denial/manual barcode fallback, upload failures, offline shell,
   no private cached responses, reconnect/retry, and no duplicate writes.
7. **Release gate:** Vercel production variables identify production, demo mode
   is absent/false, no service-role/test credential is bundled, Auth origins are
   correct, and the owner signs the complete matrix.

## 8. Rollback and recovery

Before writes, preserve the backup/restore point, migration ledger, policy and
storage definitions, and object inventory. Prefer a forward corrective migration
over ad hoc destructive reversal. If application deployment fails, promote the
previous Vercel deployment; this does not roll back database changes. If schema
recovery is required, stop writes, obtain owner confirmation, and restore the
approved Supabase backup with its known data-loss scope.

Catalog rollback may revoke view grants and drop only `public.public_catalog`;
never cascade into base tables. Do not use the insecure pre-hardening role
rollback. Treat dropping Phase 3/products, changing storage buckets, or removing
policies as destructive: preserve objects and test restore first. Reconcile
orphan product/repair objects and inspect committed server state before retrying
timed-out stock/status operations; never issue an automatic compensating stock
adjustment.

## 9. Explicit non-execution statement

This is a plan, not an execution record. **Nothing was executed:** no remote
inspection, remote modification, migration, test write, account change,
storage operation, deployment, or rollback was performed in preparing or
consolidating this document.
