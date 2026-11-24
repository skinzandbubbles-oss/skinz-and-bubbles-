/*
# Lockdown Admin Security: Revoke Overbroad Grants, Add Missing RLS Policies

## Purpose
The previous migration (001) created the admin tables with correct RLS policies,
but the grants were far too permissive: both `anon` and `authenticated` roles
received full CRUD (SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER)
on `admin_accounts`, `admin_invites`, and `admin_audit_logs`. This means:

1. Any anonymous visitor could INSERT into admin_accounts and grant themselves
   super_admin privileges.
2. Any authenticated regular app user could INSERT into admin_accounts and
   escalate to any admin role.
3. Admin audit logs could be modified or deleted by anyone.

This migration fixes those issues by:
- Revoking ALL privileges from `anon` on all admin tables.
- Revoking ALL privileges from `authenticated` on all admin tables.
- Re-granting only the minimum needed, column-restricted where possible.
- Adding the missing INSERT/UPDATE/DELETE policies for admin_invites
  (only super_admin can create/revoke invites; only the invited user's
  auth session can mark an invite as accepted — but actually invite
  acceptance is now handled server-side via the accept-invite edge function).
- Adding a SELECT policy on admin_invites that allows token-based lookup
  by unauthenticated invitees (needed for the invite acceptance page to
  verify a token before the user has an auth session).
- Switching is_admin() and is_super_admin() to SECURITY INVOKER (the
  advisor flagged them as SECURITY DEFINER callable by all authenticated
  users; INVOKER is correct since they only read from admin_accounts which
  is already RLS-protected for admins).

## Changes

### admin_accounts
- Revoke ALL from anon, authenticated.
- Grant SELECT to authenticated (admin read policy controls which rows).
- Grant UPDATE (full_name, mfa_enabled, updated_at) to authenticated (self-update only).
- No INSERT/DELETE from the client — bootstrap and invite acceptance are server-side only.

### admin_invites
- Revoke ALL from anon, authenticated.
- Grant SELECT to authenticated (admin read policy).
- Grant INSERT to authenticated (super_admin only, via policy).
- Grant UPDATE to authenticated (super_admin only, via policy).
- Grant DELETE to authenticated (super_admin only, via policy).
- Add SELECT policy for anon: token-based lookup (so invite page can verify token pre-auth).
  This is safe because the token is a random UUID and only exposes email + role + expiry.

### admin_audit_logs
- Revoke ALL from anon, authenticated.
- Grant SELECT to authenticated (admin read policy).
- Grant INSERT to authenticated (self-insert only, via policy).
- No UPDATE or DELETE — audit logs are append-only.

### Functions
- Switch is_admin() and is_super_admin() from SECURITY DEFINER to SECURITY INVOKER.
  These functions only SELECT from admin_accounts (RLS-protected), so INVOKER is correct
  and removes the advisor warning about SECURITY DEFINER functions callable by authenticated.

## Security
- Regular customers cannot INSERT into admin_accounts — no INSERT grant, no INSERT policy.
- Regular customers cannot read admin data — SELECT policy requires is_admin() check.
- Audit logs are truly append-only — no UPDATE or DELETE grants.
- Invite tokens are looked up by anon but only by exact token match (random UUID).
*/
