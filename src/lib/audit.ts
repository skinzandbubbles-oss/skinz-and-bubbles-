import { supabase } from './supabase'

export async function logAction(
  action: string,
  resourceType: string,
  resourceId: string | null = null,
  details: Record<string, unknown> | null = null,
) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('admin_audit_logs').insert({
    admin_id: user.id,
    admin_email: user.email,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    details,
  })
}
