# Workflow Integration Readiness

**Scope:** inventory and repair workflows used by the admin pages, their Supabase boundaries, and the demo adapters. This is a readiness review only; no live Supabase calls or remote mutations were performed.

## Executive assessment

The UI has a clear live/demo split through `isDemoMode()`. The demo adapters are deterministic, synthetic, session-only substitutes and do not contact Supabase. The live path is structurally complete for CRUD, stock adjustment, repair history, and photo storage, but deployment readiness depends on the Supabase schema, RLS policies, triggers, storage policies, and the `adjust_stock` RPC matching the contracts below. These backend contracts are not verifiable from the client source alone.

## Live Supabase dependency map

### Inventory (`src/services/inventory.ts`, admin `Inventory.tsx`)

| Workflow | Supabase dependency | Contract / expected behavior |
|---|---|---|
| Category and brand lists | `categories`, `brands` tables | `SELECT *`, ordered by `name`; authenticated admin can read. |
| Barcode lookup | `products` table | Exact trimmed `barcode`, `maybeSingle`; barcode uniqueness should be enforced in the database. |
| Create product | `products` table | Inserts name, nullable barcode/description/category/brand; returns inserted row. RLS permits authorized staff insert. |
| Stock receive/sell/repair/return/damage/adjust | `adjust_stock` RPC | Arguments: `p_product_id`, `p_quantity`, `p_type`, `p_reference`. Must atomically validate product/type/quantity, prevent negative stock, record the movement/audit entry, and update stock. |
| Refresh adjusted product | `products` table | Reads the product after RPC success. A successful RPC followed by a failed read leaves the server committed; the UI must report refresh failure and re-fetch rather than retrying the mutation blindly. |
| Product image | `product-images` storage bucket + `products` update | Uploads `${productId}.${mime-extension}` with `upsert: true`, obtains a **public** URL, then stores `image_url` and `image_storage_path`. Storage and update policies must permit the same staff role. |

### Repairs (`src/services/repairs.ts`, admin Repairs/RepairCreate/RepairDetails pages)

| Workflow | Supabase dependency | Contract / expected behavior |
|---|---|---|
| List/search/counts | `repairs`, `customers`, `devices`, `profiles` | `repairs` embeds customer/device and `profiles!assigned_to`; searches customer/device separately under RLS, then filters repair IDs. Count queries run per status plus total. |
| Repair history | `repair_history` | Read-only from the client; append-only history is expected to be produced by a database trigger on repair creation/status changes. |
| Customer/device lookup | `customers`, `devices` | Search is name/phone; devices are scoped by `customer_id`. RLS must prevent cross-customer disclosure. |
| Create customer/device/repair | `customers`, `devices`, `repairs` | Inserts normalized customer phone and trimmed fields. Repair insert must enforce that the device belongs to the customer (preferably DB FK/trigger/policy), and DB supplies `job_number`, initial status, timestamps, and `completed_at`. |
| Status/notes update | `repairs` | Client updates only `status` or `repair_notes`; DB owns `completed_at`. Status changes should create history rows and set/clear completion consistently. |
| Repair photo list | `repair_photos` | Reads metadata by `repair_id`, newest first. |
| Repair photo upload | `repair-photos` private bucket + `repair_photos` | Compresses client-side, uploads `${repairId}/${uuid}.${ext}`, then inserts metadata. If metadata insert fails, the client removes the just-uploaded object. Policies must authorize both operations. |
| Photo display | private `repair-photos` bucket | Creates a signed URL (default 3600 seconds). The caller should only request paths returned for an authorized repair. |

### Configuration and security boundary

`src/lib/supabase.ts` reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. No secret or service-role credential should be placed in source or documentation. The anon key is a browser client credential; authorization must come from Supabase Auth and RLS, not from the UI/demo role labels.

## Demo adapter coverage and known differences

- `demoInventory.ts` uses synthetic products/categories/brands, rejects duplicate barcodes and negative stock, and uses a data-URL placeholder for images. It has no RPC, audit table, storage, or persistence.
- `demoRepairs.ts` uses synthetic customers, devices, technicians, repairs, history, and photos. Writes mutate memory for the session only; photo URLs are a transparent placeholder. It validates device/customer ownership, but does not reproduce live RLS or database triggers.
- Demo status changes set `completed_at` in memory and append history. Live behavior must be verified against database triggers.
- Demo stock treats `receive` and `returned` as increases and every other supported type as a decrease. The RPC must implement the same signed semantics, including the business meaning of `adjustment`.

