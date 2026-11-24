import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { logAction } from '../lib/audit'
import { PageHeader, LoadingSpinner, ErrorState, DataTable, Badge } from '../components/ui'
import { Modal, ConfirmDialog } from '../components/Modal'

export default function VipManagement() {
  const [cabanas, setCabanas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ name: '', description: '', price_cents: 0, capacity: 4, is_available: true, image_url: '', sort_order: 0 })
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error: qErr } = await supabase.from('vip_cabanas').select('*').order('sort_order')
      if (qErr) throw qErr
      setCabanas(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load VIP cabanas.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      if (editing) {
        const { error: uErr } = await supabase.from('vip_cabanas').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editing.id)
        if (uErr) throw uErr
        await logAction('vip.update', 'cabana', editing.id)
      } else {
        const { error: iErr } = await supabase.from('vip_cabanas').insert(form)
        if (iErr) throw iErr
        await logAction('vip.create', 'cabana', null, { name: form.name })
      }
      setShowForm(false)
      setEditing(null)
      setForm({ name: '', description: '', price_cents: 0, capacity: 4, is_available: true, image_url: '', sort_order: 0 })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const { error: dErr } = await supabase.from('vip_cabanas').delete().eq('id', deleteTarget.id)
    if (dErr) { setError(dErr.message); return }
    await logAction('vip.delete', 'cabana', deleteTarget.id)
    await load()
    setDeleteTarget(null)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader title="VIP & Cabana Management" description="Manage VIP cabana packages." action={
        <button onClick={() => { setEditing(null); setForm({ name: '', description: '', price_cents: 0, capacity: 4, is_available: true, image_url: '', sort_order: 0 }); setShowForm(true) }} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Cabana
        </button>
      } />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}
      <div className="card">
        <DataTable
          columns={[{ key: 'name', label: 'Name' }, { key: 'price', label: 'Price' }, { key: 'capacity', label: 'Capacity' }, { key: 'available', label: 'Available' }, { key: 'actions', label: 'Actions' }]}
          rows={cabanas}
          emptyMessage="No VIP cabanas configured."
          renderRow={(c: any) => (
            <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
              <td className="px-4 py-3 text-slate-600">${(c.price_cents / 100).toFixed(2)}</td>
              <td className="px-4 py-3 text-slate-600">{c.capacity}</td>
              <td className="px-4 py-3"><Badge color={c.is_available ? 'green' : 'slate'}>{c.is_available ? 'Yes' : 'No'}</Badge></td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <button onClick={() => { setEditing(c); setForm({ name: c.name, description: c.description ?? '', price_cents: c.price_cents, capacity: c.capacity, is_available: c.is_available, image_url: c.image_url ?? '', sort_order: c.sort_order }); setShowForm(true) }} className="p-1 text-brand-pink-600"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => setDeleteTarget(c)} className="p-1 text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          )}
        />
      </div>
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Cabana' : 'Add Cabana'}
        footer={<><button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button></>}>
        <div className="space-y-4">
          <div><label className="label">Name</label><input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input" /></div>
          <div><label className="label">Description</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input min-h-[60px]" /></div>
          <div><label className="label">Price (USD)</label><input type="number" value={form.price_cents / 100} onChange={e => setForm({...form, price_cents: Math.round(parseFloat(e.target.value || '0') * 100)})} className="input" step="0.01" /></div>
          <div><label className="label">Capacity</label><input type="number" value={form.capacity} onChange={e => setForm({...form, capacity: parseInt(e.target.value || '0')})} className="input" /></div>
          <div><label className="label">Image URL</label><input type="text" value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} className="input" placeholder="/assets/cabana.jpg" /></div>
          <div className="flex items-center gap-2"><input type="checkbox" id="avail" checked={form.is_available} onChange={e => setForm({...form, is_available: e.target.checked})} className="rounded" /><label htmlFor="avail" className="text-sm text-slate-700">Available</label></div>
        </div>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Cabana" message={`Delete "${deleteTarget?.name}"?`} confirmLabel="Delete" danger />
    </div>
  )
}
