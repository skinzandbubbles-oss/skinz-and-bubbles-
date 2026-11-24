import { useState, useMemo } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Search, Menu, X, LogOut, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { getVisibleSections, NAV_SECTIONS } from '../lib/nav'
import { AdminRole } from '../lib/types'

export default function DashboardLayout() {
  const { admin, signOut, can } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [search, setSearch] = useState('')
  const location = useLocation()
  const navigate = useNavigate()

  const role = (admin?.role ?? 'editor') as AdminRole
  const visibleSections = useMemo(() => {
    const sections = getVisibleSections(role)
    if (!search.trim()) return sections
    return sections.filter(s =>
      s.label.toLowerCase().includes(search.toLowerCase())
    )
  }, [role, search])

  const currentSection = NAV_SECTIONS.find(s => s.path === location.pathname)

  const handleSignOut = async () => {
    await signOut()
    navigate('/admin/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? 'w-16' : 'w-64'
        } hidden md:flex flex-col bg-white border-r border-slate-200 transition-all duration-200 flex-shrink-0`}
      >
        <div className="flex items-center gap-2 h-16 px-4 border-b border-slate-200 flex-shrink-0">
          <img src="/assets/logo.png" alt="Bubbles" className="w-8 h-8 rounded-lg flex-shrink-0" />
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="font-display font-bold text-sm text-slate-900 truncate">Bubbles</p>
              <p className="text-[10px] text-slate-500 truncate">Control Center</p>
            </div>
          )}
        </div>

        {!collapsed && (
          <div className="px-3 pt-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search navigation..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-pink-400"
              />
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {visibleSections.map(section => {
            const Icon = section.icon
            return (
              <NavLink
                key={section.path}
                to={section.path}
                end={section.path === '/'}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'sidebar-link-active' : ''} ${collapsed ? 'justify-center' : ''}`
                }
                title={collapsed ? section.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">{section.label}</span>}
              </NavLink>
            )
          })}
        </nav>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 px-3 py-2.5 text-xs text-slate-500 hover:bg-slate-100 border-t border-slate-200 transition"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 flex flex-col">
            <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <img src="/assets/logo.png" alt="Bubbles" className="w-8 h-8 rounded-lg" />
                <div>
                  <p className="font-display font-bold text-sm text-slate-900">Bubbles</p>
                  <p className="text-[10px] text-slate-500">Control Center</p>
                </div>
              </div>
              <button onClick={() => setMobileOpen(false)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="px-3 pt-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-pink-400"
                />
              </div>
            </div>
            <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
              {visibleSections.map(section => {
                const Icon = section.icon
                return (
                  <NavLink
                    key={section.path}
                    to={section.path}
                    end={section.path === '/'}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
                    }
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="truncate">{section.label}</span>
                  </NavLink>
                )
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden text-slate-500"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="font-display font-semibold text-lg text-slate-900">
              {currentSection?.label ?? 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium text-slate-700">{admin?.full_name}</span>
              <span className="text-xs text-slate-500 capitalize">{admin?.role.replace('_', ' ')}</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-brand-pink-100 flex items-center justify-center text-brand-pink-700 font-semibold text-sm">
              {admin?.full_name?.charAt(0)?.toUpperCase() ?? 'A'}
            </div>
            <button
              onClick={handleSignOut}
              className="btn-ghost p-2"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
