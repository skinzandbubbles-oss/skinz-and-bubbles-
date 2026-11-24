import { useState, useEffect, useCallback } from 'react'
import { Upload, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { logAction } from '../lib/audit'
import { PageHeader, LoadingSpinner, ErrorState, Badge } from '../components/ui'
import { ConfirmDialog } from '../components/Modal'

export default function MediaLibrary() {
  const { admin } = useAuth()
  const [assets, setAssets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error: qErr } = await supabase.from('media_assets').select('*').order('created_at', { ascending: false })
      if (qErr) throw qErr
      setAssets(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load media.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !admin) return
    setUploading(true)
    setError('')
    try {
      const ext = file.name.split('.').pop()
      const filename = `${Date.now()}.${ext}`
      const path = `media/${filename}`
      const { error: upErr } = await supabase.storage.from('media').upload(path, file)
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('media').getPublicUrl(path)
      const { error: dbErr } = await supabase.from('media_assets').insert({
        filename: file.name, storage_path: path, url: urlData.publicUrl,
        mime_type: file.type, size_bytes: file.size, uploaded_by: admin.id,
      })
      if (dbErr) throw dbErr
      await logAction('media.upload', 'media', null, { filename: file.name })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally { setUploading(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await supabase.storage.from('media').remove([deleteTarget.storage_path])
      await supabase.from('media_assets').delete().eq('id', deleteTarget.id)
      await logAction('media.delete', 'media', deleteTarget.id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete.')
    }
    setDeleteTarget(null)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader title="Media Library" description="Upload and manage images and videos." action={
        <label className="btn-primary cursor-pointer">
          <Upload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload'}
          <input type="file" onChange={handleUpload} className="hidden" accept="image/*,video/*" />
        </label>
      } />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      {assets.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-400">No media uploaded yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {assets.map((asset: any) => (
            <div key={asset.id} className="card overflow-hidden group">
              <div className="aspect-square bg-slate-100 relative">
                {asset.mime_type.startsWith('image/') ? (
                  <img src={asset.url} alt={asset.alt_text ?? asset.filename} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400 text-xs">Video</div>
                )}
                <button onClick={() => setDeleteTarget(asset)} className="absolute top-2 right-2 bg-white/90 rounded p-1 opacity-0 group-hover:opacity-100 transition">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
              <div className="p-2">
                <p className="text-xs font-medium text-slate-700 truncate">{asset.filename}</p>
                <p className="text-[10px] text-slate-400">{(asset.size_bytes / 1024).toFixed(0)} KB</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Media" message={`Delete "${deleteTarget?.filename}"? This removes it from the library.`} confirmLabel="Delete" danger />
    </div>
  )
}
