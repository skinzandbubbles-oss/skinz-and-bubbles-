import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { logAction } from '../lib/audit'
import { PageHeader, LoadingSpinner, ErrorState, DataTable, Badge } from '../components/ui'
import { Modal, ConfirmDialog } from '../components/Modal'

interface TravelGuideRow {
  id: string
  title: string
  category: string
  body: string
  image_url: string | null
  sort_order: number
  is_published: boolean
  created_at: string
}

const emptyForm = { title: '', category: 'general', body: '', image_url: '', is_published: true }

export default function TravelGuide() {
  const [guides, setGuides] = useState<TravelGuideRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<TravelGuideRow | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TravelGuideRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error: qErr } = await supabase.from('travel_guides').select('*').order('sort_order')
      if (qErr) throw qErr
      setGuides(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load travel guides.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const payload = { title: form.title, category: form.category, body: form.body, image_url: form.image_url || null, is_published: form.is_published }
      if (editing) {
        const { error: uErr } = await supabase.from('travel_guides').update(payload).eq('id', editing.id)
        if (uErr) throw uErr
        await logAction('travel.update', 'travel_guide', editing.id)
      } else {
        const { error: iErr } = await supabase.from('travel_guides').insert({ ...payload, sort_order: guides.length })
        if (iErr) throw iErr
        await logAction('travel.create', 'travel_guide', null, { title: form.title })
      }
      setShowForm(false)
      setEditing(null)
      setForm(emptyForm)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.')
    } finally { setSaving(false) }
  }

  const moveGuide = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= guides.length) return
    const reordered = [...guides]
    ;[reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]]
    for (let i = 0; i < reordered.length; i++) {
      await supabase.from('travel_guides').update({ sort_order: i }).eq('id', reordered[i].id)
    }
    await load()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const { error: dErr } = await supabase.from('travel_guides').delete().eq('id', deleteTarget.id)
    if (dErr) { setError(dErr.message); return }
    await logAction('travel.delete', 'travel_guide', deleteTarget.id)
    await load()
    setDeleteTarget(null)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader title="Travel Guide Management" description="Manage travel guide articles shown in the app." action={
        <button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true) }} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Guide
        </button>
      } />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}
      <div className="card">
        <DataTable
          columns={[
            { key: 'title', label: 'Title' },
            { key: 'category', label: 'Category' },
            { key: 'published', label: 'Published' },
            { key: 'actions', label: 'Actions' },
          ]}
          rows={guides}
          emptyMessage="No travel guides yet."
          renderRow={(guide: TravelGuideRow, index: number) => (
            <tr key={guide.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">{guide.title}</td>
              <td className="px-4 py-3 text-slate-600 capitalize">{guide.category}</td>
              <td className="px-4 py-3"><Badge color={guide.is_published ? 'green' : 'slate'}>{guide.is_published ? 'Yes' : 'No'}</Badge></td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button onClick={() => moveGuide(index, 'up')} disabled={index === 0} className="p-1 text-slate-400 disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
                  <button onClick={() => moveGuide(index, 'down')} disabled={index === guides.length - 1} className="p-1 text-slate-400 disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
                  <button onClick={() => { setEditing(guide); setForm({ title: guide.title, category: guide.category, body: guide.body, image_url: guide.image_url ?? '', is_published: guide.is_published }); setShowForm(true) }} className="p-1 text-brand-pink-600"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => setDeleteTarget(guide)} className="p-1 text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          )}
        />
      </div>
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Guide' : 'Add Guide'}
        footer={<><button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button></>}>
        <div className="space-y-4">
          <div><label className="label">Title</label><input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input" /></div>
          <div><label className="label">Category</label><input type="text" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input" placeholder="general, dining, transport" /></div>
          <div><label className="label">Body</label><textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} className="input min-h-[100px]" /></div>
          <div><label className="label">Image URL</label><input type="text" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} className="input" placeholder="/assets/jamaica.jpg" /></div>
          <div className="flex items-center gap-2"><input type="checkbox" id="pub" checked={form.is_published} onChange={e => setForm({ ...form, is_published: e.target.checked })} className="rounded" /><label htmlFor="pub" className="text-sm text-slate-700">Published</label></div>
        </div>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Guide" message={`Delete "${deleteTarget?.title}"?`} confirmLabel="Delete" danger />
    </div>
  )
}
