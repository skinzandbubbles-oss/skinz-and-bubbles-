import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { logAction } from '../lib/audit'
import { PageHeader, LoadingSpinner, ErrorState, DataTable, Badge } from '../components/ui'
import { Modal, ConfirmDialog } from '../components/Modal'

interface PromotionRow {
  id: string
  name: string
  code: string
  discount_percent: number
  starts_at: string
  ends_at: string
  is_active: boolean
  usage_limit: number | null
  used_count: number
  created_at: string
}

const emptyForm = { name: '', code: '', discount_percent: 10, starts_at: '', ends_at: '', is_active: true, usage_limit: '' }

export default function MarketingPromotions() {
  const [promotions, setPromotions] = useState<PromotionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<PromotionRow | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PromotionRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error: qErr } = await supabase.from('promotions').select('*').order('created_at', { ascending: false })
      if (qErr) throw qErr
      setPromotions(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load promotions.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: form.name,
        code: form.code.toUpperCase(),
        discount_percent: Number(form.discount_percent),
        starts_at: form.starts_at || new Date().toISOString(),
        ends_at: form.ends_at || new Date(Date.now() + 30 * 86400000).toISOString(),
        is_active: form.is_active,
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      }
      if (editing) {
        const { error: uErr } = await supabase.from('promotions').update(payload).eq('id', editing.id)
        if (uErr) throw uErr
        await logAction('promotion.update', 'promotion', editing.id)
      } else {
        const { error: iErr } = await supabase.from('promotions').insert(payload)
        if (iErr) throw iErr
        await logAction('promotion.create', 'promotion', null, { code: payload.code })
      }
      setShowForm(false)
      setEditing(null)
      setForm(emptyForm)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save promotion.')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const { error: dErr } = await supabase.from('promotions').delete().eq('id', deleteTarget.id)
    if (dErr) { setError(dErr.message); return }
    await logAction('promotion.delete', 'promotion', deleteTarget.id)
    await load()
    setDeleteTarget(null)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader title="Marketing & Promotions" description="Create and manage discount codes and promotions." action={
        <button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true) }} className="btn-primary">
          <Plus className="w-4 h-4" /> New Promotion
        </button>
      } />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}
      <div className="card">
        <DataTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'code', label: 'Code' },
            { key: 'discount', label: 'Discount' },
            { key: 'usage', label: 'Usage' },
            { key: 'status', label: 'Status' },
            { key: 'actions', label: 'Actions' },
          ]}
          rows={promotions}
          emptyMessage="No promotions yet."
          renderRow={(promo: PromotionRow) => (
            <tr key={promo.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">{promo.name}</td>
              <td className="px-4 py-3 font-mono text-slate-700">{promo.code}</td>
              <td className="px-4 py-3 text-slate-600">{promo.discount_percent}%</td>
              <td className="px-4 py-3 text-slate-600 text-xs">{promo.used_count}{promo.usage_limit ? ` / ${promo.usage_limit}` : ''}</td>
              <td className="px-4 py-3"><Badge color={promo.is_active ? 'green' : 'slate'}>{promo.is_active ? 'Active' : 'Inactive'}</Badge></td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <button onClick={() => { setEditing(promo); setForm({ name: promo.name, code: promo.code, discount_percent: promo.discount_percent, starts_at: promo.starts_at?.slice(0, 16) ?? '', ends_at: promo.ends_at?.slice(0, 16) ?? '', is_active: promo.is_active, usage_limit: promo.usage_limit?.toString() ?? '' }); setShowForm(true) }} className="p-1 text-brand-pink-600"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => setDeleteTarget(promo)} className="p-1 text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          )}
        />
      </div>
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Promotion' : 'New Promotion'}
        footer={<><button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button></>}>
        <div className="space-y-4">
          <div><label className="label">Name</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input" /></div>
          <div><label className="label">Code</label><input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} className="input font-mono" placeholder="SUMMER10" /></div>
          <div><label className="label">Discount (%)</label><input type="number" min={0} max={100} value={form.discount_percent} onChange={e => setForm({ ...form, discount_percent: Number(e.target.value) })} className="input" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Starts</label><input type="datetime-local" value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} className="input" /></div>
            <div><label className="label">Ends</label><input type="datetime-local" value={form.ends_at} onChange={e => setForm({ ...form, ends_at: e.target.value })} className="input" /></div>
          </div>
          <div><label className="label">Usage Limit (empty = unlimited)</label><input type="number" min={0} value={form.usage_limit} onChange={e => setForm({ ...form, usage_limit: e.target.value })} className="input" /></div>
          <div className="flex items-center gap-2"><input type="checkbox" id="active" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="rounded" /><label htmlFor="active" className="text-sm text-slate-700">Active</label></div>
        </div>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Promotion" message={`Delete "${deleteTarget?.name}"?`} confirmLabel="Delete" danger />
    </div>
  )
}
