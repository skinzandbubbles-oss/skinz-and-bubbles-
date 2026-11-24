import { useState, useEffect, useCallback } from 'react'
import { Save } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { logAction } from '../lib/audit'
import { PageHeader, LoadingSpinner, ErrorState } from '../components/ui'
import type { AppSettings } from '../lib/types'

const defaultSettings: AppSettings = {
  brand_color_primary: '#ec4899',
  brand_color_secondary: '#06b6d4',
  brand_color_accent: '#facc15',
  event_countdown_date: '',
  event_countdown_label: 'Next Event',
  nav_items: [],
  enabled_features: {},
}

export default function AppSettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error: qErr } = await supabase.from('app_settings').select('*').limit(1).maybeSingle()
      if (qErr) throw qErr
      if (data) {
        setSettings({
          ...defaultSettings,
          brand_color_primary: data.brand_color_primary ?? defaultSettings.brand_color_primary,
          brand_color_secondary: data.brand_color_secondary ?? defaultSettings.brand_color_secondary,
          brand_color_accent: data.brand_color_accent ?? defaultSettings.brand_color_accent,
          event_countdown_date: data.event_countdown_date ?? '',
          event_countdown_label: data.event_countdown_label ?? 'Next Event',
          nav_items: data.nav_items ?? [],
          enabled_features: data.enabled_features ?? {},
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const { data: existing } = await supabase.from('app_settings').select('id').limit(1).maybeSingle()
      if (existing) {
        const { error: uErr } = await supabase.from('app_settings').update({
          brand_color_primary: settings.brand_color_primary,
          brand_color_secondary: settings.brand_color_secondary,
          brand_color_accent: settings.brand_color_accent,
          event_countdown_date: settings.event_countdown_date,
          event_countdown_label: settings.event_countdown_label,
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id)
        if (uErr) throw uErr
      } else {
        const { error: iErr } = await supabase.from('app_settings').insert({
          brand_color_primary: settings.brand_color_primary,
          brand_color_secondary: settings.brand_color_secondary,
          brand_color_accent: settings.brand_color_accent,
          event_countdown_date: settings.event_countdown_date,
          event_countdown_label: settings.event_countdown_label,
        })
        if (iErr) throw iErr
      }
      await logAction('settings.update', 'app_settings', null)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings.')
    } finally { setSaving(false) }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader title="App Settings" description="Configure branding colors, countdown, and app-wide settings." action={
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Settings'}
        </button>
      } />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}
      {saved && <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">Settings saved successfully.</div>}

      <div className="card p-6 space-y-6 max-w-2xl">
        <div>
          <h3 className="font-semibold text-slate-900 mb-4">Brand Colors</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Primary</label>
              <input type="color" value={settings.brand_color_primary} onChange={e => setSettings({ ...settings, brand_color_primary: e.target.value })} className="w-full h-10 rounded-lg border border-slate-200" />
            </div>
            <div>
              <label className="label">Secondary</label>
              <input type="color" value={settings.brand_color_secondary} onChange={e => setSettings({ ...settings, brand_color_secondary: e.target.value })} className="w-full h-10 rounded-lg border border-slate-200" />
            </div>
            <div>
              <label className="label">Accent</label>
              <input type="color" value={settings.brand_color_accent} onChange={e => setSettings({ ...settings, brand_color_accent: e.target.value })} className="w-full h-10 rounded-lg border border-slate-200" />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6">
          <h3 className="font-semibold text-slate-900 mb-4">Event Countdown</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Countdown Label</label>
              <input type="text" value={settings.event_countdown_label} onChange={e => setSettings({ ...settings, event_countdown_label: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Countdown Date</label>
              <input type="datetime-local" value={settings.event_countdown_date?.slice(0, 16) ?? ''} onChange={e => setSettings({ ...settings, event_countdown_date: e.target.value })} className="input" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
