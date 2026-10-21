-- Migration: harden handle_new_user() against signup-metadata role escalation.
-- STAGED FOR REVIEW — do not apply until the owner approves. This repo's agent
-- does NOT run `supabase db push`; applying this is an explicit owner action.
--
-- Problem: the original public.handle_new_user() set a new user's role from
-- COALESCE(new.raw_user_meta_data->>'role','technician'). raw_user_meta_data is
-- client-controlled via supabase.auth.signUp options.data, so a self-signup
-- could assign itself 'owner'/'manager' when public signup is enabled.
--
-- Fix: always assign the least-privileged 'technician', ignoring signup metadata
-- for role. The Owner promotes staff afterward via the existing owner-only
-- profiles write policy. Only the function body changes; the existing
-- on_auth_user_created trigger stays bound to it. No RLS/grant/enum/schema change.
-- CREATE OR REPLACE preserves the function's owner and the trigger binding.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    'technician'            -- NEVER derived from client metadata
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

-- ----------------------------------------------------------------------------
-- ROLLBACK — READ FIRST.
-- ⚠️ The "exact previous definition" below REINTRODUCES the privilege-escalation
-- vulnerability (role taken from client signup metadata). Do NOT use it as an
-- ordinary rollback. Only use it if you must restore byte-identical prior
-- behavior AND public signup is confirmed DISABLED, as a short-lived emergency
-- measure.
--
-- PREFERRED (secure) rollback — reverts cleanly without re-opening the hole;
-- behaviourally identical to the fix, so it is always safe to run:
--
--   create or replace function public.handle_new_user()
--   returns trigger as $$
--   begin
--     insert into public.profiles (id, full_name, role)
--     values (new.id, new.raw_user_meta_data->>'full_name', 'technician');
--     return new;
--   end;
--   $$ language plpgsql security definer set search_path = public, pg_temp;
--
-- EXACT-PRIOR rollback (INSECURE — emergency only, see warning above):
--
--   create or replace function public.handle_new_user()
--   returns trigger as $$
--   begin
--     insert into public.profiles (id, full_name, role)
--     values (
--       new.id,
--       new.raw_user_meta_data->>'full_name',
--       coalesce(new.raw_user_meta_data->>'role', 'technician')
--     );
--     return new;
--   end;
--   $$ language plpgsql security definer;
--
-- Note: the trigger on_auth_user_created does not need to be recreated for
-- either rollback path.
-- ----------------------------------------------------------------------------
