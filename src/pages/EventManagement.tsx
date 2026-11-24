import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { logAction } from '../lib/audit'
import { PageHeader, LoadingSpinner, ErrorState, DataTable, Badge } from '../components/ui'
import { Modal, ConfirmDialog } from '../components/Modal'
import type { EventRecord } from '../lib/types'

const emptyForm = { title: '', description: '', start_date: '', end_date: '', location: '', status: 'draft', banner_image_url: '' }

export default function EventManagement() {
  const [events, setEvents] = useState<EventRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<EventRecord | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<EventRecord | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error: qErr } = await supabase.from('events').select('*').order('created_at', { ascending: false })
      if (qErr) throw qErr
      setEvents(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      if (editing) {
        const { error: uErr } = await supabase.from('events').update({
          title: form.title, description: form.description, start_date: form.start_date, end_date: form.end_date,
          location: form.location, status: form.status, banner_image_url: form.banner_image_url, updated_at: new Date().toISOString(),
        }).eq('id', editing.id)
        if (uErr) throw uErr
        await logAction('event.update', 'event', editing.id)
      } else {
        const { error: iErr } = await supabase.from('events').insert({
          title: form.title, description: form.description, start_date: form.start_date, end_date: form.end_date,
          location: form.location, status: form.status, banner_image_url: form.banner_image_url,
        })
        if (iErr) throw iErr
        await logAction('event.create', 'event', null, { title: form.title })
      }
      setShowForm(false)
      setEditing(null)
      setForm(emptyForm)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save event.')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const { error: dErr } = await supabase.from('events').delete().eq('id', deleteTarget.id)
    if (dErr) { setError(dErr.message); return }
    await logAction('event.delete', 'event', deleteTarget.id)
    await load()
    setDeleteTarget(null)
  }

  const openEdit = (event: EventRecord) => {
    setEditing(event)
    setForm({
      title: event.title, description: event.description ?? '', start_date: event.start_date?.slice(0, 16) ?? '',
      end_date: event.end_date?.slice(0, 16) ?? '', location: event.location, status: event.status, banner_image_url: event.banner_image_url ?? '',
    })
    setShowForm(true)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader title="Event Management" description="Create and manage events." action={
        <button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true) }} className="btn-primary">
          <Plus className="w-4 h-4" /> New Event
        </button>
      } />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}
      <div className="card">
        <DataTable
          columns={[{ key: 'title', label: 'Title' }, { key: 'date', label: 'Start Date' }, { key: 'location', label: 'Location' }, { key: 'status', label: 'Status' }, { key: 'actions', label: 'Actions' }]}
          rows={events}
          emptyMessage="No events yet."
          renderRow={(event: EventRecord) => (
            <tr key={event.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">{event.title}</td>
              <td className="px-4 py-3 text-sm text-slate-600">{event.start_date ? new Date(event.start_date).toLocaleDateString() : '—'}</td>
              <td className="px-4 py-3 text-sm text-slate-600">{event.location}</td>
              <td className="px-4 py-3"><Badge color={event.status === 'published' ? 'green' : 'slate'}>{event.status}</Badge></td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(event)} className="p-1 text-brand-pink-600 hover:text-brand-pink-700"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => setDeleteTarget(event)} className="p-1 text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          )}
        />
      </div>
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Event' : 'New Event'}
        footer={<><button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button></>}>
        <div className="space-y-4">
          <div><label className="label">Title</label><input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="input" /></div>
          <div><label className="label">Description</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input min-h-[80px]" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Start Date</label><input type="datetime-local" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} className="input" /></div>
            <div><label className="label">End Date</label><input type="datetime-local" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} className="input" /></div>
          </div>
          <div><label className="label">Location</label><input type="text" value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="input" /></div>
          <div><label className="label">Banner Image URL</label><input type="text" value={form.banner_image_url} onChange={e => setForm({...form, banner_image_url: e.target.value})} className="input" placeholder="/assets/hero.jpg" /></div>
          <div><label className="label">Status</label><select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="input"><option value="draft">Draft</option><option value="published">Published</option><option value="cancelled">Cancelled</option></select></div>
        </div>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Event" message={`Delete "${deleteTarget?.title}"? This cannot be undone.`} confirmLabel="Delete" danger />
    </div>
  )
}
