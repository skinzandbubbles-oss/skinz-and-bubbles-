/*
# Admin Core Schema: admin accounts, invites, audit logs

## Purpose
Creates the foundation tables for the Bubbles Control Center administration portal:
administrator accounts, invitation-based registration, and audit logging.

## New Tables
1. `admin_accounts` — mirrors auth.users for admin profile data (role, status, name, MFA flag).
2. `admin_invites` — secure invitation tokens for new administrators.
3. `admin_audit_logs` — append-only audit trail of all admin actions.

## Security
- RLS enabled on all tables.
- Helper SECURITY DEFINER functions `is_admin()` and `is_super_admin()`.
- Only active admins can read admin tables; self can update own name/MFA.
- Audit logs are append-only (insert only, no update/delete).
- Regular app users cannot access any admin table.

## Notes
1. The initial Super Admin must be created via the server-side bootstrap edge function,
   which uses the service_role key to insert into admin_accounts after the user signs up.
2. Public registration as administrator is not possible — invitation only.
*/

-- Enums
DO $$ BEGIN
  CREATE TYPE admin_role AS ENUM ('super_admin', 'admin', 'moderator', 'editor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE admin_status AS ENUM ('active', 'suspended', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- admin_accounts
CREATE TABLE IF NOT EXISTS public.admin_accounts (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role admin_role NOT NULL DEFAULT 'editor',
  status admin_status NOT NULL DEFAULT 'active',
  mfa_enabled boolean NOT NULL DEFAULT false,
  last_sign_in_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_accounts ENABLE ROW LEVEL SECURITY;

-- admin_invites
CREATE TABLE IF NOT EXISTS public.admin_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role admin_role NOT NULL DEFAULT 'editor',
  token uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

-- admin_audit_logs
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  admin_email text NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  details jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper functions (defined after tables exist)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
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
SECURITY DEFINER
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

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- Grants
GRANT SELECT ON public.admin_accounts TO authenticated;
GRANT UPDATE (full_name, mfa_enabled, updated_at) ON public.admin_accounts TO authenticated;
GRANT SELECT ON public.admin_invites TO authenticated;
GRANT SELECT ON public.admin_audit_logs TO authenticated;
GRANT INSERT ON public.admin_audit_logs TO authenticated;

-- Policies: admin_accounts
DROP POLICY IF EXISTS "admins_read_admin_accounts" ON public.admin_accounts;
CREATE POLICY "admins_read_admin_accounts"
ON public.admin_accounts FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "admin_update_own_account" ON public.admin_accounts;
CREATE POLICY "admin_update_own_account"
ON public.admin_accounts FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policies: admin_invites
DROP POLICY IF EXISTS "admins_read_invites" ON public.admin_invites;
CREATE POLICY "admins_read_invites"
ON public.admin_invites FOR SELECT
TO authenticated
USING (public.is_admin());

-- Policies: admin_audit_logs (append-only)
DROP POLICY IF EXISTS "admins_read_audit_logs" ON public.admin_audit_logs;
CREATE POLICY "admins_read_audit_logs"
ON public.admin_audit_logs FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "admins_insert_audit_logs" ON public.admin_audit_logs;
CREATE POLICY "admins_insert_audit_logs"
ON public.admin_audit_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = admin_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON public.admin_audit_logs (admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_invites_token ON public.admin_invites (token);
