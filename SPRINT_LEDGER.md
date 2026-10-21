# Engineering Sprint — Progress Ledger (paused)

_Paused by owner on request. Resume from "NEXT" below. All work is local; nothing deployed, no live SQL, no role/user changes._

## Current state — build & tests GREEN
- `tsc -b` → exit 0
- `vite build` → success; main chunk **498.74 kB** (gzip 145) — under the 500 kB warning threshold (no warning)
- `npm run test` (vitest) → **11/11 pass**

## Done this sprint
| Stage | Task | Status | Evidence |
|---|---|---|---|
| 0 | Baseline: branch `main`, no test tooling, deps inventoried | DONE | git status captured |
| 9 | **Route-level code splitting** in `src/App.tsx` (React.lazy + Suspense) | DONE | before: single 994 kB (gzip 292); after: index 498 kB (gzip 145) + per-page chunks; heavy `Inventory` (377 kB, html5-qrcode) now lazy-loaded only on that route |
| 11 | **Test tooling added** (vitest dev dep) + `npm run test` script + unit tests `src/services/repairs.test.ts` (sanitizeFilterTerm, extFromMime, normalizePhone, status constants) — 11 tests | DONE | vitest run 11/11 |
| 11 | Exported `sanitizeFilterTerm`, `extFromMime` from `repairs.ts` for testability | DONE | — |

## In flight when paused (read-only review agents — results not yet reviewed)
- Stage 2 (code quality) + Stage 12 (error handling) review
- Stage 3 (security) review of client + SQL + sw.js
- Stage 7 (website quality) + Stage 8 (accessibility) review
→ **NEXT:** read these three agents' findings and apply the safe, in-scope fixes.

## NEXT (resume order)
1. Review the 3 agents' findings; fix verified defects (expected candidates: Inventory.tsx `stopScanner` never calls `scanner.clear()` → camera/resource leak; AuthContext `getSession().then` has no `.catch` → possible stuck loading; a11y: skip-link, reduced-motion, color-contrast of brand blues).
2. Stage 14 — `npm audit` review (vitest install reported 6 advisories in dev deps; do NOT `--force`; record + report).
3. Stage 13 — write project README/docs (setup, env var names, commands, routes, security boundaries, PWA/barcode manual checks, backup/export, deploy checklist, approval gates).
4. Stage 15 — final diff review + clean up leftover `scratch/*.mjs` test scripts; confirm no secrets; final build+test.

## Standing blockers (owner / manual)
- Live PWA install/offline test (Chrome on PC) — NOT RUN
- Android camera/barcode test — NOT RUN
- Products public catalog — needs real data + approval of `supabase/proposed/public_catalog_REVIEW_ONLY.sql`
- Deployment — not authorized

## Preserved historical test evidence (separate suites)
- Owner+Manager security matrix: 20/20 · Repair search: 13/13 · (historical Owner+Technician: 27/27)
