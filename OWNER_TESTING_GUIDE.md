# OWNER TESTING GUIDE — Anand Mobile & Electrics

Follow these in order. For each step: do the action, compare to **Expected**, then
record PASS/FAIL in `OWNER_TEST_RESULTS.md`. Obey every **STOP** condition.

Reference: `FINAL_MULTI_AGENT_AUDIT.md`. Project dir:
`02 - Website/Customer Website/Source Code`.

> Safety: never paste passwords, keys, tokens, or customer data into chat. Use
> only clearly-labelled TEST records. Public signup must stay OFF until step 3.

---
## GROUP 1 — Locally verified (you can re-run to confirm; no DB/device needed)
These already pass; re-run only if you want to confirm the working tree.

**L1 — Build & tests.** In the project dir:
`npm install` then `npm run build` then `npm run test`.
Expected: build succeeds; `11/11` tests pass. STOP if build fails — report output.

**L2 — Lint.** `npm run lint`.
Expected: 0 errors (warnings OK).

---
## GROUP 2 — Live database / security (Supabase; owner-run)
These change or read the live DB. Read-only vs write is marked. Use the SQL editor.

**D1 — Confirm public signup is OFF (read-only, dashboard).**
Authentication → Sign In / Providers → "Allow new users to sign up".
Expected: **disabled**. STOP and keep it disabled until D3 is applied if you find it ON.

**D2 — Read-only pre-migration inspection (READ-ONLY SQL).**
```sql
-- current trigger body (shows role taken from metadata)
select prosrc from pg_proc where proname = 'handle_new_user';
-- function owner + security + search_path
select proname, pg_get_userbyid(proowner) as owner, prosecdef, proconfig
from pg_proc where proname = 'handle_new_user';
-- existing roles (confirm before/after)
select id, role from public.profiles
where id in ('cbc03a47-bfaa-47cc-b55a-dd47b533107e',   -- owner
             '3b44db6a-a107-40b0-906e-2231ae0d64cc');  -- manager
```
Expected: body uses `COALESCE(... ->>'role','technician')`; owner is a trusted role;
profiles show owner=`owner`, manager=`manager`.

**D3 — Apply the hardening migration (MODIFIES DB — needs your approval).**
File: `supabase/migrations/20261011000000_harden_handle_new_user_role.sql`.
Run `supabase db push`, OR paste that file's `create or replace function...` block into the SQL editor.
Expected: applies with no error. Re-run the first query in D2 → body now assigns literal `'technician'`.

**D4 — Controlled role-escalation test (MODIFIES DB — creates one throwaway user).**
With a throwaway email, from a small script or the app signup, call
`supabase.auth.signUp({ email, password, options: { data: { role: 'owner' } } })`,
then repeat conceptually with `manager`, an invalid value, and none.
Check: `select id, role from public.profiles order by created_at desc limit 1;`
Expected: role = **`technician`** every time. STOP + revert (rollback block in the migration) if any is not `technician`.
Cleanup: delete the throwaway user (Authentication → Users) and its profile row.

**D5 — Verify existing accounts unchanged (READ-ONLY).** Re-run the profiles query from D2.
Expected: owner=`owner`, manager=`manager` — unchanged by D3/D4.

**D6 — Live RLS / storage matrix (authenticated clients, NOT service-role).**
Using the authorized Owner and Manager logins (never the service-role key): confirm anon
cannot read `repairs`/`customers`/`profiles`; a Manager cannot write any `profiles` row;
repair-photo signed URLs work only for authorized repairs; `products` is not anon-readable.
Expected: all enforced. (This mirrors the prior 20/20 matrix; re-run after D3.)

---
## GROUP 3 — Physical device / browser (cannot be automated here)
**P1 — PWA install (Chrome, Windows PC).** `npm run build && npm run preview`, open the
printed localhost URL. Expected: Chrome offers **Install**; it opens in its own window.
STOP + report if Install is not offered (note Chrome version).

**P2 — Offline + reconnect.** With the installed app open online once, go offline, reload a
visited route. Expected: app **shell** renders with empty/loading/error states and **NO real
private data** from cache. Reconnect → recovers. STOP + report immediately if real repair/
customer/inventory data appears offline.

**P3 — Android staff PWA.** Open the site on an Android phone (Chrome) → Install to home
screen. Sign in. Expected: role-aware admin loads.

**P4 — Barcode + camera + photo (Android).** In Inventory, grant camera, scan an existing
product's barcode. Expected: opens that product's **stock-adjust** flow (NOT a new/duplicate
product). Try manual entry for a no-barcode item. In a repair, capture/upload a photo.
Expected: image uploads and is viewable; a failed upload shows an **error**, never "success".
Do not record PASS unless actually performed on the phone.

---
## What to send me, and when to stop
- After GROUP 2: paste the (non-secret) query outputs / PASS-FAIL — I'll interpret.
- If any STOP triggers (signup ON after D3, a non-`technician` escalation result, real data
  shown offline), halt that workstream and send me the exact output; I'll prepare a fix.
- Tell me when you authorize deployment (separate approval) — only then do I deploy + smoke-test.
- Provide: which steps PASS/FAIL, any error text (secrets removed), Chrome/Android versions.

Separation of evidence: GROUP 1 = locally verified; GROUP 2 = live-database (owner-run);
GROUP 3 = physical-device (owner-run). Do not mark the project production-ready until
GROUP 2 and GROUP 3 pass and deployment is verified.
