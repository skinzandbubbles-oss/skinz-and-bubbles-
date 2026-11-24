import { useState, useEffect, useCallback } from 'react'
import { Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { logAction } from '../lib/audit'
import { PageHeader, LoadingSpinner, ErrorState, DataTable, Badge } from '../components/ui'
import { ConfirmDialog } from '../components/Modal'

interface AmbassadorRow {
  id: string
  user_id: string
  code: string
  status: string
  points: number
  referrals: number
  created_at: string
}

export default function AmbassadorManagement() {
  const [ambassadors, setAmbassadors] = useState<AmbassadorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<AmbassadorRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error: qErr } = await supabase.from('ambassadors').select('*').order('created_at', { ascending: false })
      if (qErr) throw qErr
      setAmbassadors(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ambassadors.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleStatusChange = async (amb: AmbassadorRow, status: 'active' | 'inactive' | 'rejected') => {
    const { error: uErr } = await supabase.from('ambassadors').update({ status, updated_at: new Date().toISOString() }).eq('id', amb.id)
    if (uErr) { setError(uErr.message); return }
    await logAction('ambassador.status_change', 'ambassador', amb.id, { status })
    await load()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const { error: dErr } = await supabase.from('ambassadors').delete().eq('id', deleteTarget.id)
    if (dErr) { setError(dErr.message); return }
    await logAction('ambassador.delete', 'ambassador', deleteTarget.id)
    await load()
    setDeleteTarget(null)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader title="Ambassador Management" description="Manage brand ambassadors and their referral codes." />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}
      <div className="card">
        <DataTable
          columns={[
            { key: 'code', label: 'Code' },
            { key: 'status', label: 'Status' },
            { key: 'points', label: 'Points' },
            { key: 'referrals', label: 'Referrals' },
            { key: 'joined', label: 'Joined' },
            { key: 'actions', label: 'Actions' },
          ]}
          rows={ambassadors}
          emptyMessage="No ambassadors yet."
          renderRow={(amb: AmbassadorRow) => (
            <tr key={amb.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900 font-mono">{amb.code}</td>
              <td className="px-4 py-3">
                <Badge color={amb.status === 'active' ? 'green' : amb.status === 'pending' ? 'yellow' : 'slate'}>{amb.status}</Badge>
              </td>
              <td className="px-4 py-3 text-slate-600">{amb.points}</td>
              <td className="px-4 py-3 text-slate-600">{amb.referrals}</td>
              <td className="px-4 py-3 text-xs text-slate-500">{new Date(amb.created_at).toLocaleDateString()}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <select
                    value={amb.status}
                    onChange={e => handleStatusChange(amb, e.target.value as 'active' | 'inactive' | 'rejected')}
                    className="text-xs border border-slate-200 rounded px-2 py-1"
                  >
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <button onClick={() => setDeleteTarget(amb)} className="p-1 text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          )}
        />
      </div>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Ambassador" message={`Delete ambassador "${deleteTarget?.code}"?`} confirmLabel="Delete" danger />
    </div>
  )
}
