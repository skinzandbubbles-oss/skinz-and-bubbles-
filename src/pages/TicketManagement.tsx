import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { PageHeader, LoadingSpinner, ErrorState, DataTable, Badge } from '../components/ui'
import { Modal } from '../components/Modal'

export default function TicketManagement() {
  const [tickets, setTickets] = useState<any[]>([])
  const [tiers, setTiers] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showTier, setShowTier] = useState(false)
  const [tierForm, setTierForm] = useState({ event_id: '', name: '', price_cents: 0, capacity: 100, description: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [tRes, tierRes, eRes] = await Promise.all([
        supabase.from('tickets').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('ticket_tiers').select('*').order('created_at', { ascending: false }),
        supabase.from('events').select('id, title').eq('status', 'published'),
      ])
      setTickets(tRes.data ?? [])
      setTiers(tierRes.data ?? [])
      setEvents(eRes.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSaveTier = async () => {
    setSaving(true)
    setError('')
    const { error: iErr } = await supabase.from('ticket_tiers').insert({
      event_id: tierForm.event_id, name: tierForm.name, price_cents: tierForm.price_cents,
      capacity: tierForm.capacity, description: tierForm.description, currency: 'USD',
    })
    if (iErr) { setError(iErr.message); setSaving(false); return }
    setShowTier(false)
    setTierForm({ event_id: '', name: '', price_cents: 0, capacity: 100, description: '' })
    setSaving(false)
    await load()
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader title="Ticket Management" description="View ticket sales and manage ticket tiers." action={
        <button onClick={() => setShowTier(true)} className="btn-primary">Add Ticket Tier</button>
      } />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      <div className="card mb-6">
        <div className="px-4 py-3 border-b border-slate-200"><h3 className="font-semibold text-slate-900">Ticket Tiers</h3></div>
        <DataTable
          columns={[{ key: 'name', label: 'Name' }, { key: 'price', label: 'Price' }, { key: 'capacity', label: 'Capacity' }, { key: 'sold', label: 'Sold' }, { key: 'active', label: 'Active' }]}
          rows={tiers}
          emptyMessage="No ticket tiers configured."
          renderRow={(tier: any) => (
            <tr key={tier.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">{tier.name}</td>
              <td className="px-4 py-3 text-slate-600">${(tier.price_cents / 100).toFixed(2)}</td>
              <td className="px-4 py-3 text-slate-600">{tier.capacity}</td>
              <td className="px-4 py-3 text-slate-600">{tier.sold}</td>
              <td className="px-4 py-3"><Badge color={tier.is_active ? 'green' : 'slate'}>{tier.is_active ? 'Yes' : 'No'}</Badge></td>
            </tr>
          )}
        />
      </div>

      <div className="card">
        <div className="px-4 py-3 border-b border-slate-200"><h3 className="font-semibold text-slate-900">Recent Ticket Purchases</h3></div>
        <DataTable
          columns={[{ key: 'type', label: 'Ticket Type' }, { key: 'status', label: 'Status' }, { key: 'amount', label: 'Amount' }, { key: 'date', label: 'Date' }]}
          rows={tickets}
          emptyMessage="No ticket purchases yet."
          renderRow={(ticket: any) => (
            <tr key={ticket.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">{ticket.ticket_type}</td>
              <td className="px-4 py-3"><Badge color={ticket.purchase_status === 'confirmed' ? 'green' : 'slate'}>{ticket.purchase_status}</Badge></td>
              <td className="px-4 py-3 text-slate-600">${(ticket.purchase_amount_cents / 100).toFixed(2)}</td>
              <td className="px-4 py-3 text-xs text-slate-500">{ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : '—'}</td>
            </tr>
          )}
        />
      </div>

      <Modal open={showTier} onClose={() => setShowTier(false)} title="Add Ticket Tier"
        footer={<><button onClick={() => setShowTier(false)} className="btn-secondary">Cancel</button><button onClick={handleSaveTier} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button></>}>
        <div className="space-y-4">
          <div><label className="label">Event</label><select value={tierForm.event_id} onChange={e => setTierForm({...tierForm, event_id: e.target.value})} className="input"><option value="">Select event...</option>{events.map((e: any) => <option key={e.id} value={e.id}>{e.title}</option>)}</select></div>
          <div><label className="label">Tier Name</label><input type="text" value={tierForm.name} onChange={e => setTierForm({...tierForm, name: e.target.value})} className="input" placeholder="General Admission" /></div>
          <div><label className="label">Price (USD)</label><input type="number" value={tierForm.price_cents / 100} onChange={e => setTierForm({...tierForm, price_cents: Math.round(parseFloat(e.target.value || '0') * 100)})} className="input" step="0.01" /></div>
          <div><label className="label">Capacity</label><input type="number" value={tierForm.capacity} onChange={e => setTierForm({...tierForm, capacity: parseInt(e.target.value || '0')})} className="input" /></div>
          <div><label className="label">Description</label><textarea value={tierForm.description} onChange={e => setTierForm({...tierForm, description: e.target.value})} className="input min-h-[60px]" /></div>
        </div>
      </Modal>
    </div>
  )
}
