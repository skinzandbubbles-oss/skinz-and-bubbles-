import { useState, useEffect, useCallback } from 'react'
import { Shield, KeyRound, Lock, AlertTriangle } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { logAction } from '../lib/audit'
import { PageHeader, LoadingSpinner, ErrorState, Badge, DataTable } from '../components/ui'
import { Modal, ConfirmDialog } from '../components/Modal'
import type { AuditLog } from '../lib/types'

export default function SecurityLogs() {
  const { admin, enrollMfa, verifyMfa, disableMfa } = useAuth()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showMfaEnroll, setShowMfaEnroll] = useState(false)
  const [showMfaDisable, setShowMfaDisable] = useState(false)
  const [qrUrl, setQrUrl] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [mfaError, setMfaError] = useState('')
  const [mfaLoading, setMfaLoading] = useState(false)
  const [filter, setFilter] = useState('')

  const loadLogs = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error: logErr } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)
      if (logErr) throw logErr
      setLogs(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadLogs() }, [loadLogs])

  const handleEnrollMfa = async () => {
    setMfaError('')
    setMfaLoading(true)
    const { qrUrl: qr, secret, error: mErr } = await enrollMfa()
    setMfaLoading(false)
    if (mErr) { setMfaError(mErr); return }
    if (qr) { setQrUrl(qr); setShowMfaEnroll(true) }
  }

  const handleVerifyMfa = async () => {
    setMfaError('')
    setMfaLoading(true)
    const { error: vErr } = await verifyMfa(mfaCode)
    setMfaLoading(false)
    if (vErr) { setMfaError(vErr); return }
    setShowMfaEnroll(false)
    setMfaCode('')
    setQrUrl('')
    await logAction('auth.mfa_enabled', 'admin', admin?.id)
  }

  const handleDisableMfa = async () => {
    setMfaLoading(true)
    const { error: dErr } = await disableMfa()
    setMfaLoading(false)
    if (dErr) { setError(dErr); return }
    setShowMfaDisable(false)
    await logAction('auth.mfa_disabled', 'admin', admin?.id)
  }

  const filteredLogs = filter
    ? logs.filter(l => l.action.includes(filter) || l.admin_email.includes(filter) || l.resource_type.includes(filter))
    : logs

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader
        title="Security & Audit Logs"
        description="Review administrator activity and manage your account security."
      />

      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      {/* Security status card */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              admin?.mfa_enabled ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'
            }`}>
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Multi-Factor Authentication</h3>
              <p className="text-sm text-slate-500">
                {admin?.mfa_enabled
                  ? 'MFA is enabled on your account. Your account is protected.'
                  : 'MFA is not enabled. We strongly recommend enabling it.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {admin?.mfa_enabled ? (
              <>
                <Badge color="green">Active</Badge>
                <button onClick={() => setShowMfaDisable(true)} disabled={mfaLoading} className="btn-danger text-sm">
                  Disable MFA
                </button>
              </>
            ) : (
              <>
                <Badge color="yellow">Off</Badge>
                <button onClick={handleEnrollMfa} disabled={mfaLoading} className="btn-aqua text-sm">
                  <KeyRound className="w-4 h-4" /> Enable MFA
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Audit logs */}
      <div className="card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Activity Log</h3>
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter logs..."
            className="input max-w-xs text-sm"
          />
        </div>
        <DataTable
          columns={[
            { key: 'time', label: 'Time' },
            { key: 'admin', label: 'Admin' },
            { key: 'action', label: 'Action' },
            { key: 'resource', label: 'Resource' },
          ]}
          rows={filteredLogs}
          emptyMessage="No audit logs found."
          renderRow={(log: AuditLog) => (
            <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                {new Date(log.created_at).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-slate-700 text-sm">{log.admin_email}</td>
              <td className="px-4 py-3">
                <code className="text-xs bg-slate-100 px-2 py-0.5 rounded">{log.action}</code>
              </td>
              <td className="px-4 py-3 text-sm text-slate-600">
                {log.resource_type}{log.resource_id ? `: ${log.resource_id.slice(0, 8)}` : ''}
              </td>
            </tr>
          )}
        />
      </div>

      {/* MFA enrollment modal */}
      <Modal
        open={showMfaEnroll}
        onClose={() => { setShowMfaEnroll(false); setQrUrl(''); setMfaCode('') }}
        title="Enable MFA"
        footer={
          <>
            <button onClick={() => { setShowMfaEnroll(false); setQrUrl(''); setMfaCode('') }} className="btn-secondary">Cancel</button>
            <button onClick={handleVerifyMfa} disabled={mfaLoading || mfaCode.length < 6} className="btn-primary">
              {mfaLoading ? 'Verifying...' : 'Verify & Enable'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Scan the QR code below with an authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code.
          </p>
          {qrUrl && (
            <div className="flex justify-center">
              <img src={qrUrl} alt="MFA QR Code" className="w-48 h-48 rounded-lg border border-slate-200" />
            </div>
          )}
          <div>
            <label className="label">6-digit code</label>
            <input
              type="text"
              value={mfaCode}
              onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="input text-center text-lg tracking-widest"
              placeholder="000000"
              maxLength={6}
            />
          </div>
          {mfaError && <ErrorState message={mfaError} />}
        </div>
      </Modal>

      {/* MFA disable confirm */}
      <ConfirmDialog
        open={showMfaDisable}
        onClose={() => setShowMfaDisable(false)}
        onConfirm={handleDisableMfa}
        title="Disable MFA"
        message="Are you sure? Disabling MFA reduces your account security. You will need to re-enroll to enable it again."
        confirmLabel="Disable"
        danger
      />
    </div>
  )
}
