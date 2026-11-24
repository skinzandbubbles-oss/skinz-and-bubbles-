/*
# Business Data Schema: events, tickets, VIP cabanas, DJs, media, users, and more

## Purpose
Creates all business-domain tables that the admin portal manages and the mobile app reads.

## New Tables
1. `app_users` — profiles for mobile app users (extends auth.users).
2. `events` — event records (title, dates, location, banner).
3. `ticket_tiers` — ticket types per event (price, capacity, sold count).
4. `tickets` — individual ticket records linked to users and events.
5. `vip_cabanas` — VIP cabana packages.
6. `dj_lineup` — DJ entries with set times and sort order.
7. `media_assets` — uploaded media files (images, videos) with metadata.
8. `push_notifications` — notification campaigns (draft, scheduled, sent).
9. `community_reports` — user-submitted content reports for moderation.
10. `ambassadors` — ambassador program members with codes and points.
11. `travel_guides` — travel guide articles.
12. `promotions` — discount codes and promotions.
13. `support_tickets` — customer support requests.
14. `legal_documents` — versioned legal docs (privacy, terms, community guidelines).

## Security
- RLS enabled on all tables.
- Public (anon + authenticated) can READ published events, DJs, VIP, travel guides, promotions, legal docs, and media.
- Only admins can write to management tables (is_admin() check).
- app_users: users can read and update their own profile; admins can read all and update status.
- tickets: users can read their own tickets; admins can read all.
- community_reports: users can insert reports; admins can read and update.
- ambassadors: public can read active ambassadors; admins can manage.
- support_tickets: users can read their own; admins can read all and update.
- push_notifications: admins only (no public read).

## Notes
1. All tables use uuid PKs with gen_random_uuid() defaults.
2. Foreign keys link child tables (ticket_tiers → events, tickets → events + app_users).
3. The mobile app reads published content via the anon key.
*/

