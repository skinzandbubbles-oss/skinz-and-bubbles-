import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { logAction } from '../lib/audit'
import { PageHeader, LoadingSpinner, ErrorState, DataTable, Badge } from '../components/ui'
import { Modal, ConfirmDialog } from '../components/Modal'

interface LegalDocRow {
  id: string
  doc_key: string
  title: string
  body: string
  version: number
  effective_date: string
  is_current: boolean
  created_at: string
}

const emptyForm = { doc_key: '', title: '', body: '', is_current: true }

export default function LegalDocuments() {
  const { admin } = useAuth()
  const [docs, setDocs] = useState<LegalDocRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<LegalDocRow | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<LegalDocRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error: qErr } = await supabase.from('legal_documents').select('*').order('created_at', { ascending: false })
      if (qErr) throw qErr
      setDocs(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load legal documents.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      if (editing) {
        const newVersion = editing.version + 1
        if (form.is_current) {
          await supabase.from('legal_documents').update({ is_current: false }).eq('doc_key', editing.doc_key)
        }
        const { error: iErr } = await supabase.from('legal_documents').insert({
          doc_key: editing.doc_key,
          title: form.title,
          body: form.body,
          version: newVersion,
          effective_date: new Date().toISOString(),
          is_current: form.is_current,
          updated_by: admin?.id,
        })
        if (iErr) throw iErr
        await logAction('legal.update', 'legal_document', editing.id, { version: newVersion })
      } else {
        const { error: iErr } = await supabase.from('legal_documents').insert({
          doc_key: form.doc_key,
          title: form.title,
          body: form.body,
          version: 1,
          effective_date: new Date().toISOString(),
          is_current: form.is_current,
          updated_by: admin?.id,
        })
        if (iErr) throw iErr
        await logAction('legal.create', 'legal_document', null, { doc_key: form.doc_key })
      }
      setShowForm(false)
      setEditing(null)
      setForm(emptyForm)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save document.')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const { error: dErr } = await supabase.from('legal_documents').delete().eq('id', deleteTarget.id)
    if (dErr) { setError(dErr.message); return }
    await logAction('legal.delete', 'legal_document', deleteTarget.id)
    await load()
    setDeleteTarget(null)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader title="Legal Documents" description="Manage privacy policy, terms of service, and community guidelines." action={
        <button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true) }} className="btn-primary">
          <Plus className="w-4 h-4" /> New Document
        </button>
      } />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}
      <div className="card">
        <DataTable
          columns={[
            { key: 'title', label: 'Title' },
            { key: 'key', label: 'Key' },
            { key: 'version', label: 'Version' },
            { key: 'current', label: 'Current' },
            { key: 'effective', label: 'Effective Date' },
            { key: 'actions', label: 'Actions' },
          ]}
          rows={docs}
          emptyMessage="No legal documents yet."
          renderRow={(doc: LegalDocRow) => (
            <tr key={doc.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">{doc.title}</td>
              <td className="px-4 py-3 font-mono text-xs text-slate-600">{doc.doc_key}</td>
              <td className="px-4 py-3 text-slate-600">v{doc.version}</td>
              <td className="px-4 py-3"><Badge color={doc.is_current ? 'green' : 'slate'}>{doc.is_current ? 'Yes' : 'No'}</Badge></td>
              <td className="px-4 py-3 text-xs text-slate-500">{new Date(doc.effective_date).toLocaleDateString()}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <button onClick={() => { setEditing(doc); setForm({ doc_key: doc.doc_key, title: doc.title, body: doc.body, is_current: doc.is_current }); setShowForm(true) }} className="p-1 text-brand-pink-600"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => setDeleteTarget(doc)} className="p-1 text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          )}
        />
      </div>
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? `Update: ${editing.title}` : 'New Legal Document'}
        footer={<><button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button></>}>
        <div className="space-y-4">
          {!editing && (
            <div><label className="label">Document Key</label><input type="text" value={form.doc_key} onChange={e => setForm({ ...form, doc_key: e.target.value })} className="input font-mono" placeholder="privacy_policy, terms_of_service" /></div>
          )}
          <div><label className="label">Title</label><input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input" /></div>
          <div><label className="label">Body</label><textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} className="input min-h-[200px]" /></div>
          <div className="flex items-center gap-2"><input type="checkbox" id="current" checked={form.is_current} onChange={e => setForm({ ...form, is_current: e.target.checked })} className="rounded" /><label htmlFor="current" className="text-sm text-slate-700">Set as current version</label></div>
        </div>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Document" message={`Delete "${deleteTarget?.title}" v${deleteTarget?.version}?`} confirmLabel="Delete" danger />
    </div>
  )
}
