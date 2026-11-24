# Project memory

## Product intent & audience

- **Skinz & Bubbles** — two coexisting surfaces in one Vite + React app:
  - **Customer-facing site** at root URL (`/`): legacy vanilla JS app (`public/js/legacy-app.js`) with home, experience, Jamaica guide, tickets, lineup, ambassador hub, guest accounts, and staff portals.
  - **Admin Control Center** at `/admin/*`: secure backoffice for managing the storefront operation.
- Admin users are super_admin and invited sub-admins; regular customers must never access admin features or self-elevate privileges.
- Regular visitors landing on the root URL see the customer page, not the admin panel.

## Brand personality & voice

- Admin-facing interface: functional, security-first, direct labels — no marketing copy.
- Customer-facing legacy app retains its original branding and content.

## Visual design & UX direction

- Vite + React + TypeScript frontend.
- **Routing split**: root URL (`/`) renders the legacy customer app; `/admin/*` renders React admin routes.
- Legacy customer app loads from preserved vanilla JavaScript files with original CSS, images, and Supabase integration.
- Admin routes under `/admin/*`: login, dashboard, forgot-password, settings, administrators, setup (one-time), accept-invite.
- Post-login redirect to `/admin/dashboard`.
- MFA verification step integrated into login flow (TOTP).
- Password reset handles two phases: sending reset email, then setting new password via Supabase redirect callback.
- Invitation acceptance is a dedicated page calling a server-side edge function (no client-side inserts).
- Setup page self-disables after first Super Admin is created and redirects to login.
- Admin UI visual design system (colors, typography, component library) still not explicitly established.

## Decisions, constraints & rationale

- **Supabase** is the backend/auth provider; existing project reused.
- **Admin tables**: `admin_accounts`, `admin_invites`, `admin_audit_logs`.
- **Minimum-privilege grants + RLS** replacing former blanket CRUD to `anon`/`authenticated`:
  - `admin_accounts`: authenticated SELECT + restricted self-UPDATE (name/MFA); no client INSERT/DELETE.
  - `admin_audit_logs`: SELECT + INSERT only (append-only); no UPDATE/DELETE.
  - `admin_invites`: anon SELECT (token lookup); authenticated CRUD restricted to super_admin via RLS.
- **Admin account creation is server-side only** via edge functions using service role key:
  - `bootstrap` for initial Super Admin setup.
  - `accept-invite` for invitation acceptance.
- Edge functions use `SECURITY_INVOKER` (was `SECURITY DEFINER`).
- RLS enforces role/permission verification server-side; client never has privilege-granting access.
- MFA bug fixed: challenge verification uses actual challenge ID from `challenge()`, not TOTP factor ID.
- Security advisor reports zero findings after fixes.
- Legacy customer app preserved as-is in `public/` rather than rebuilt in React; served via standalone HTML page.

## Open questions & assumptions

- Assumes Supabase project has email auth, MFA (TOTP), and edge functions enabled.
- Assumes service role key is available in edge function environment (not exposed to client).
- Assumes `super_admin` is the top-level role; sub-admin roles and specific permissions not yet detailed.
- Long-term plan for legacy customer app (keep as vanilla JS vs. migrate to React) not yet decided.
- Admin UI design system not yet established — no explicit styling directives inferred.