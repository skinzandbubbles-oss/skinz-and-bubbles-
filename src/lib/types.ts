export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'editor'

export type AdminStatus = 'active' | 'suspended' | 'revoked'

export interface AdminAccount {
  id: string
  email: string
  full_name: string
  role: AdminRole
  status: AdminStatus
  mfa_enabled: boolean
  last_sign_in_at: string | null
  created_at: string
  updated_at: string
}

export interface AdminInvite {
  id: string
  email: string
  role: AdminRole
  token: string
  invited_by: string
  accepted_at: string | null
  expires_at: string
  created_at: string
}

export interface AuditLog {
  id: string
  admin_id: string
  admin_email: string
  action: string
  resource_type: string
  resource_id: string | null
  details: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

export interface AppContentSection {
  id: string
  section_key: string
  section_type: string
  title: string
  subtitle: string | null
  body: string | null
  image_url: string | null
  video_url: string | null
  button_label: string | null
  button_destination: string | null
  sort_order: number
  is_enabled: boolean
}

export interface AppContentVersion {
  id: string
  version_number: number
  status: 'draft' | 'published' | 'scheduled'
  published_at: string | null
  scheduled_for: string | null
  published_by: string | null
  sections: AppContentSection[]
  settings: AppSettings | null
  created_at: string
}

export interface AppSettings {
  brand_color_primary: string
  brand_color_secondary: string
  brand_color_accent: string
  event_countdown_date: string
  event_countdown_label: string
  nav_items: NavItem[]
  enabled_features: Record<string, boolean>
}

export interface NavItem {
  key: string
  label: string
  icon: string
  sort_order: number
  is_enabled: boolean
}

export interface MediaAsset {
  id: string
  filename: string
  url: string
  mime_type: string
  size_bytes: number
  alt_text: string | null
  uploaded_by: string
  created_at: string
}

export interface AppUser {
  id: string
  email: string
  display_name: string | null
  status: 'active' | 'banned'
  role: string | null
  created_at: string
}

export interface EventRecord {
  id: string
  title: string
  description: string | null
  start_date: string
  end_date: string
  location: string
  is_published: boolean
  banner_image_url: string | null
  created_at: string
}

export interface TicketTier {
  id: string
  event_id: string
  name: string
  price_cents: number
  currency: string
  description: string | null
  capacity: number
  sold: number
  is_active: boolean
}

export interface VipCabana {
  id: string
  name: string
  description: string | null
  price_cents: number
  currency: string
  capacity: number
  is_available: boolean
  image_url: string | null
}

export interface DjLineupEntry {
  id: string
  dj_name: string
  bio: string | null
  genre: string | null
  set_time: string | null
  image_url: string | null
  sort_order: number
}

export interface PushNotification {
  id: string
  title: string
  body: string
  audience: 'all' | 'ticketed' | 'ambassadors'
  sent_at: string | null
  scheduled_for: string | null
  status: 'draft' | 'sent' | 'scheduled'
  created_by: string
  created_at: string
}

export interface CommunityReport {
  id: string
  reporter_id: string
  content_type: string
  content_id: string
  reason: string
  status: 'pending' | 'resolved' | 'dismissed'
  created_at: string
}

export interface Ambassador {
  id: string
  user_id: string
  code: string
  status: 'pending' | 'active' | 'inactive'
  points: number
  referrals: number
  created_at: string
}

export interface TravelGuideEntry {
  id: string
  title: string
  category: string
  body: string
  image_url: string | null
  sort_order: number
  is_published: boolean
}

export interface Promotion {
  id: string
  name: string
  code: string
  discount_percent: number
  starts_at: string
  ends_at: string
  is_active: boolean
  usage_limit: number | null
  used_count: number
}

export interface SupportTicket {
  id: string
  user_id: string | null
  subject: string
  message: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high'
  created_at: string
}

export interface LegalDocument {
  id: string
  doc_key: string
  title: string
  body: string
  version: number
  effective_date: string
  is_current: boolean
}

export const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  super_admin: ['*'],
  admin: [
    'users.manage', 'events.manage', 'tickets.manage', 'vip.manage',
    'djs.manage', 'media.manage', 'notifications.send', 'moderation.manage',
    'ambassadors.manage', 'travel.manage', 'marketing.manage', 'support.manage',
    'content.publish', 'settings.manage', 'analytics.view',
  ],
  editor: [
    'content.publish', 'media.manage', 'djs.manage', 'travel.manage',
    'events.manage', 'analytics.view',
  ],
  moderator: [
    'moderation.manage', 'support.manage', 'users.view',
  ],
}

export function hasPermission(role: AdminRole, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role]
  if (perms.includes('*')) return true
  return perms.includes(permission)
}
