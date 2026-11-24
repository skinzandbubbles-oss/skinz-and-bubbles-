import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth'
import AdminSetupPage from './pages/AdminSetupPage'
import LoginPage from './pages/LoginPage'
import AcceptInvitePage from './pages/AcceptInvitePage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DashboardLayout from './components/DashboardLayout'
import DashboardOverview from './pages/DashboardOverview'
import AppBuilder from './pages/AppBuilder'
import UserManagement from './pages/UserManagement'
import EventManagement from './pages/EventManagement'
import TicketManagement from './pages/TicketManagement'
import VipManagement from './pages/VipManagement'
import DjLineup from './pages/DjLineup'
import MediaLibrary from './pages/MediaLibrary'
import PushNotifications from './pages/PushNotifications'
import CommunityModeration from './pages/CommunityModeration'
import AmbassadorManagement from './pages/AmbassadorManagement'
import TravelGuide from './pages/TravelGuide'
import MarketingPromotions from './pages/MarketingPromotions'
import CustomerSupport from './pages/CustomerSupport'
import AnalyticsReports from './pages/AnalyticsReports'
import LegalDocuments from './pages/LegalDocuments'
import AdminAccounts from './pages/AdminAccounts'
import SecurityLogs from './pages/SecurityLogs'
import AppSettingsPage from './pages/AppSettingsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { admin, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-pink-200 border-t-brand-pink-600" />
      </div>
    )
  }
  if (!admin) return <Navigate to="/admin/login" replace />
  return <>{children}</>
}

function LegacyPage() {
  return (
    <iframe
      src="/legacy.html"
      title="Skinz & Bubbles"
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', border: 'none' }}
    />
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/admin/setup" element={<AdminSetupPage />} />
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/admin/invite/:token" element={<AcceptInvitePage />} />
      <Route path="/admin/forgot-password" element={<ResetPasswordPage />} />

      <Route
        path="/admin/*"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<DashboardOverview />} />
        <Route path="app-builder" element={<AppBuilder />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="events" element={<EventManagement />} />
        <Route path="tickets" element={<TicketManagement />} />
        <Route path="vip" element={<VipManagement />} />
        <Route path="djs" element={<DjLineup />} />
        <Route path="media" element={<MediaLibrary />} />
        <Route path="notifications" element={<PushNotifications />} />
        <Route path="moderation" element={<CommunityModeration />} />
        <Route path="ambassadors" element={<AmbassadorManagement />} />
        <Route path="travel" element={<TravelGuide />} />
        <Route path="marketing" element={<MarketingPromotions />} />
        <Route path="support" element={<CustomerSupport />} />
        <Route path="analytics" element={<AnalyticsReports />} />
        <Route path="legal" element={<LegalDocuments />} />
        <Route path="administrators" element={<AdminAccounts />} />
        <Route path="security" element={<SecurityLogs />} />
        <Route path="settings" element={<AppSettingsPage />} />
      </Route>

      <Route path="/" element={<LegacyPage />} />
      <Route path="*" element={<LegacyPage />} />
    </Routes>
  )
}
