import { ReactNode } from 'react'

export function DataTable<T>({
  columns,
  rows,
  renderRow,
  emptyMessage = 'No data found.',
}: {
  columns: { key: string; label: string; className?: string }[]
  rows: T[]
  renderRow: (row: T) => ReactNode
  emptyMessage?: string
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            {columns.map(col => (
              <th
                key={col.key}
                className={`text-left font-medium text-slate-500 px-4 py-3 ${col.className ?? ''}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center text-slate-400 py-8">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => renderRow(row))
          )}
        </tbody>
      </table>
    </div>
  )
}

export function StatCard({
  label, value, icon: Icon, color = 'pink',
}: {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  color?: 'pink' | 'aqua' | 'yellow' | 'slate'
}) {
  const colorMap = {
    pink: 'bg-brand-pink-50 text-brand-pink-600',
    aqua: 'bg-brand-aqua-50 text-brand-aqua-600',
    yellow: 'bg-brand-yellow-50 text-brand-yellow-600',
    slate: 'bg-slate-100 text-slate-600',
  }
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-display font-bold text-slate-900">{value}</p>
    </div>
  )
}

export function Badge({ children, color = 'slate' }: {
  children: ReactNode
  color?: 'pink' | 'aqua' | 'yellow' | 'slate' | 'green' | 'red'
}) {
  const colorMap = {
    pink: 'bg-brand-pink-100 text-brand-pink-700',
    aqua: 'bg-brand-aqua-100 text-brand-aqua-700',
    yellow: 'bg-brand-yellow-100 text-brand-yellow-700',
    slate: 'bg-slate-100 text-slate-600',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
  }
  return <span className={`badge ${colorMap[color]}`}>{children}</span>
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-3 border-brand-pink-200 border-t-brand-pink-600" />
    </div>
  )
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  )
}

export function PageHeader({ title, description, action }: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
      <div>
        <h1 className="font-display font-bold text-xl text-slate-900">{title}</h1>
        {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
      </div>
      {action}
    </div>
  )
}
