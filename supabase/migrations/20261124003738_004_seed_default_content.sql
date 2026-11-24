/*
# Seed Default App Content and Settings

## Purpose
Populates app_content_sections with default sections matching the existing mobile app's
Home, Jamaica, Experience, Tickets navigation, and creates the initial app_settings row.

## Changes
1. Inserts 6 default content sections (hero, banner, countdown, info, ticket CTA, video).
2. Inserts the single app_settings row with default brand colors and countdown.
3. Creates the first published content version snapshot.

## Notes
1. Uses ON CONFLICT to be idempotent — safe to re-run.
2. The mobile app reads these sections ordered by sort_order where is_enabled = true.
*/

INSERT INTO public.app_content_sections (section_key, section_type, title, subtitle, body, image_url, video_url, button_label, button_destination, sort_order, is_enabled)
VALUES
  ('home_hero', 'hero', 'Skinz & Bubbles', 'The Ultimate Daytime Foam Party Experience', 'Kingston, Jamaica — July 31, 2027', '/assets/hero.jpg', NULL, 'GET TICKETS', '/tickets', 0, true),
  ('home_banner', 'banner', 'Early Bird Tickets Now Available', NULL, 'Save up to 30% when you book before March 1, 2027', '/assets/foam.jpg', NULL, 'BUY NOW', '/tickets', 1, true),
  ('home_countdown', 'countdown', 'The Party Starts In', NULL, NULL, NULL, NULL, NULL, NULL, 2, true),
  ('jamaica_info', 'text', 'Welcome to Jamaica', 'Your Caribbean Adventure Awaits', 'Experience the vibrant culture, stunning beaches, and electric nightlife of Kingston, Jamaica. Your Skinz & Bubbles package includes curated travel guides and local recommendations.', '/assets/jamaica.jpg', NULL, 'EXPLORE JAMAICA', '/jamaica', 3, true),
  ('experience_video', 'video', 'The Foam Party Experience', NULL, 'Watch what awaits you at the most anticipated beach event of 2027.', '/assets/water.jpg', NULL, 'WATCH NOW', '/experience', 4, true),
  ('vip_cabana', 'image', 'VIP Cabanas & Premium Packages', 'Elevate Your Experience', 'Reserve your private cabana with dedicated service, premium views, and exclusive access.', '/assets/cabana.jpg', NULL, 'RESERVE VIP', '/vip', 5, true)
ON CONFLICT (section_key) DO NOTHING;

-- Insert default app settings
INSERT INTO public.app_settings (id, nav_items, enabled_features)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '[
    {"key": "home", "label": "Home", "icon": "Home", "sort_order": 0, "is_enabled": true},
    {"key": "jamaica", "label": "Jamaica", "icon": "MapPin", "sort_order": 1, "is_enabled": true},
    {"key": "experience", "label": "Experience", "icon": "Sparkles", "sort_order": 2, "is_enabled": true},
    {"key": "tickets", "label": "Tickets", "icon": "Ticket", "sort_order": 3, "is_enabled": true},
    {"key": "more", "label": "More", "icon": "Menu", "sort_order": 4, "is_enabled": true}
  ]'::jsonb,
  '{
    "ambassador_hub": true,
    "push_notifications": true,
    "community_feed": true,
    "travel_guide": true,
    "vip_booking": true,
    "dj_lineup": true
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Create the first published version snapshot
INSERT INTO public.app_content_versions (version_number, status, published_at, sections_data, settings_data)
SELECT
  1,
  'published',
  now(),
  (SELECT json_agg(
    json_build_object(
      'id', id,
      'section_key', section_key,
      'section_type', section_type,
      'title', title,
      'subtitle', subtitle,
      'body', body,
      'image_url', image_url,
      'video_url', video_url,
      'button_label', button_label,
      'button_destination', button_destination,
      'sort_order', sort_order,
      'is_enabled', is_enabled
    ) ORDER BY sort_order
  ) FROM public.app_content_sections),
  (SELECT row_to_json(t) FROM (SELECT brand_color_primary, brand_color_secondary, brand_color_accent, event_countdown_date, event_countdown_label, nav_items, enabled_features FROM public.app_settings) t)
WHERE NOT EXISTS (SELECT 1 FROM public.app_content_versions WHERE version_number = 1);
