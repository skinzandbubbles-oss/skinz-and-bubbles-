import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { logAction } from '../lib/audit'
import { PageHeader, LoadingSpinner, ErrorState, DataTable, Badge } from '../components/ui'

interface SupportTicketRow {
  id: string
  user_id: string | null
  user_email: string | null
  subject: string
  message: string
  status: string
  priority: string
  created_at: string
  updated_at: string
}

export default function CustomerSupport() {
  const [tickets, setTickets] = useState<SupportTicketRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('open')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error: qErr } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false })
      if (qErr) throw qErr
      setTickets(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load support tickets.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleStatusChange = async (ticket: SupportTicketRow, status: 'open' | 'in_progress' | 'resolved' | 'closed') => {
    const { error: uErr } = await supabase.from('support_tickets').update({ status, updated_at: new Date().toISOString() }).eq('id', ticket.id)
    if (uErr) { setError(uErr.message); return }
    await logAction('support.status_change', 'support_ticket', ticket.id, { status })
    await load()
  }

  const filtered = tickets.filter(t => filter === 'all' || t.status === filter)

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader title="Customer Support" description="Review and manage support tickets from app users." />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}
      <div className="card">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
          {['open', 'in_progress', 'resolved', 'closed', 'all'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 text-xs rounded-lg capitalize ${filter === f ? 'bg-brand-pink-100 text-brand-pink-700' : 'text-slate-500 hover:bg-slate-100'}`}>{f.replace('_', ' ')}</button>
          ))}
        </div>
        <DataTable
          columns={[
            { key: 'subject', label: 'Subject' },
            { key: 'email', label: 'User' },
            { key: 'priority', label: 'Priority' },
            { key: 'status', label: 'Status' },
            { key: 'created', label: 'Created' },
            { key: 'actions', label: 'Actions' },
          ]}
          rows={filtered}
          emptyMessage="No tickets in this category."
          renderRow={(t: SupportTicketRow) => (
            <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">{t.subject}</td>
              <td className="px-4 py-3 text-slate-600 text-xs">{t.user_email ?? '—'}</td>
              <td className="px-4 py-3"><Badge color={t.priority === 'high' || t.priority === 'urgent' ? 'red' : t.priority === 'medium' ? 'yellow' : 'slate'}>{t.priority}</Badge></td>
              <td className="px-4 py-3"><Badge color={t.status === 'resolved' || t.status === 'closed' ? 'green' : t.status === 'in_progress' ? 'aqua' : 'yellow'}>{t.status.replace('_', ' ')}</Badge></td>
              <td className="px-4 py-3 text-xs text-slate-500">{new Date(t.created_at).toLocaleDateString()}</td>
              <td className="px-4 py-3">
                <select
                  value={t.status}
                  onChange={e => handleStatusChange(t, e.target.value as 'open' | 'in_progress' | 'resolved' | 'closed')}
                  className="text-xs border border-slate-200 rounded px-2 py-1"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </td>
            </tr>
          )}
        />
      </div>
    </div>
  )
}
