/*
# Fix: app_settings single-row table primary key type

## Purpose
Fix the app_settings table to use a uuid PK with a fixed default value of 1 cast to uuid,
so it remains a single-row table without type mismatch.

## Changes
- Drops and recreates app_settings with correct PK type.
*/

DROP TABLE IF EXISTS public.app_settings CASCADE;

CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  brand_color_primary text NOT NULL DEFAULT '#e11d63',
  brand_color_secondary text NOT NULL DEFAULT '#06c9b6',
  brand_color_accent text NOT NULL DEFAULT '#f5b800',
  event_countdown_date timestamptz NOT NULL DEFAULT '2027-07-31T10:00:00-05:00',
  event_countdown_label text NOT NULL DEFAULT 'Skinz & Bubbles Kingston 2027',
  nav_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  enabled_features jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = '00000000-0000-0000-0000-000000000001'::uuid)
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;

DROP POLICY IF EXISTS "public_read_app_settings" ON public.app_settings;
CREATE POLICY "public_read_app_settings"
ON public.app_settings FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "admin_insert_app_settings" ON public.app_settings;
CREATE POLICY "admin_insert_app_settings"
ON public.app_settings FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_app_settings" ON public.app_settings;
CREATE POLICY "admin_update_app_settings"
ON public.app_settings FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
