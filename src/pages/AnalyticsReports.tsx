import { useState, useEffect } from 'react'
import { Users, Calendar, Ticket, AlertCircle, TrendingUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { PageHeader, StatCard, LoadingSpinner, ErrorState } from '../components/ui'

export default function AnalyticsReports() {
  const [stats, setStats] = useState({ users: 0, events: 0, tickets: 0, reports: 0 })
  const [ticketBreakdown, setTicketBreakdown] = useState<{ status: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [usersRes, eventsRes, ticketsRes, reportsRes] = await Promise.all([
          supabase.from('app_users').select('*', { count: 'exact', head: true }),
          supabase.from('events').select('*', { count: 'exact', head: true }),
          supabase.from('tickets').select('*', { count: 'exact', head: true }),
          supabase.from('community_reports').select('*', { count: 'exact', head: true }),
        ])
        setStats({
          users: usersRes.count ?? 0,
          events: eventsRes.count ?? 0,
          tickets: ticketsRes.count ?? 0,
          reports: reportsRes.count ?? 0,
        })

        const statuses = ['pending', 'confirmed', 'cancelled', 'refunded']
        const breakdown: { status: string; count: number }[] = []
        for (const s of statuses) {
          const { count } = await supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('purchase_status', s)
          breakdown.push({ status: s, count: count ?? 0 })
        }
        setTicketBreakdown(breakdown)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader title="Analytics & Reports" description="Overview of key metrics across the platform." />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Users" value={stats.users} icon={Users} color="pink" />
        <StatCard label="Total Events" value={stats.events} icon={Calendar} color="aqua" />
        <StatCard label="Total Tickets" value={stats.tickets} icon={Ticket} color="yellow" />
        <StatCard label="Reports" value={stats.reports} icon={AlertCircle} color="slate" />
      </div>

      <div className="card">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-slate-500" />
          <h3 className="font-semibold text-slate-900">Ticket Status Breakdown</h3>
        </div>
        {ticketBreakdown.length === 0 ? (
          <p className="text-slate-400 text-center py-8 text-sm">No ticket data available.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {ticketBreakdown.map(item => (
              <div key={item.status} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-slate-600 capitalize">{item.status}</span>
                <span className="text-sm font-semibold text-slate-900">{item.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
