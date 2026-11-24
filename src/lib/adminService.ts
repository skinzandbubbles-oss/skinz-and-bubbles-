import { supabase } from "../lib/supabase";
import { logAction } from "../lib/audit";
import type { AdminAccount, AdminRole } from "../lib/types";

export async function inviteAdmin(email: string, role: AdminRole, invitedById: string): Promise<{ token?: string; error?: string }> {
  const { data: existing } = await supabase
    .from('admin_accounts')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (existing) return { error: 'An admin with this email already exists.' };

  const { data: existingInvite } = await supabase
    .from('admin_invites')
    .select('id')
    .eq('email', email)
    .is('accepted_at', null)
    .maybeSingle();
  if (existingInvite) return { error: 'A pending invitation already exists for this email.' };

  const token = crypto.randomUUID();
  const { error } = await supabase.from('admin_invites').insert({
    email,
    role,
    token,
    invited_by: invitedById,
  });
  if (error) return { error: error.message };

  await logAction('admin.invite', 'invite', null, { email, role });
  return { token };
}

export async function updateAdminRole(adminId: string, role: AdminRole): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('admin_accounts')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', adminId);
  if (error) return { error: error.message };
  await logAction('admin.role_change', 'admin', adminId, { role });
  return {};
}

export async function updateAdminStatus(adminId: string, status: 'active' | 'suspended' | 'revoked'): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('admin_accounts')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', adminId);
  if (error) return { error: error.message };
  await logAction('admin.status_change', 'admin', adminId, { status });
  return {};
}

export async function revokeInvite(inviteId: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('admin_invites').delete().eq('id', inviteId);
  if (error) return { error: error.message };
  await logAction('invite.revoke', 'invite', inviteId);
  return {};
}

export async function fetchAdminAccounts(): Promise<AdminAccount[]> {
  const { data, error } = await supabase
    .from('admin_accounts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchInvites() {
  const { data, error } = await supabase
    .from('admin_invites')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
