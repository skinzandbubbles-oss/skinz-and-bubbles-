# Project memory

## Product intent & audience

- **Skinz & Bubbles Admin Control Center** — a secure admin backoffice for managing an e-commerce/storefront operation.
- Primary users are administrators (super_admin and invited sub-admins), not regular customers.
- Regular customers must never access admin features or self-elevate privileges.

## Brand personality & voice

- Admin-facing interface; tone is functional and security-first.
- No marketing copy in admin routes; labels and instructions are direct and instructional.

## Visual design & UX direction

- Vite + React + TypeScript frontend.
- Admin routes under `/admin/*`: login, dashboard, forgot-password, settings, administrators, setup (one-time), accept-invite.
- Post-login redirect to `/admin/dashboard`.
- MFA verification step integrated into login flow (TOTP).
- Password reset handles two phases: sending reset email, then setting new password via Supabase redirect callback.
- Invitation acceptance is a dedicated page that calls a server-side edge function (no client-side inserts).
- Setup page self-disables after first Super Admin is created and redirects to login.

## Decisions, constraints & rationale

- **Supabase** is the backend/auth provider; existing project reused, not new.
- **Admin tables**: `admin_accounts`, `admin_invites`, `admin_audit_logs`.
- **Critical fix applied**: revoked blanket CRUD grants to `anon`/`authenticated` on all admin tables; replaced with minimum-privilege grants + RLS policies.
  - `admin_accounts`: authenticated SELECT only + restricted self-UPDATE (name/MFA); no client INSERT/DELETE.
  - `admin_audit_logs`: SELECT + INSERT only (append-only); no UPDATE/DELETE.
  - `admin_invites`: anon SELECT (token lookup); authenticated CRUD restricted to super_admin via RLS.
- **Admin account creation is server-side only** via edge functions using service role key:
  - `bootstrap` edge function for initial Super Admin setup.
  - `accept-invite` edge function for invitation acceptance.
- Edge functions switched to `SECURITY INVOKER` (was `SECURITY DEFINER`) to resolve security advisor warnings.
- RLS enforces role/permission verification server-side; client never has privilege-granting access.
- MFA bug fixed: challenge verification now uses the actual challenge ID from `challenge()`, not the TOTP factor ID.
- Security advisor reports zero findings after fixes.

## Open questions & assumptions

- Assumes the Supabase project has email auth, MFA (TOTP), and edge functions enabled.
- Assumes service role key is available in edge function environment (not exposed to client).
- Assumes `super_admin` is the top-level role; sub-admin roles and their specific permissions are not yet detailed.
- Admin UI visual design system (colors, typography, component library) not yet established — no explicit styling directives inferred.