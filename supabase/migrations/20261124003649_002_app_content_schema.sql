/*
# App Content Management Schema (sections + versions)

## Purpose
Tables for the Visual App Builder: dynamic content sections and versioned drafts/publishing.
Note: app_settings is created in migration 002a.

## New Tables
1. `app_content_sections` — individual content blocks (hero, banner, text, video, button, countdown).
2. `app_content_versions` — versioned snapshots for draft/publish/schedule/restore.

## Security
- RLS enabled on all tables.
- Public (anon + authenticated) can READ published content.
- Only admins can write.
*/

DO $$ BEGIN
  CREATE TYPE content_section_type AS ENUM ('hero', 'banner', 'text', 'video', 'button', 'countdown', 'image');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE content_version_status AS ENUM ('draft', 'published', 'scheduled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.app_content_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text UNIQUE NOT NULL,
  section_type content_section_type NOT NULL DEFAULT 'text',
  title text NOT NULL DEFAULT '',
  subtitle text,
  body text,
  image_url text,
  video_url text,
  button_label text,
  button_destination text,
  sort_order integer NOT NULL DEFAULT 0,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_content_sections ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.app_content_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_number integer NOT NULL,
  status content_version_status NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  scheduled_for timestamptz,
  published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sections_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  settings_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_content_versions ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT ON public.app_content_sections TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.app_content_sections TO authenticated;
GRANT SELECT ON public.app_content_versions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.app_content_versions TO authenticated;

-- Policies: app_content_sections
DROP POLICY IF EXISTS "public_read_content_sections" ON public.app_content_sections;
CREATE POLICY "public_read_content_sections"
ON public.app_content_sections FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "admin_insert_content_sections" ON public.app_content_sections;
CREATE POLICY "admin_insert_content_sections"
ON public.app_content_sections FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_content_sections" ON public.app_content_sections;
CREATE POLICY "admin_update_content_sections"
ON public.app_content_sections FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_content_sections" ON public.app_content_sections;
CREATE POLICY "admin_delete_content_sections"
ON public.app_content_sections FOR DELETE
TO authenticated
USING (public.is_admin());

-- Policies: app_content_versions
DROP POLICY IF EXISTS "public_read_published_versions" ON public.app_content_versions;
CREATE POLICY "public_read_published_versions"
ON public.app_content_versions FOR SELECT
TO anon, authenticated
USING (status = 'published'::content_version_status OR public.is_admin());

DROP POLICY IF EXISTS "admin_insert_versions" ON public.app_content_versions;
CREATE POLICY "admin_insert_versions"
ON public.app_content_versions FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_versions" ON public.app_content_versions;
CREATE POLICY "admin_update_versions"
ON public.app_content_versions FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_versions" ON public.app_content_versions;
CREATE POLICY "admin_delete_versions"
ON public.app_content_versions FOR DELETE
TO authenticated
USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_content_sections_sort ON public.app_content_sections (sort_order);
CREATE INDEX IF NOT EXISTS idx_content_versions_status ON public.app_content_versions (status);
CREATE INDEX IF NOT EXISTS idx_content_versions_created ON public.app_content_versions (created_at DESC);