## Synthetic verification cases

Run these against a disposable Supabase project or isolated test tenant with demo-like records. Do not use production customer data.

| ID | Synthetic setup/action | Expected outcome |
|---|---|---|
| I-1 | Find `DEMO-1001`; receive 3 units with reference `synthetic-receipt-1`. | RPC succeeds atomically; stock rises 12→15; movement/audit row exists; refreshed product is 15. |
| I-2 | Sell/consume more than available stock. | RPC rejects; stock and movement remain unchanged; UI shows failure and does not retry automatically. |
| I-3 | Submit quantity 0, fractional, negative, unknown type, or missing product ID. | Client validation rejects; no RPC call. RPC independently rejects equivalent direct calls. |
| I-4 | Create a product with duplicate synthetic barcode. | Database uniqueness/RPC/API rejects; no partial product. |
| I-5 | Upload a synthetic product PNG, then force/ simulate product-row update failure. | Object may exist because this flow has no cleanup; record the orphan for operational cleanup and do not claim completion. |
| R-1 | Search synthetic repair by job number, customer phone, device model, and status with pagination. | Only RLS-authorized rows appear; count and rows agree; reserved filter characters cannot add conditions. |
| R-2 | Create customer → device → repair with matching IDs. | Rows are created; job number/initial status/timestamps are DB-controlled; initial history row exists. |
| R-3 | Attempt repair using another synthetic customer's device. | Request rejected; no repair row/history row created. |
| R-4 | Change status `received`→`in_repair`→`completed`. | Each real transition has one history row; completion timestamp is set only on completed; client cannot forge it. |
| R-5 | Upload a synthetic image for a repair, then force metadata insert failure. | Object upload is followed by removal; no `repair_photos` row remains; verify cleanup failure is surfaced/logged for manual reconciliation. |
| R-6 | Request signed URL for authorized and unauthorized/path-mismatched photo. | Authorized path returns a short-lived URL; unauthorized access is denied by RLS/storage policy. |
| R-7 | Simulate network failure after a status update or stock RPC returns success but before UI refresh. | Subsequent read shows the committed server state; retry strategy must avoid duplicate stock movement or duplicate status history. |

## Failure, rollback, and reconciliation handling

1. **Validate before mutation:** retain current client validation, but treat it as UX only; enforce all invariants in RLS, constraints, triggers, and RPC code.
2. **Stock:** `adjust_stock` must be the only write path for stock. It should use a transaction/row lock, reject negative resulting stock, and create an idempotency or reference strategy if retries are possible. Never compensate by issuing an opposite adjustment automatically without an operator decision.
3. **Product images:** upload-then-row-update is not atomic. On row-update failure, the current client has no cleanup step. Mark the workflow incomplete and provide a periodic orphan-object reconciliation process before production reliance.
4. **Repair photos:** metadata failure cleanup is implemented, but cleanup failure is currently ignored before the original error is thrown. Monitor storage and reconcile objects with no matching `repair_photos` row.
5. **Repair status/history:** rely on a DB trigger or transaction so status and history cannot diverge. If a request times out, read the repair and history before retrying.
6. **Create flows:** customer → device → repair is multi-step in the form. A later failure does not automatically remove earlier records; retain records only if that is the intended audit behavior, otherwise add a server-side transaction/explicit draft cleanup policy.
7. **Access failures:** show an authorization/error state and preserve unsaved form input where possible. Do not fall back from live mode to demo data after a Supabase error, since that could misrepresent stock or repairs.

## Readiness checklist

- [ ] Confirm table columns, foreign keys, uniqueness constraints, enum/check constraints, and timestamp defaults.
- [ ] Confirm `adjust_stock` signature, atomicity, movement audit, authorization, and retry/idempotency behavior.
- [ ] Confirm repair-history trigger behavior for insert and every status transition, including repeated same-status updates.
- [ ] Confirm RLS for staff roles on all tables and embedded relation reads; test cross-customer and cross-repair access denial.
- [ ] Confirm `product-images` is intentionally public; confirm `repair-photos` is private and signed URLs are policy-protected.
- [ ] Confirm storage path ownership rules prevent one repair/product from writing another's path.
- [ ] Execute I-1–I-5 and R-1–R-7 in an isolated environment and retain non-secret result evidence.
- [ ] Add monitoring/reconciliation for product-image and repair-photo orphan objects before calling uploads production-ready.
