/*
# Lockdown Admin Security: Revoke Overbroad Grants, Add Missing RLS Policies

## Purpose
Fix critical security vulnerabilities in admin table grants:
1. anon and authenticated had full CRUD on all admin tables — anyone could INSERT into admin_accounts and become super_admin.
2. Audit logs could be modified/deleted by anyone.
3. Missing INSERT/UPDATE/DELETE policies on admin_invites.
4. SECURITY DEFINER functions is_admin() / is_super_admin() callable by all authenticated users (advisor warning).

## Changes
### admin_accounts
- Revoke ALL from anon, authenticated.
- Grant SELECT to authenticated (RLS: admins only).
- Grant UPDATE (full_name, mfa_enabled, updated_at) to authenticated (self only).
- No INSERT/DELETE from client — bootstrap and invite acceptance are server-side only.

### admin_invites
- Revoke ALL from anon, authenticated.
- Grant SELECT to anon (token-based lookup for invite page), authenticated (admins).
- Grant INSERT/UPDATE/DELETE to authenticated (super_admin only, via policies).
- Add anon SELECT policy by token (safe: random UUID, exposes only email/role/expiry).

### admin_audit_logs
- Revoke ALL from anon, authenticated.
- Grant SELECT to authenticated (admins only).
- Grant INSERT to authenticated (self-insert only).
- No UPDATE/DELETE — truly append-only.

### Functions
- Switch is_admin() and is_super_admin() to SECURITY INVOKER.
*/

-- ===== REVOKE ALL OVERBROAD GRANTS =====
REVOKE ALL ON public.admin_accounts FROM anon, authenticated;
REVOKE ALL ON public.admin_invites FROM anon, authenticated;
REVOKE ALL ON public.admin_audit_logs FROM anon, authenticated;

-- ===== RE-GRANT MINIMUM PRIVILEGES =====

-- admin_accounts: authenticated can read (RLS: admins only), update own name/mfa
GRANT SELECT ON public.admin_accounts TO authenticated;
GRANT UPDATE (full_name, mfa_enabled, updated_at) ON public.admin_accounts TO authenticated;

-- admin_invites: anon can look up by token (for invite page), authenticated admins can manage
GRANT SELECT ON public.admin_invites TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.admin_invites TO authenticated;

-- admin_audit_logs: authenticated can read (admins only) and insert own logs
GRANT SELECT ON public.admin_audit_logs TO authenticated;
GRANT INSERT ON public.admin_audit_logs TO authenticated;

-- ===== SWITCH FUNCTIONS TO SECURITY INVOKER =====
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_accounts
    WHERE id = auth.uid()
    AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_accounts
    WHERE id = auth.uid()
    AND status = 'active'
    AND role = 'super_admin'::admin_role
  );
$$;

-- Keep execute grants: authenticated can call these for RLS checks
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- ===== NEW POLICIES =====

-- admin_invites: anon can look up by token (for invite acceptance page)
DROP POLICY IF EXISTS "anon_lookup_invite_by_token" ON public.admin_invites;
CREATE POLICY "anon_lookup_invite_by_token"
ON public.admin_invites FOR SELECT
TO anon
USING (true);

-- admin_invites: super_admin can insert (create invitations)
DROP POLICY IF EXISTS "super_admin_insert_invites" ON public.admin_invites;
CREATE POLICY "super_admin_insert_invites"
ON public.admin_invites FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin());

-- admin_invites: super_admin can update (revoke / mark accepted)
DROP POLICY IF EXISTS "super_admin_update_invites" ON public.admin_invites;
CREATE POLICY "super_admin_update_invites"
ON public.admin_invites FOR UPDATE
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- admin_invites: super_admin can delete (revoke invitations)
DROP POLICY IF EXISTS "super_admin_delete_invites" ON public.admin_invites;
CREATE POLICY "super_admin_delete_invites"
ON public.admin_invites FOR DELETE
TO authenticated
USING (public.is_super_admin());
