import { useState, useEffect, useCallback, useRef } from 'react'
import { GripVertical, Plus, Trash2, Eye, Save, Send, Clock, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { logAction } from '../lib/audit'
import { Modal, ConfirmDialog } from '../components/Modal'
import { PageHeader, LoadingSpinner, ErrorState, Badge } from '../components/ui'
import type { AppContentSection, AppContentVersion } from '../lib/types'

const SECTION_TYPES = [
  { value: 'hero', label: 'Hero' },
  { value: 'banner', label: 'Banner' },
  { value: 'text', label: 'Text Block' },
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'button', label: 'Button' },
  { value: 'countdown', label: 'Countdown' },
] as const

export default function AppBuilder() {
  const { admin } = useAuth()
  const [sections, setSections] = useState<AppContentSection[]>([])
  const [settings, setSettings] = useState<any>(null)
  const [versions, setVersions] = useState<AppContentVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<AppContentSection | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showPublish, setShowPublish] = useState(false)
  const [publishScheduledAt, setPublishScheduledAt] = useState('')
  const [confirmRestore, setConfirmRestore] = useState<AppContentVersion | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [secRes, setRes, verRes] = await Promise.all([
        supabase.from('app_content_sections').select('*').order('sort_order'),
        supabase.from('app_settings').select('*').limit(1).maybeSingle(),
        supabase.from('app_content_versions').select('*').order('created_at', { ascending: false }).limit(20),
      ])
      if (secRes.error) throw secRes.error
      setSections(secRes.data ?? [])
      setSettings(setRes.data)
      setVersions(verRes.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const persistSection = useCallback(async (section: AppContentSection) => {
    const { error: upErr } = await supabase
      .from('app_content_sections')
      .update({
        title: section.title,
        subtitle: section.subtitle,
        body: section.body,
        image_url: section.image_url,
        video_url: section.video_url,
        button_label: section.button_label,
        button_destination: section.button_destination,
        sort_order: section.sort_order,
        is_enabled: section.is_enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', section.id)
    if (upErr) setError(upErr.message)
  }, [])

  const handleSaveEdit = async (updated: AppContentSection) => {
    setSections(prev => prev.map(s => s.id === updated.id ? updated : s))
    await persistSection(updated)
    await logAction('content.section_edit', 'section', updated.id, { title: updated.title })
    setEditing(null)
  }

  const handleAddSection = async (type: typeof SECTION_TYPES[number]['value']) => {
    const newKey = `section_${Date.now()}`
    const sortOrder = sections.length > 0 ? Math.max(...sections.map(s => s.sort_order)) + 1 : 0
    const { data, error: insErr } = await supabase.from('app_content_sections').insert({
      section_key: newKey,
      section_type: type,
      title: 'New Section',
      sort_order: sortOrder,
      is_enabled: true,
    }).select().single()
    if (insErr) { setError(insErr.message); return }
    setSections(prev => [...prev, data])
    await logAction('content.section_add', 'section', data.id, { type })
    setShowAdd(false)
  }

  const handleDelete = async (id: string) => {
    const { error: delErr } = await supabase.from('app_content_sections').delete().eq('id', id)
    if (delErr) { setError(delErr.message); return }
    setSections(prev => prev.filter(s => s.id !== id))
    await logAction('content.section_delete', 'section', id)
  }

  const toggleEnabled = async (section: AppContentSection) => {
    const updated = { ...section, is_enabled: !section.is_enabled }
    setSections(prev => prev.map(s => s.id === section.id ? updated : s))
    await persistSection(updated)
  }

  const moveSection = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= sections.length) return
    const reordered = [...sections]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(newIndex, 0, moved)
    reordered.forEach((s, i) => { s.sort_order = i })
    setSections(reordered)
    // Persist all sort orders
    for (const s of reordered) {
      await supabase.from('app_content_sections').update({ sort_order: s.sort_order, updated_at: new Date().toISOString() }).eq('id', s.id)
    }
  }

  const handleDragStart = (index: number) => setDragIndex(index)
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }
  const handleDrop = async (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === index) { setDragIndex(null); setDragOverIndex(null); return }
    const reordered = [...sections]
    const [moved] = reordered.splice(dragIndex, 1)
    reordered.splice(index, 0, moved)
    reordered.forEach((s, i) => { s.sort_order = i })
    setSections(reordered)
    for (const s of reordered) {
      await supabase.from('app_content_sections').update({ sort_order: s.sort_order, updated_at: new Date().toISOString() }).eq('id', s.id)
    }
    await logAction('content.section_reorder', 'sections', null)
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const createVersion = async (status: 'draft' | 'published' | 'scheduled', scheduledFor?: string) => {
    setSaving(true)
    try {
      const maxVersion = versions.length > 0 ? Math.max(...versions.map(v => v.version_number)) : 0
      const sectionsData = sections.map(s => ({
        id: s.id, section_key: s.section_key, section_type: s.section_type,
        title: s.title, subtitle: s.subtitle, body: s.body, image_url: s.image_url,
        video_url: s.video_url, button_label: s.button_label,
        button_destination: s.button_destination, sort_order: s.sort_order, is_enabled: s.is_enabled,
      }))
      const settingsData = settings ? {
        brand_color_primary: settings.brand_color_primary,
        brand_color_secondary: settings.brand_color_secondary,
        brand_color_accent: settings.brand_color_accent,
        event_countdown_date: settings.event_countdown_date,
        event_countdown_label: settings.event_countdown_label,
        nav_items: settings.nav_items,
        enabled_features: settings.enabled_features,
      } : null

      const insertData: any = {
        version_number: maxVersion + 1,
        status,
        sections_data: sectionsData,
        settings_data: settingsData,
      }
      if (status === 'published') insertData.published_at = new Date().toISOString()
      if (status === 'scheduled' && scheduledFor) insertData.scheduled_for = scheduledFor

      const { error: verErr } = await supabase.from('app_content_versions').insert(insertData)
      if (verErr) throw verErr

      await logAction(`content.${status}`, 'version', null, { version: maxVersion + 1 })
      await loadData()
      setShowPublish(false)
      setPublishScheduledAt('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save version.')
    } finally {
      setSaving(false)
    }
  }

  const restoreVersion = async (version: AppContentVersion) => {
    try {
      const sectionsData = version.sections_data as unknown as AppContentSection[]
      // Delete existing sections and re-insert from version
      for (const sec of sectionsData) {
        const { error } = await supabase.from('app_content_sections')
          .update({
            title: sec.title, subtitle: sec.subtitle, body: sec.body,
            image_url: sec.image_url, video_url: sec.video_url,
            button_label: sec.button_label, button_destination: sec.button_destination,
            sort_order: sec.sort_order, is_enabled: sec.is_enabled,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sec.id)
        if (error && error.code === 'PGRST116') {
          // Section was deleted, re-insert
          await supabase.from('app_content_sections').insert({
            id: sec.id, section_key: sec.section_key, section_type: sec.section_type,
            title: sec.title, subtitle: sec.subtitle, body: sec.body,
            image_url: sec.image_url, video_url: sec.video_url,
            button_label: sec.button_label, button_destination: sec.button_destination,
            sort_order: sec.sort_order, is_enabled: sec.is_enabled,
          })
        }
      }
      await logAction('content.restore', 'version', version.id, { version_number: version.version_number })
      await loadData()
      setConfirmRestore(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore version.')
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader
        title="Visual App Builder"
        description="Edit your mobile app's content, reorder sections, and publish changes — no code required."
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setShowPreview(true)} className="btn-secondary">
              <Eye className="w-4 h-4" /> Preview
            </button>
            <button onClick={() => setShowVersions(true)} className="btn-secondary">
              <Clock className="w-4 h-4" /> Versions
            </button>
            <button onClick={() => setShowPublish(true)} className="btn-primary">
              <Send className="w-4 h-4" /> Publish
            </button>
          </div>
        }
      />

      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Section list */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">Content Sections</h3>
              <button onClick={() => setShowAdd(true)} className="btn-ghost text-sm">
                <Plus className="w-4 h-4" /> Add Section
              </button>
            </div>
            <div className="p-2">
              {sections.map((section, index) => (
                <div
                  key={section.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={() => { setDragIndex(null); setDragOverIndex(null) }}
                  className={`flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-slate-50 transition cursor-grab ${
                    dragOverIndex === index ? 'border-t-2 border-brand-pink-400' : ''
                  } ${dragIndex === index ? 'opacity-50' : ''}`}
                >
                  <GripVertical className="w-5 h-5 text-slate-300 flex-shrink-0" />
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setEditing(section)}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-900 truncate">{section.title}</span>
                      <Badge color={section.is_enabled ? 'green' : 'slate'}>
                        {section.is_enabled ? 'On' : 'Off'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 capitalize">{section.section_type}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => moveSection(index, 'up')} disabled={index === 0} className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30">
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button onClick={() => moveSection(index, 'down')} disabled={index === sections.length - 1} className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button onClick={() => toggleEnabled(section)} className="p-1 text-slate-400 hover:text-slate-600" title={section.is_enabled ? 'Disable' : 'Enable'}>
                      <span className="text-xs">{section.is_enabled ? '👁' : '🚫'}</span>
                    </button>
                    <button onClick={() => setEditing(section)} className="p-1 text-brand-pink-600 hover:text-brand-pink-700" title="Edit">
                      <span className="text-xs font-medium">Edit</span>
                    </button>
                    <button onClick={() => handleDelete(section.id)} className="p-1 text-red-500 hover:text-red-700" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Settings panel */}
        <div>
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Brand Settings</h3>
            {settings && (
              <div className="space-y-4">
                <div>
                  <label className="label">Primary Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={settings.brand_color_primary} onChange={e => {
                      setSettings({...settings, brand_color_primary: e.target.value})
                    }} className="w-10 h-10 rounded border border-slate-300" />
                    <input type="text" value={settings.brand_color_primary} onChange={e => setSettings({...settings, brand_color_primary: e.target.value})} className="input" />
                  </div>
                </div>
                <div>
                  <label className="label">Secondary Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={settings.brand_color_secondary} onChange={e => setSettings({...settings, brand_color_secondary: e.target.value})} className="w-10 h-10 rounded border border-slate-300" />
                    <input type="text" value={settings.brand_color_secondary} onChange={e => setSettings({...settings, brand_color_secondary: e.target.value})} className="input" />
                  </div>
                </div>
                <div>
                  <label className="label">Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={settings.brand_color_accent} onChange={e => setSettings({...settings, brand_color_accent: e.target.value})} className="w-10 h-10 rounded border border-slate-300" />
                    <input type="text" value={settings.brand_color_accent} onChange={e => setSettings({...settings, brand_color_accent: e.target.value})} className="input" />
                  </div>
                </div>
                <div>
                  <label className="label">Countdown Date</label>
                  <input type="datetime-local" value={settings.event_countdown_date?.slice(0, 16)} onChange={e => setSettings({...settings, event_countdown_date: e.target.value})} className="input" />
                </div>
                <div>
                  <label className="label">Countdown Label</label>
                  <input type="text" value={settings.event_countdown_label} onChange={e => setSettings({...settings, event_countdown_label: e.target.value})} className="input" />
                </div>
                <button
                  onClick={async () => {
                    const { error } = await supabase.from('app_settings').update({
                      brand_color_primary: settings.brand_color_primary,
                      brand_color_secondary: settings.brand_color_secondary,
                      brand_color_accent: settings.brand_color_accent,
                      event_countdown_date: settings.event_countdown_date,
                      event_countdown_label: settings.event_countdown_label,
                      updated_at: new Date().toISOString(),
                    }).eq('id', settings.id)
                    if (error) setError(error.message)
                    else await logAction('settings.update', 'app_settings', settings.id)
                  }}
                  className="btn-aqua w-full"
                >
                  <Save className="w-4 h-4" /> Save Settings
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit section modal */}
      {editing && (
        <SectionEditModal
          section={editing}
          onClose={() => setEditing(null)}
          onSave={handleSaveEdit}
        />
      )}

      {/* Add section modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Section">
        <div className="grid grid-cols-2 gap-3">
          {SECTION_TYPES.map(type => (
            <button
              key={type.value}
              onClick={() => handleAddSection(type.value)}
              className="card p-4 text-center hover:border-brand-pink-300 hover:bg-brand-pink-50 transition"
            >
              <p className="font-medium text-slate-900">{type.label}</p>
            </button>
          ))}
        </div>
      </Modal>

      {/* Versions modal */}
      <Modal open={showVersions} onClose={() => setShowVersions(false)} title="Content Versions">
        <div className="space-y-2">
          {versions.length === 0 ? (
            <p className="text-slate-400 text-center py-4">No versions yet.</p>
          ) : versions.map(version => (
            <div key={version.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900">Version {version.version_number}</span>
                  <Badge color={version.status === 'published' ? 'green' : version.status === 'scheduled' ? 'aqua' : 'slate'}>
                    {version.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(version.created_at).toLocaleString()}
                  {version.published_at && ` · Published ${new Date(version.published_at).toLocaleString()}`}
                </p>
              </div>
              <button
                onClick={() => setConfirmRestore(version)}
                className="btn-secondary text-sm"
              >
                <RotateCcw className="w-4 h-4" /> Restore
              </button>
            </div>
          ))}
        </div>
      </Modal>

      {/* Publish modal */}
      <Modal open={showPublish} onClose={() => setShowPublish(false)} title="Publish Content">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Create a snapshot of the current content. Published versions are live in the mobile app immediately.
            Scheduled versions go live at the specified time.
          </p>
          <div>
            <label className="label">Schedule for (optional)</label>
            <input type="datetime-local" value={publishScheduledAt} onChange={e => setPublishScheduledAt(e.target.value)} className="input" />
            <p className="text-xs text-slate-400 mt-1">Leave empty to publish immediately.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => createVersion(publishScheduledAt ? 'scheduled' : 'published', publishScheduledAt || undefined)}
              disabled={saving}
              className="btn-primary flex-1"
            >
              {saving ? 'Saving...' : publishScheduledAt ? 'Schedule' : 'Publish Now'}
            </button>
            <button onClick={() => createVersion('draft')} disabled={saving} className="btn-secondary">
              <Save className="w-4 h-4" /> Save Draft
            </button>
          </div>
        </div>
      </Modal>

      {/* Preview modal */}
      <Modal open={showPreview} onClose={() => setShowPreview(false)} title="Mobile Preview">
        <PhonePreview sections={sections} settings={settings} />
      </Modal>

      {/* Restore confirm */}
      <ConfirmDialog
        open={!!confirmRestore}
        onClose={() => setConfirmRestore(null)}
        onConfirm={() => confirmRestore && restoreVersion(confirmRestore)}
        title="Restore Version"
        message={`Restore version ${confirmRestore?.version_number}? This will replace the current content sections with the version's snapshot.`}
        confirmLabel="Restore"
      />
    </div>
  )
}

function SectionEditModal({ section, onClose, onSave }: {
  section: AppContentSection
  onClose: () => void
  onSave: (s: AppContentSection) => void
}) {
  const [form, setForm] = useState<AppContentSection>(section)

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit Section"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={() => onSave(form)} className="btn-primary">Save</button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Title</label>
          <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="input" />
        </div>
        <div>
          <label className="label">Subtitle</label>
          <input type="text" value={form.subtitle ?? ''} onChange={e => setForm({...form, subtitle: e.target.value})} className="input" />
        </div>
        <div>
          <label className="label">Body Text</label>
          <textarea value={form.body ?? ''} onChange={e => setForm({...form, body: e.target.value})} className="input min-h-[80px]" />
        </div>
        <div>
          <label className="label">Image URL</label>
          <input type="text" value={form.image_url ?? ''} onChange={e => setForm({...form, image_url: e.target.value})} className="input" placeholder="/assets/hero.jpg" />
        </div>
        {form.image_url && (
          <img src={form.image_url} alt="" className="w-full rounded-lg max-h-32 object-cover" />
        )}
        <div>
          <label className="label">Video URL</label>
          <input type="text" value={form.video_url ?? ''} onChange={e => setForm({...form, video_url: e.target.value})} className="input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Button Label</label>
            <input type="text" value={form.button_label ?? ''} onChange={e => setForm({...form, button_label: e.target.value})} className="input" />
          </div>
          <div>
            <label className="label">Button Destination</label>
            <input type="text" value={form.button_destination ?? ''} onChange={e => setForm({...form, button_destination: e.target.value})} className="input" placeholder="/tickets" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="enabled" checked={form.is_enabled} onChange={e => setForm({...form, is_enabled: e.target.checked})} className="rounded" />
          <label htmlFor="enabled" className="text-sm text-slate-700">Section enabled</label>
        </div>
      </div>
    </Modal>
  )
}

function PhonePreview({ sections, settings }: { sections: AppContentSection[]; settings: any }) {
  const primary = settings?.brand_color_primary ?? '#e11d63'
  const secondary = settings?.brand_color_secondary ?? '#06c9b6'
  const accent = settings?.brand_color_accent ?? '#f5b800'
  const visible = sections.filter(s => s.is_enabled)

  return (
    <div className="flex justify-center">
      <div className="w-[280px] h-[500px] rounded-[32px] border-4 border-slate-800 bg-white overflow-hidden flex flex-col">
        <div className="bg-slate-800 h-6 flex items-center justify-center">
          <div className="w-16 h-1 bg-slate-600 rounded-full" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {visible.map(section => (
            <div key={section.id} className="border-b border-slate-100">
              {section.image_url && (
                <div className="relative">
                  <img src={section.image_url} alt={section.title} className="w-full h-32 object-cover" />
                  {section.section_type === 'hero' && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-3">
                      <h2 className="font-bold text-white text-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>{section.title}</h2>
                      <p className="text-white/90 text-xs">{section.subtitle}</p>
                    </div>
                  )}
                </div>
              )}
              {!section.image_url && (
                <div className="p-3">
                  <h3 className="font-semibold text-slate-900 text-sm">{section.title}</h3>
                  {section.subtitle && <p className="text-slate-600 text-xs mt-1">{section.subtitle}</p>}
                </div>
              )}
              {section.body && (
                <p className="px-3 pb-2 text-xs text-slate-600">{section.body}</p>
              )}
              {section.section_type === 'countdown' && settings?.event_countdown_date && (
                <div className="px-3 pb-3 text-center" style={{ color: primary }}>
                  <CountdownDisplay targetDate={settings.event_countdown_date} />
                </div>
              )}
              {section.button_label && (
                <div className="px-3 pb-3">
                  <button
                    className="w-full rounded-lg py-2 px-3 text-xs font-semibold text-white"
                    style={{ backgroundColor: primary }}
                  >
                    {section.button_label}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex border-t border-slate-200 bg-white">
          {(settings?.nav_items ?? []).filter((n: any) => n.is_enabled).sort((a: any, b: any) => a.sort_order - b.sort_order).map((nav: any) => (
            <div key={nav.key} className="flex-1 flex flex-col items-center py-2" style={{ color: primary }}>
              <span className="text-[10px] font-medium">{nav.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CountdownDisplay({ targetDate }: { targetDate: string }) {
  const [remaining, setRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate).getTime() - Date.now()
      if (diff <= 0) { setRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return }
      setRemaining({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      })
    }
    calc()
    const interval = setInterval(calc, 1000)
    return () => clearInterval(interval)
  }, [targetDate])

  return (
    <div className="flex gap-2 justify-center">
      {[{ l: 'Days', v: remaining.days }, { l: 'Hrs', v: remaining.hours }, { l: 'Min', v: remaining.minutes }, { l: 'Sec', v: remaining.seconds }].map(unit => (
        <div key={unit.l} className="text-center">
          <div className="font-bold text-lg">{unit.v}</div>
          <div className="text-[10px]">{unit.l}</div>
        </div>
      ))}
    </div>
  )
}
