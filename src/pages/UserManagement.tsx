import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { logAction } from '../lib/audit'
import { PageHeader, LoadingSpinner, ErrorState, DataTable, Badge } from '../components/ui'
import { Modal, ConfirmDialog } from '../components/Modal'
import type { AppUser } from '../lib/types'

export default function UserManagement() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [banTarget, setBanTarget] = useState<AppUser | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error: qErr } = await supabase.from('app_users').select('*').order('created_at', { ascending: false })
      if (qErr) throw qErr
      setUsers(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleToggleBan = async () => {
    if (!banTarget) return
    const newStatus = banTarget.status === 'banned' ? 'active' : 'banned'
    const { error: uErr } = await supabase.from('app_users').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', banTarget.id)
    if (uErr) { setError(uErr.message); return }
    await logAction('user.status_change', 'user', banTarget.id, { status: newStatus })
    await load()
    setBanTarget(null)
  }

  const filtered = search ? users.filter(u => u.email?.includes(search) || u.display_name?.includes(search)) : users

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader title="User Management" description="View and manage mobile app users." />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}
      <div className="card">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">All Users ({filtered.length})</h3>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="input max-w-xs text-sm" />
        </div>
        <DataTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'status', label: 'Status' },
            { key: 'joined', label: 'Joined' },
            { key: 'actions', label: 'Actions' },
          ]}
          rows={filtered}
          emptyMessage="No users found."
          renderRow={(user: AppUser) => (
            <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">{user.display_name ?? '—'}</td>
              <td className="px-4 py-3 text-slate-600">{user.email ?? '—'}</td>
              <td className="px-4 py-3">
                <Badge color={user.status === 'active' ? 'green' : 'red'}>{user.status}</Badge>
              </td>
              <td className="px-4 py-3 text-xs text-slate-500">{new Date(user.created_at).toLocaleDateString()}</td>
              <td className="px-4 py-3">
                <button onClick={() => setBanTarget(user)} className="text-sm text-brand-pink-600 hover:text-brand-pink-700">
                  {user.status === 'banned' ? 'Unban' : 'Ban'}
                </button>
              </td>
            </tr>
          )}
        />
      </div>
      <ConfirmDialog
        open={!!banTarget}
        onClose={() => setBanTarget(null)}
        onConfirm={handleToggleBan}
        title={banTarget?.status === 'banned' ? 'Unban User' : 'Ban User'}
        message={banTarget?.status === 'banned' ? `Reactivate ${banTarget?.email}?` : `Ban ${banTarget?.email}? They will lose app access.`}
        confirmLabel={banTarget?.status === 'banned' ? 'Unban' : 'Ban'}
        danger={banTarget?.status !== 'banned'}
      />
    </div>
  )
}
