// Demo mode: when VITE_DEMO_MODE === 'true', the data layer serves deterministic
// synthetic data from an in-memory store instead of calling live Supabase. This
// lets the whole app be developed/tested without a live database. The real
// Supabase path remains the DEFAULT (flag unset/false) so nothing changes in
// production. We NEVER fall back to demo data on a live request failure — that
// would mislead staff about real stock/repairs.
export function isDemoMode(): boolean {
  try {
    return import.meta.env.VITE_DEMO_MODE === 'true';
  } catch {
    return false;
  }
}
