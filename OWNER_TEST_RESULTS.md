# OWNER TEST RESULTS — Anand Mobile & Electrics

Fill in **Actual** and **Result** (PASS / FAIL / BLOCKED / NOT RUN) as you work through
`OWNER_TESTING_GUIDE.md`. Do not record PASS without evidence. Remove any secrets or real
customer data before sharing. Date: __________  Tester: __________

## Group 1 — Locally verified (re-runnable)
| ID | Action | Expected | Actual | Result |
|----|--------|----------|--------|--------|
| L1 | `npm run build` + `npm run test` | build OK; 11/11 tests pass | | |
| L2 | `npm run lint` | 0 errors | | |

## Group 2 — Live database / security (owner-run; R = read-only, W = modifies)
| ID | Action | R/W | Expected | Actual | Result |
|----|--------|-----|----------|--------|--------|
| D1 | Public signup setting | R | Disabled (OFF) | | |
| D2 | Pre-migration inspection SQL | R | role from metadata; owner trusted; owner/manager roles correct | | |
| D3 | Apply hardening migration | W | Applies clean; body now literal `technician` | | |
| D4 | Escalation test: signup role owner/manager/invalid/none | W | Every new profile role = `technician` | | |
| D5 | Existing accounts unchanged | R | owner=owner, manager=manager | | |
| D6 | Live RLS/storage matrix (owner+manager clients) | R | anon blocked; manager cannot write profiles; photo signed-URL scoped | | |

## Group 3 — Physical device / browser (owner-run; cannot be automated here)
| ID | Action | Expected | Actual | Result |
|----|--------|----------|--------|--------|
| P1 | PWA install (Chrome desktop) | Install offered; opens own window | | |
| P2 | Offline reload + reconnect | Shell renders, NO private data cached; recovers | | |
| P3 | Android install + sign-in | Role-aware admin loads | | |
| P4 | Barcode scan / manual entry / photo upload (Android) | Existing barcode → stock-adjust (no dup); photo uploads; failure shows error | | |

## Deployment (separate approval)
| ID | Action | Expected | Actual | Result |
|----|--------|----------|--------|--------|
| X1 | Owner authorizes deploy | — | | |
| X2 | Post-deploy smoke test | public pages, /admin/login, manifest+sw served, Install offered | | |

## Notes / anomalies (no secrets)
-
