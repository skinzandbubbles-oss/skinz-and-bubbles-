import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Send } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { logAction } from '../lib/audit'
import { PageHeader, LoadingSpinner, ErrorState, DataTable, Badge } from '../components/ui'
import { Modal, ConfirmDialog } from '../components/Modal'

interface NotificationRow {
  id: string
  title: string
  body: string
  audience: string
  status: string
  sent_at: string | null
  scheduled_for: string | null
  created_at: string
}

const emptyForm = { title: '', body: '', audience: 'all', scheduled_for: '' }

export default function PushNotifications() {
  const { admin } = useAuth()
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<NotificationRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error: qErr } = await supabase.from('push_notifications').select('*').order('created_at', { ascending: false })
      if (qErr) throw qErr
      setNotifications(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        body: form.body,
        audience: form.audience,
        created_by: admin?.id,
      }
      if (form.scheduled_for) {
        payload.status = 'scheduled'
        payload.scheduled_for = form.scheduled_for
      } else {
        payload.status = 'sent'
        payload.sent_at = new Date().toISOString()
      }
      const { error: iErr } = await supabase.from('push_notifications').insert(payload)
      if (iErr) throw iErr
      await logAction('notification.create', 'notification', null, { title: form.title })
      setShowForm(false)
      setForm(emptyForm)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save notification.')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const { error: dErr } = await supabase.from('push_notifications').delete().eq('id', deleteTarget.id)
    if (dErr) { setError(dErr.message); return }
    await logAction('notification.delete', 'notification', deleteTarget.id)
    await load()
    setDeleteTarget(null)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader title="Push Notifications" description="Send and schedule push notifications to app users." action={
        <button onClick={() => { setForm(emptyForm); setShowForm(true) }} className="btn-primary">
          <Plus className="w-4 h-4" /> New Notification
        </button>
      } />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}
      <div className="card">
        <DataTable
          columns={[
            { key: 'title', label: 'Title' },
            { key: 'audience', label: 'Audience' },
            { key: 'status', label: 'Status' },
            { key: 'sent', label: 'Sent / Scheduled' },
            { key: 'actions', label: 'Actions' },
          ]}
          rows={notifications}
          emptyMessage="No notifications sent yet."
          renderRow={(n: NotificationRow) => (
            <tr key={n.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">{n.title}</td>
              <td className="px-4 py-3 text-slate-600 capitalize">{n.audience}</td>
              <td className="px-4 py-3"><Badge color={n.status === 'sent' ? 'green' : n.status === 'scheduled' ? 'yellow' : 'slate'}>{n.status}</Badge></td>
              <td className="px-4 py-3 text-xs text-slate-500">
                {n.sent_at ? new Date(n.sent_at).toLocaleString() : n.scheduled_for ? new Date(n.scheduled_for).toLocaleString() : '—'}
              </td>
              <td className="px-4 py-3">
                <button onClick={() => setDeleteTarget(n)} className="p-1 text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
              </td>
            </tr>
          )}
        />
      </div>
      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Push Notification"
        footer={<><button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Sending...' : 'Send'}</button></>}>
        <div className="space-y-4">
          <div><label className="label">Title</label><input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input" /></div>
          <div><label className="label">Message</label><textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} className="input min-h-[80px]" /></div>
          <div><label className="label">Audience</label>
            <select value={form.audience} onChange={e => setForm({ ...form, audience: e.target.value })} className="input">
              <option value="all">All Users</option>
              <option value="ticketed">Ticketed Users</option>
              <option value="ambassadors">Ambassadors</option>
            </select>
          </div>
          <div><label className="label">Schedule (leave empty to send now)</label><input type="datetime-local" value={form.scheduled_for} onChange={e => setForm({ ...form, scheduled_for: e.target.value })} className="input" /></div>
        </div>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Notification" message={`Delete "${deleteTarget?.title}"?`} confirmLabel="Delete" danger />
    </div>
  )
}
