import { useState, useEffect } from 'react'
import { Users, Ticket, Calendar, TrendingUp, Bell, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { PageHeader, StatCard, LoadingSpinner, ErrorState } from '../components/ui'

export default function DashboardOverview() {
  const { admin } = useAuth()
  const [stats, setStats] = useState({ users: 0, events: 0, tickets: 0, reports: 0 })
  const [recentLogs, setRecentLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [usersRes, eventsRes, ticketsRes, reportsRes, logsRes] = await Promise.all([
          supabase.from('app_users').select('*', { count: 'exact', head: true }),
          supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'published'),
          supabase.from('tickets').select('*', { count: 'exact', head: true }),
          supabase.from('community_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(10),
        ])
        setStats({
          users: usersRes.count ?? 0,
          events: eventsRes.count ?? 0,
          tickets: ticketsRes.count ?? 0,
          reports: reportsRes.count ?? 0,
        })
        setRecentLogs(logsRes.data ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader
        title={`Welcome, ${admin?.full_name?.split(' ')[0] ?? 'Admin'}`}
        description="Here's what's happening with your Skinz & Bubbles app."
      />

      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="App Users" value={stats.users} icon={Users} color="pink" />
        <StatCard label="Published Events" value={stats.events} icon={Calendar} color="aqua" />
        <StatCard label="Tickets" value={stats.tickets} icon={Ticket} color="yellow" />
        <StatCard label="Pending Reports" value={stats.reports} icon={AlertCircle} color="slate" />
      </div>

      <div className="card">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Recent Activity</h3>
        </div>
        {recentLogs.length === 0 ? (
          <p className="text-slate-400 text-center py-8 text-sm">No recent activity.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentLogs.map((log: any) => (
              <div key={log.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <code className="text-xs bg-slate-100 px-2 py-0.5 rounded">{log.action}</code>
                  <span className="text-sm text-slate-600 ml-2">{log.admin_email}</span>
                </div>
                <span className="text-xs text-slate-400">{new Date(log.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
