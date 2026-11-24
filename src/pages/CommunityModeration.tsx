import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { logAction } from '../lib/audit'
import { PageHeader, LoadingSpinner, ErrorState, DataTable, Badge } from '../components/ui'

interface ReportRow {
  id: string
  reporter_id: string | null
  content_type: string
  content_id: string
  reason: string
  status: string
  created_at: string
}

export default function CommunityModeration() {
  const [reports, setReports] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('pending')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error: qErr } = await supabase.from('community_reports').select('*').order('created_at', { ascending: false })
      if (qErr) throw qErr
      setReports(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleResolve = async (report: ReportRow, status: 'resolved' | 'dismissed') => {
    const { error: uErr } = await supabase.from('community_reports').update({ status, updated_at: new Date().toISOString() }).eq('id', report.id)
    if (uErr) { setError(uErr.message); return }
    await logAction('report.' + status, 'report', report.id)
    await load()
  }

  const filtered = reports.filter(r => filter === 'all' || r.status === filter)

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader title="Community Moderation" description="Review and resolve user-submitted content reports." />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}
      <div className="card">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
          {['pending', 'resolved', 'dismissed', 'all'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 text-xs rounded-lg capitalize ${filter === f ? 'bg-brand-pink-100 text-brand-pink-700' : 'text-slate-500 hover:bg-slate-100'}`}>{f}</button>
          ))}
        </div>
        <DataTable
          columns={[
            { key: 'type', label: 'Content Type' },
            { key: 'reason', label: 'Reason' },
            { key: 'status', label: 'Status' },
            { key: 'created', label: 'Reported' },
            { key: 'actions', label: 'Actions' },
          ]}
          rows={filtered}
          emptyMessage="No reports in this category."
          renderRow={(r: ReportRow) => (
            <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-3 text-slate-900 capitalize">{r.content_type}</td>
              <td className="px-4 py-3 text-slate-600">{r.reason}</td>
              <td className="px-4 py-3"><Badge color={r.status === 'pending' ? 'yellow' : r.status === 'resolved' ? 'green' : 'slate'}>{r.status}</Badge></td>
              <td className="px-4 py-3 text-xs text-slate-500">{new Date(r.created_at).toLocaleString()}</td>
              <td className="px-4 py-3">
                {r.status === 'pending' && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleResolve(r, 'resolved')} className="p-1 text-green-600 hover:text-green-700" title="Resolve"><CheckCircle className="w-4 h-4" /></button>
                    <button onClick={() => handleResolve(r, 'dismissed')} className="p-1 text-slate-400 hover:text-slate-600" title="Dismiss"><XCircle className="w-4 h-4" /></button>
                  </div>
                )}
              </td>
            </tr>
          )}
        />
      </div>
    </div>
  )
}
