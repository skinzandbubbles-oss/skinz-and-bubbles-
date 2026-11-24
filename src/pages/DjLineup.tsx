import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { logAction } from '../lib/audit'
import { PageHeader, LoadingSpinner, ErrorState, DataTable, Badge } from '../components/ui'
import { Modal, ConfirmDialog } from '../components/Modal'

export default function DjLineup() {
  const [djs, setDjs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ dj_name: '', bio: '', genre: '', set_time: '', image_url: '', is_published: true })
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error: qErr } = await supabase.from('dj_lineup').select('*').order('sort_order')
      if (qErr) throw qErr
      setDjs(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load DJs.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const payload = { dj_name: form.dj_name, bio: form.bio, genre: form.genre, set_time: form.set_time || null, image_url: form.image_url, is_published: form.is_published }
      if (editing) {
        const { error: uErr } = await supabase.from('dj_lineup').update(payload).eq('id', editing.id)
        if (uErr) throw uErr
        await logAction('dj.update', 'dj', editing.id)
      } else {
        const { error: iErr } = await supabase.from('dj_lineup').insert({ ...payload, sort_order: djs.length })
        if (iErr) throw iErr
        await logAction('dj.create', 'dj', null, { name: form.dj_name })
      }
      setShowForm(false)
      setEditing(null)
      setForm({ dj_name: '', bio: '', genre: '', set_time: '', image_url: '', is_published: true })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.')
    } finally { setSaving(false) }
  }

  const moveDj = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= djs.length) return
    const reordered = [...djs]
    ;[reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]]
    for (let i = 0; i < reordered.length; i++) {
      await supabase.from('dj_lineup').update({ sort_order: i }).eq('id', reordered[i].id)
    }
    await load()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const { error: dErr } = await supabase.from('dj_lineup').delete().eq('id', deleteTarget.id)
    if (dErr) { setError(dErr.message); return }
    await logAction('dj.delete', 'dj', deleteTarget.id)
    await load()
    setDeleteTarget(null)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader title="DJ Lineup" description="Manage the DJ lineup for events." action={
        <button onClick={() => { setEditing(null); setForm({ dj_name: '', bio: '', genre: '', set_time: '', image_url: '', is_published: true }); setShowForm(true) }} className="btn-primary">
          <Plus className="w-4 h-4" /> Add DJ
        </button>
      } />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}
      <div className="card">
        <DataTable
          columns={[{ key: 'name', label: 'DJ Name' }, { key: 'genre', label: 'Genre' }, { key: 'set', label: 'Set Time' }, { key: 'published', label: 'Published' }, { key: 'actions', label: 'Actions' }]}
          rows={djs}
          emptyMessage="No DJs added yet."
          renderRow={(dj: any, index) => (
            <tr key={dj.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">{dj.dj_name}</td>
              <td className="px-4 py-3 text-slate-600">{dj.genre ?? '—'}</td>
              <td className="px-4 py-3 text-xs text-slate-500">{dj.set_time ? new Date(dj.set_time).toLocaleString() : '—'}</td>
              <td className="px-4 py-3"><Badge color={dj.is_published ? 'green' : 'slate'}>{dj.is_published ? 'Yes' : 'No'}</Badge></td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button onClick={() => moveDj(index, 'up')} disabled={index === 0} className="p-1 text-slate-400 disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
                  <button onClick={() => moveDj(index, 'down')} disabled={index === djs.length - 1} className="p-1 text-slate-400 disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
                  <button onClick={() => { setEditing(dj); setForm({ dj_name: dj.dj_name, bio: dj.bio ?? '', genre: dj.genre ?? '', set_time: dj.set_time?.slice(0, 16) ?? '', image_url: dj.image_url ?? '', is_published: dj.is_published }); setShowForm(true) }} className="p-1 text-brand-pink-600"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => setDeleteTarget(dj)} className="p-1 text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          )}
        />
      </div>
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit DJ' : 'Add DJ'}
        footer={<><button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button></>}>
        <div className="space-y-4">
          <div><label className="label">DJ Name</label><input type="text" value={form.dj_name} onChange={e => setForm({...form, dj_name: e.target.value})} className="input" /></div>
          <div><label className="label">Genre</label><input type="text" value={form.genre} onChange={e => setForm({...form, genre: e.target.value})} className="input" placeholder="House, Reggae, Dancehall" /></div>
          <div><label className="label">Bio</label><textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} className="input min-h-[60px]" /></div>
          <div><label className="label">Set Time</label><input type="datetime-local" value={form.set_time} onChange={e => setForm({...form, set_time: e.target.value})} className="input" /></div>
          <div><label className="label">Image URL</label><input type="text" value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} className="input" placeholder="/assets/dj.jpg" /></div>
          <div className="flex items-center gap-2"><input type="checkbox" id="pub" checked={form.is_published} onChange={e => setForm({...form, is_published: e.target.checked})} className="rounded" /><label htmlFor="pub" className="text-sm text-slate-700">Published</label></div>
        </div>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete DJ" message={`Delete "${deleteTarget?.dj_name}"?`} confirmLabel="Delete" danger />
    </div>
  )
}
