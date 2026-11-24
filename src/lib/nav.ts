import {
  LayoutDashboard, Smartphone, Users, Calendar, Ticket, Crown,
  Music, Image, Bell, Shield, Award, Plane, Megaphone, LifeBuoy,
  BarChart3, FileText, UserCog, Lock, Settings,
} from 'lucide-react'
import { AdminRole, hasPermission } from './types'

export interface NavSection {
  label: string
  path: string
  icon: typeof LayoutDashboard
  permission: string
}

export const NAV_SECTIONS: NavSection[] = [
  { label: 'Dashboard Overview', path: '/admin/dashboard', icon: LayoutDashboard, permission: 'analytics.view' },
  { label: 'Visual App Builder', path: '/admin/app-builder', icon: Smartphone, permission: 'content.publish' },
  { label: 'User Management', path: '/admin/users', icon: Users, permission: 'users.view' },
  { label: 'Event Management', path: '/admin/events', icon: Calendar, permission: 'events.manage' },
  { label: 'Ticket Management', path: '/admin/tickets', icon: Ticket, permission: 'tickets.manage' },
  { label: 'VIP & Cabana Management', path: '/admin/vip', icon: Crown, permission: 'vip.manage' },
  { label: 'DJ Lineup', path: '/admin/djs', icon: Music, permission: 'djs.manage' },
  { label: 'Media Library', path: '/admin/media', icon: Image, permission: 'media.manage' },
  { label: 'Push Notifications', path: '/admin/notifications', icon: Bell, permission: 'notifications.send' },
  { label: 'Community Moderation', path: '/admin/moderation', icon: Shield, permission: 'moderation.manage' },
  { label: 'Ambassador Management', path: '/admin/ambassadors', icon: Award, permission: 'ambassadors.manage' },
  { label: 'Travel Guide Management', path: '/admin/travel', icon: Plane, permission: 'travel.manage' },
  { label: 'Marketing & Promotions', path: '/admin/marketing', icon: Megaphone, permission: 'marketing.manage' },
  { label: 'Customer Support', path: '/admin/support', icon: LifeBuoy, permission: 'support.manage' },
  { label: 'Analytics & Reports', path: '/admin/analytics', icon: BarChart3, permission: 'analytics.view' },
  { label: 'Legal Documents', path: '/admin/legal', icon: FileText, permission: 'content.publish' },
  { label: 'Administrator Accounts', path: '/admin/administrators', icon: UserCog, permission: '*' },
  { label: 'Security & Audit Logs', path: '/admin/security', icon: Lock, permission: 'analytics.view' },
  { label: 'App Settings', path: '/admin/settings', icon: Settings, permission: 'settings.manage' },
]

export function getVisibleSections(role: AdminRole): NavSection[] {
  return NAV_SECTIONS.filter(s => hasPermission(role, s.permission))
}
