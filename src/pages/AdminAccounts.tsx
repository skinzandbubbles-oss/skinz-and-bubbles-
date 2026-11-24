import { useState, useEffect, useCallback } from 'react'
import { UserPlus, Shield, MoreVertical, Ban, CheckCircle, RotateCcw, Trash2 } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { logAction } from '../lib/audit'
import { fetchAdminAccounts, fetchInvites, inviteAdmin, updateAdminRole, updateAdminStatus, revokeInvite } from '../lib/adminService'
import { AdminRole } from '../lib/types'
import type { AdminAccount, AdminInvite } from '../lib/types'
import { PageHeader, LoadingSpinner, ErrorState, Badge, DataTable } from '../components/ui'
import { Modal, ConfirmDialog } from '../components/Modal'

export default function AdminAccounts() {
  const { admin: currentUser } = useAuth()
  const [admins, setAdmins] = useState<AdminAccount[]>([])
  const [invites, setInvites] = useState<AdminInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<AdminRole>('editor')
  const [inviteError, setInviteError] = useState('')
  const [inviting, setInviting] = useState(false)
  const [actionTarget, setActionTarget] = useState<AdminAccount | null>(null)
  const [actionType, setActionType] = useState<string>('')
  const [confirmAction, setConfirmAction] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [a, i] = await Promise.all([fetchAdminAccounts(), fetchInvites()])
      setAdmins(a)
      setInvites(i)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleInvite = async () => {
    setInviteError('')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      setInviteError('Enter a valid email address.')
      return
    }
    if (!currentUser) return
    setInviting(true)
    const { token, error: invErr } = await inviteAdmin(inviteEmail.trim().toLowerCase(), inviteRole, currentUser.id)
    setInviting(false)
    if (invErr) {
      setInviteError(invErr)
      return
    }
    setShowInvite(false)
    setInviteEmail('')
    setInviteRole('editor')
    await load()
  }

  const handleAction = async () => {
    if (!actionTarget) return
    setError('')
    if (actionType === 'role') {
      const { error: rErr } = await updateAdminRole(actionTarget.id, 'admin' as AdminRole)
      if (rErr) { setError(rErr); return }
    } else if (actionType === 'suspend') {
      const { error: sErr } = await updateAdminStatus(actionTarget.id, 'suspended')
      if (sErr) { setError(sErr); return }
    } else if (actionType === 'activate') {
      const { error: aErr } = await updateAdminStatus(actionTarget.id, 'active')
      if (aErr) { setError(aErr); return }
    } else if (actionType === 'revoke') {
      const { error: rvErr } = await updateAdminStatus(actionTarget.id, 'revoked')
      if (rvErr) { setError(rvErr); return }
    }
    await load()
    setActionTarget(null)
  }

  const handleRevokeInvite = async (inviteId: string) => {
    const { error: rErr } = await revokeInvite(inviteId)
    if (rErr) { setError(rErr); return }
    await load()
  }

  const isSuperAdmin = currentUser?.role === 'super_admin'

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader
        title="Administrator Accounts"
        description="Manage admin users, roles, and invitations."
        action={isSuperAdmin && (
          <button onClick={() => setShowInvite(true)} className="btn-primary">
            <UserPlus className="w-4 h-4" /> Invite Admin
          </button>
        )}
      />

      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      <div className="card mb-6">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Admin Accounts</h3>
        </div>
        <DataTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'role', label: 'Role' },
            { key: 'status', label: 'Status' },
            { key: 'mfa', label: 'MFA' },
            { key: 'actions', label: 'Actions' },
          ]}
          rows={admins}
          renderRow={(admin: AdminAccount) => (
            <tr key={admin.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">{admin.full_name}</td>
              <td className="px-4 py-3 text-slate-600">{admin.email}</td>
              <td className="px-4 py-3">
                <Badge color={admin.role === 'super_admin' ? 'pink' : admin.role === 'admin' ? 'aqua' : 'slate'}>
                  {admin.role.replace('_', ' ')}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <Badge color={admin.status === 'active' ? 'green' : admin.status === 'suspended' ? 'yellow' : 'red'}>
                  {admin.status}
                </Badge>
              </td>
              <td className="px-4 py-3">
                {admin.mfa_enabled ? (
                  <Badge color="green">Enabled</Badge>
                ) : (
                  <Badge color="slate">Off</Badge>
                )}
              </td>
              <td className="px-4 py-3">
                {isSuperAdmin && admin.id !== currentUser?.id ? (
                  <div className="flex items-center gap-1">
                    {admin.status === 'active' ? (
                      <button onClick={() => { setActionTarget(admin); setActionType('suspend'); setConfirmAction(true) }}
                        className="p-1 text-yellow-600 hover:text-yellow-700" title="Suspend">
                        <Ban className="w-4 h-4" />
                      </button>
                    ) : (
                      <button onClick={() => { setActionTarget(admin); setActionType('activate'); setConfirmAction(true) }}
                        className="p-1 text-green-600 hover:text-green-700" title="Activate">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => { setActionTarget(admin); setActionType('revoke'); setConfirmAction(true) }}
                      className="p-1 text-red-500 hover:text-red-700" title="Revoke">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">{admin.id === currentUser?.id ? 'You' : '—'}</span>
                )}
              </td>
            </tr>
          )}
        />
      </div>

      <div className="card">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Pending Invitations</h3>
        </div>
        <DataTable
          columns={[
            { key: 'email', label: 'Email' },
            { key: 'role', label: 'Role' },
            { key: 'expires', label: 'Expires' },
            { key: 'actions', label: 'Actions' },
          ]}
          rows={invites.filter(i => !i.accepted_at)}
          emptyMessage="No pending invitations."
          renderRow={(invite: AdminInvite) => {
            const expired = new Date(invite.expires_at) < new Date()
            return (
              <tr key={invite.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-900">{invite.email}</td>
                <td className="px-4 py-3">
                  <Badge color="aqua">{invite.role.replace('_', ' ')}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-600 text-xs">
                  {new Date(invite.expires_at).toLocaleDateString()}
                  {expired && <span className="text-red-500 ml-1">(expired)</span>}
                </td>
                <td className="px-4 py-3">
                  {isSuperAdmin && (
                    <button onClick={() => handleRevokeInvite(invite.id)} className="p-1 text-red-500 hover:text-red-700" title="Revoke">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            )
          }}
        />
      </div>

      <Modal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        title="Invite Administrator"
        footer={
          <>
            <button onClick={() => setShowInvite(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleInvite} disabled={inviting} className="btn-primary">
              {inviting ? 'Sending...' : 'Send Invitation'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Email Address</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              className="input"
              placeholder="newadmin@skinzbubbles.com"
            />
          </div>
          <div>
            <label className="label">Role</label>
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value as AdminRole)} className="input">
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="moderator">Moderator</option>
            </select>
            <p className="text-xs text-slate-400 mt-1">Super Admin can only be assigned by another Super Admin.</p>
          </div>
          {inviteError && <ErrorState message={inviteError} />}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmAction}
        onClose={() => { setConfirmAction(false); setActionTarget(null) }}
        onConfirm={handleAction}
        title={actionType === 'suspend' ? 'Suspend Admin' : actionType === 'revoke' ? 'Revoke Admin' : 'Activate Admin'}
        message={
          actionType === 'suspend' ? `Suspend ${actionTarget?.email}? They will lose access immediately.` :
          actionType === 'revoke' ? `Revoke ${actionTarget?.email}? This permanently removes their admin access.` :
          `Reactivate ${actionTarget?.email}? They will regain admin access.`
        }
        confirmLabel={actionType === 'suspend' ? 'Suspend' : actionType === 'revoke' ? 'Revoke' : 'Activate'}
        danger={actionType === 'suspend' || actionType === 'revoke'}
      />
    </div>
  )
}