-- Event status enum
DO $$ BEGIN
  CREATE TYPE event_status AS ENUM ('draft', 'published', 'cancelled', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Ticket purchase status enum
DO $$ BEGIN
  CREATE TYPE ticket_purchase_status AS ENUM ('pending', 'confirmed', 'cancelled', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Ambassador status enum
DO $$ BEGIN
  CREATE TYPE ambassador_status AS ENUM ('pending', 'active', 'inactive', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Report status enum
DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('pending', 'resolved', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Support ticket status/priority enums
DO $$ BEGIN
  CREATE TYPE support_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE support_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Notification status enum
DO $$ BEGIN
  CREATE TYPE notification_status AS ENUM ('draft', 'scheduled', 'sent', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- app_users
CREATE TABLE IF NOT EXISTS public.app_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  phone text,
  status text NOT NULL DEFAULT 'active',
  role text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- events
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  location text NOT NULL DEFAULT '',
  status event_status NOT NULL DEFAULT 'draft',
  banner_image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- ticket_tiers
CREATE TABLE IF NOT EXISTS public.ticket_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  description text,
  capacity integer NOT NULL DEFAULT 0,
  sold integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_tiers ENABLE ROW LEVEL SECURITY;

-- tickets
CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  ticket_tier_id uuid REFERENCES public.ticket_tiers(id) ON DELETE SET NULL,
  ticket_type text NOT NULL DEFAULT '',
  purchase_status ticket_purchase_status NOT NULL DEFAULT 'pending',
  purchase_amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  purchased_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- vip_cabanas
CREATE TABLE IF NOT EXISTS public.vip_cabanas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  capacity integer NOT NULL DEFAULT 4,
  is_available boolean NOT NULL DEFAULT true,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vip_cabanas ENABLE ROW LEVEL SECURITY;

-- dj_lineup
CREATE TABLE IF NOT EXISTS public.dj_lineup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dj_name text NOT NULL,
  bio text,
  genre text,
  set_time timestamptz,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dj_lineup ENABLE ROW LEVEL SECURITY;

-- media_assets
CREATE TABLE IF NOT EXISTS public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  storage_path text NOT NULL,
  url text NOT NULL,
  mime_type text NOT NULL DEFAULT 'image/jpeg',
  size_bytes integer NOT NULL DEFAULT 0,
  alt_text text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

-- push_notifications
CREATE TABLE IF NOT EXISTS public.push_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  audience text NOT NULL DEFAULT 'all',
  status notification_status NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  scheduled_for timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;

-- community_reports
CREATE TABLE IF NOT EXISTS public.community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  content_type text NOT NULL,
  content_id text NOT NULL,
  reason text NOT NULL,
  status report_status NOT NULL DEFAULT 'pending',
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;

-- ambassadors
CREATE TABLE IF NOT EXISTS public.ambassadors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  status ambassador_status NOT NULL DEFAULT 'pending',
  points integer NOT NULL DEFAULT 0,
  referrals integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ambassadors ENABLE ROW LEVEL SECURITY;

-- travel_guides
CREATE TABLE IF NOT EXISTS public.travel_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  body text NOT NULL DEFAULT '',
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.travel_guides ENABLE ROW LEVEL SECURITY;

-- promotions
CREATE TABLE IF NOT EXISTS public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  discount_percent integer NOT NULL DEFAULT 0,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  is_active boolean NOT NULL DEFAULT true,
  usage_limit integer,
  used_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- support_tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  subject text NOT NULL,
  message text NOT NULL,
  status support_status NOT NULL DEFAULT 'open',
  priority support_priority NOT NULL DEFAULT 'medium',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- legal_documents
CREATE TABLE IF NOT EXISTS public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_key text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1,
  effective_date timestamptz NOT NULL DEFAULT now(),
  is_current boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

-- ============ GRANTS ============

-- Public read tables (mobile app needs these)
GRANT SELECT ON public.events TO anon, authenticated;
GRANT SELECT ON public.ticket_tiers TO anon, authenticated;
GRANT SELECT ON public.vip_cabanas TO anon, authenticated;
GRANT SELECT ON public.dj_lineup TO anon, authenticated;
GRANT SELECT ON public.media_assets TO anon, authenticated;
GRANT SELECT ON public.travel_guides TO anon, authenticated;
GRANT SELECT ON public.promotions TO anon, authenticated;
GRANT SELECT ON public.legal_documents TO anon, authenticated;
GRANT SELECT ON public.ambassadors TO anon, authenticated;

-- User-scoped tables
GRANT SELECT, INSERT, UPDATE ON public.app_users TO authenticated;
GRANT SELECT, INSERT ON public.tickets TO authenticated;
GRANT SELECT, INSERT ON public.community_reports TO authenticated;
GRANT SELECT, INSERT ON public.support_tickets TO authenticated;

-- Admin write grants (all management tables)
GRANT INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ticket_tiers TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tickets TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.vip_cabanas TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.dj_lineup TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.media_assets TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.travel_guides TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.legal_documents TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ambassadors TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.community_reports TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.push_notifications TO authenticated;
GRANT SELECT ON public.push_notifications TO authenticated;

-- ============ POLICIES ============

-- app_users: users read/update own; admins read all and manage
DROP POLICY IF EXISTS "users_read_own_profile" ON public.app_users;
CREATE POLICY "users_read_own_profile"
ON public.app_users FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "users_insert_own_profile" ON public.app_users;
CREATE POLICY "users_insert_own_profile"
ON public.app_users FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_own_profile" ON public.app_users;
CREATE POLICY "users_update_own_profile"
ON public.app_users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "admin_update_users" ON public.app_users;
CREATE POLICY "admin_update_users"
ON public.app_users FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- events: public read published; admin write
DROP POLICY IF EXISTS "public_read_events" ON public.events;
CREATE POLICY "public_read_events"
ON public.events FOR SELECT
TO anon, authenticated
USING (status = 'published'::event_status OR public.is_admin());

DROP POLICY IF EXISTS "admin_write_events" ON public.events;
CREATE POLICY "admin_write_events"
ON public.events FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_events" ON public.events;
CREATE POLICY "admin_update_events"
ON public.events FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_events" ON public.events;
CREATE POLICY "admin_delete_events"
ON public.events FOR DELETE
TO authenticated
USING (public.is_admin());

-- ticket_tiers: public read; admin write
DROP POLICY IF EXISTS "public_read_ticket_tiers" ON public.ticket_tiers;
CREATE POLICY "public_read_ticket_tiers"
ON public.ticket_tiers FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "admin_write_ticket_tiers" ON public.ticket_tiers;
CREATE POLICY "admin_write_ticket_tiers"
ON public.ticket_tiers FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_ticket_tiers" ON public.ticket_tiers;
CREATE POLICY "admin_update_ticket_tiers"
ON public.ticket_tiers FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_ticket_tiers" ON public.ticket_tiers;
CREATE POLICY "admin_delete_ticket_tiers"
ON public.ticket_tiers FOR DELETE
TO authenticated
USING (public.is_admin());

-- tickets: users read own; admins read all and manage
DROP POLICY IF EXISTS "users_read_own_tickets" ON public.tickets;
CREATE POLICY "users_read_own_tickets"
ON public.tickets FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "users_insert_own_tickets" ON public.tickets;
CREATE POLICY "users_insert_own_tickets"
ON public.tickets FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "admin_update_tickets" ON public.tickets;
CREATE POLICY "admin_update_tickets"
ON public.tickets FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_tickets" ON public.tickets;
CREATE POLICY "admin_delete_tickets"
ON public.tickets FOR DELETE
TO authenticated
USING (public.is_admin());

-- vip_cabanas: public read; admin write
DROP POLICY IF EXISTS "public_read_vip_cabanas" ON public.vip_cabanas;
CREATE POLICY "public_read_vip_cabanas"
ON public.vip_cabanas FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "admin_write_vip_cabanas" ON public.vip_cabanas;
CREATE POLICY "admin_write_vip_cabanas"
ON public.vip_cabanas FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_vip_cabanas" ON public.vip_cabanas;
CREATE POLICY "admin_update_vip_cabanas"
ON public.vip_cabanas FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_vip_cabanas" ON public.vip_cabanas;
CREATE POLICY "admin_delete_vip_cabanas"
ON public.vip_cabanas FOR DELETE
TO authenticated
USING (public.is_admin());

-- dj_lineup: public read published; admin write
DROP POLICY IF EXISTS "public_read_dj_lineup" ON public.dj_lineup;
CREATE POLICY "public_read_dj_lineup"
ON public.dj_lineup FOR SELECT
TO anon, authenticated
USING (is_published OR public.is_admin());

DROP POLICY IF EXISTS "admin_write_dj_lineup" ON public.dj_lineup;
CREATE POLICY "admin_write_dj_lineup"
ON public.dj_lineup FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_dj_lineup" ON public.dj_lineup;
CREATE POLICY "admin_update_dj_lineup"
ON public.dj_lineup FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_dj_lineup" ON public.dj_lineup;
CREATE POLICY "admin_delete_dj_lineup"
ON public.dj_lineup FOR DELETE
TO authenticated
USING (public.is_admin());

-- media_assets: public read; admin write
DROP POLICY IF EXISTS "public_read_media" ON public.media_assets;
CREATE POLICY "public_read_media"
ON public.media_assets FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "admin_write_media" ON public.media_assets;
CREATE POLICY "admin_write_media"
ON public.media_assets FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_media" ON public.media_assets;
CREATE POLICY "admin_update_media"
ON public.media_assets FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_media" ON public.media_assets;
CREATE POLICY "admin_delete_media"
ON public.media_assets FOR DELETE
TO authenticated
USING (public.is_admin());

-- push_notifications: admin only
DROP POLICY IF EXISTS "admin_read_notifications" ON public.push_notifications;
CREATE POLICY "admin_read_notifications"
ON public.push_notifications FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "admin_write_notifications" ON public.push_notifications;
CREATE POLICY "admin_write_notifications"
ON public.push_notifications FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_notifications" ON public.push_notifications;
CREATE POLICY "admin_update_notifications"
ON public.push_notifications FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_notifications" ON public.push_notifications;
CREATE POLICY "admin_delete_notifications"
ON public.push_notifications FOR DELETE
TO authenticated
USING (public.is_admin());

-- community_reports: users insert; admins read/update
DROP POLICY IF EXISTS "users_insert_reports" ON public.community_reports;
CREATE POLICY "users_insert_reports"
ON public.community_reports FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "admin_read_reports" ON public.community_reports;
CREATE POLICY "admin_read_reports"
ON public.community_reports FOR SELECT
TO authenticated
USING (public.is_admin() OR auth.uid() = reporter_id);

DROP POLICY IF EXISTS "admin_update_reports" ON public.community_reports;
CREATE POLICY "admin_update_reports"
ON public.community_reports FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ambassadors: public read active; admin write
DROP POLICY IF EXISTS "public_read_ambassadors" ON public.ambassadors;
CREATE POLICY "public_read_ambassadors"
ON public.ambassadors FOR SELECT
TO anon, authenticated
USING (status = 'active'::ambassador_status OR public.is_admin());

DROP POLICY IF EXISTS "admin_write_ambassadors" ON public.ambassadors;
CREATE POLICY "admin_write_ambassadors"
ON public.ambassadors FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_ambassadors" ON public.ambassadors;
CREATE POLICY "admin_update_ambassadors"
ON public.ambassadors FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_ambassadors" ON public.ambassadors;
CREATE POLICY "admin_delete_ambassadors"
ON public.ambassadors FOR DELETE
TO authenticated
USING (public.is_admin());

-- travel_guides: public read published; admin write
DROP POLICY IF EXISTS "public_read_travel_guides" ON public.travel_guides;
CREATE POLICY "public_read_travel_guides"
ON public.travel_guides FOR SELECT
TO anon, authenticated
USING (is_published OR public.is_admin());

DROP POLICY IF EXISTS "admin_write_travel_guides" ON public.travel_guides;
CREATE POLICY "admin_write_travel_guides"
ON public.travel_guides FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_travel_guides" ON public.travel_guides;
CREATE POLICY "admin_update_travel_guides"
ON public.travel_guides FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_travel_guides" ON public.travel_guides;
CREATE POLICY "admin_delete_travel_guides"
ON public.travel_guides FOR DELETE
TO authenticated
USING (public.is_admin());

-- promotions: public read active; admin write
DROP POLICY IF EXISTS "public_read_promotions" ON public.promotions;
CREATE POLICY "public_read_promotions"
ON public.promotions FOR SELECT
TO anon, authenticated
USING (is_active OR public.is_admin());

DROP POLICY IF EXISTS "admin_write_promotions" ON public.promotions;
CREATE POLICY "admin_write_promotions"
ON public.promotions FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_promotions" ON public.promotions;
CREATE POLICY "admin_update_promotions"
ON public.promotions FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_promotions" ON public.promotions;
CREATE POLICY "admin_delete_promotions"
ON public.promotions FOR DELETE
TO authenticated
USING (public.is_admin());

-- support_tickets: users read own; admins read all and update
DROP POLICY IF EXISTS "users_read_own_support" ON public.support_tickets;
CREATE POLICY "users_read_own_support"
ON public.support_tickets FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "users_insert_support" ON public.support_tickets;
CREATE POLICY "users_insert_support"
ON public.support_tickets FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "admin_update_support" ON public.support_tickets;
CREATE POLICY "admin_update_support"
ON public.support_tickets FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- legal_documents: public read current; admin write
DROP POLICY IF EXISTS "public_read_legal" ON public.legal_documents;
CREATE POLICY "public_read_legal"
ON public.legal_documents FOR SELECT
TO anon, authenticated
USING (is_current OR public.is_admin());

DROP POLICY IF EXISTS "admin_write_legal" ON public.legal_documents;
CREATE POLICY "admin_write_legal"
ON public.legal_documents FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_legal" ON public.legal_documents;
CREATE POLICY "admin_update_legal"
ON public.legal_documents FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_legal" ON public.legal_documents;
CREATE POLICY "admin_delete_legal"
ON public.legal_documents FOR DELETE
TO authenticated
USING (public.is_admin());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events (status);
CREATE INDEX IF NOT EXISTS idx_ticket_tiers_event ON public.ticket_tiers (event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON public.tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event ON public.tickets (event_id);
CREATE INDEX IF NOT EXISTS idx_dj_lineup_sort ON public.dj_lineup (sort_order);
CREATE INDEX IF NOT EXISTS idx_media_created ON public.media_assets (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.community_reports (status);
CREATE INDEX IF NOT EXISTS idx_ambassadors_status ON public.ambassadors (status);
CREATE INDEX IF NOT EXISTS idx_travel_guides_sort ON public.travel_guides (sort_order);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON public.promotions (is_active);
CREATE INDEX IF NOT EXISTS idx_support_status ON public.support_tickets (status);
CREATE INDEX IF NOT EXISTS idx_legal_doc_key ON public.legal_documents (doc_key);
