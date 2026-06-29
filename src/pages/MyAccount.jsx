import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../contexts/AuthContext'

export default function MyAccount() {
  const { profile, synagogue } = useAuth()
  const [member, setMember] = useState(null)
  const [debts, setDebts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const [reportDebt, setReportDebt] = useState(null)
  const [reportAmount, setReportAmount] = useState('')
  const [reportSaving, setReportSaving] = useState(false)
  const [reportError, setReportError] = useState(null)
  const [reportSuccess, setReportSuccess] = useState(false)
  const [confirmations, setConfirmations] = useState([])
  const [showConfirmations, setShowConfirmations] = useState(false)

  useEffect(() => {
    if (profile?.member_id) loadData()
    else setLoading(false)
  }, [profile])

  async function handleLogout() {
    setLoggingOut(true)
    await supabase.auth.signOut()
  }

  async function loadData() {
    try {
      const { data: m } = await supabase
        .from('members')
        .select('*')
        .eq('id', profile.member_id)
        .single()
      setMember(m)

      const { data: d } = await supabase
        .from('debts')
        .select('*')
        .eq('member_id', profile.member_id)
        .order('created_at', { ascending: false })
      setDebts(d || [])

      const { data: c } = await supabase
        .from('payment_confirmations')
        .select('*')
        .eq('member_id', profile.member_id)
        .order('created_at', { ascending: false })
      setConfirmations(c || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function reportPayment(e) {
    e.preventDefault()
    if (!reportAmount || parseFloat(reportAmount) <= 0) return
    setReportSaving(true)
    setReportError(null)
    setReportSuccess(false)
    try {
      const { error } = await supabase.from('payment_confirmations').insert({
        debt_id: reportDebt.id,
        member_id: profile.member_id,
        amount_paid: parseFloat(reportAmount),
        status: 'pending',
        synagogue_id: profile.synagogue_id
      })
      if (error) throw error
      setReportSuccess(true)
      await loadData()
    } catch (err) {
      setReportError(err.message || 'שגיאה בדיווח תשלום')
    } finally {
      setReportSaving(false)
    }
  }

  const totalDebt = debts.reduce((sum, d) => sum + Number(d.amount), 0)
  const paidTotal = debts.reduce((sum, d) => {
    const paid = d.paid_amount !== undefined && d.paid_amount !== null ? Number(d.paid_amount) : (d.paid ? Number(d.amount) : 0)
    return sum + paid
  }, 0)
  const unpaidTotal = totalDebt - paidTotal

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>
  }

  return (
    <div className="my-account">
      <div className="my-account-header">
        <h2 className="my-account-title">החשבון שלי</h2>
        <button
          className="btn btn-sm btn-secondary my-account-logout"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? 'מתנתק...' : 'התנתק'}
        </button>
      </div>

      <div className="member-header" style={{ marginBottom: 20 }}>
        <div className="member-header-main">
          {member && (
            <>
              <div className="member-avatar large">{member.name[0]}</div>
              <div className="member-header-info">
                <h1>{member.name}</h1>
                {member.phone && <p className="member-phone">📞 {member.phone}</p>}
                {synagogue && <p className="synagogue-badge">{synagogue.name}</p>}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="stats-grid small" style={{ marginBottom: 24 }}>
        <div className="stat-card stat-unpaid">
          <div className="stat-body">
            <span className="stat-number">{unpaidTotal.toLocaleString()} ₪</span>
            <span className="stat-label">חוב פתוח</span>
          </div>
        </div>
        <div className="stat-card stat-paid">
          <div className="stat-body">
            <span className="stat-number">{paidTotal.toLocaleString()} ₪</span>
            <span className="stat-label">שולם</span>
          </div>
        </div>
        <div className="stat-card stat-total">
          <div className="stat-body">
            <span className="stat-number">{totalDebt.toLocaleString()} ₪</span>
            <span className="stat-label">מאזן</span>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <h2>חובות</h2>
        </div>

        {debts.length === 0 ? (
          <div className="empty-state">
            <p>אין חובות רשומים על שמך</p>
          </div>
        ) : (
          <div className="debts-list">
            {debts.map(d => {
              const paid = d.paid_amount !== undefined && d.paid_amount !== null ? Number(d.paid_amount) : (d.paid ? Number(d.amount) : 0)
              const total = Number(d.amount)
              const isFullyPaid = paid >= total && total > 0
              const isPartial = paid > 0 && !isFullyPaid

              function formatHebrewDate(dateStr) {
                try {
                  return new Intl.DateTimeFormat('he-IL-u-ca-hebrew', {
                    year: 'numeric', month: 'long', day: 'numeric'
                  }).format(new Date(dateStr))
                } catch { return '' }
              }

              const pendingConf = confirmations.find(c => c.debt_id === d.id && c.status === 'pending')
              const remaining = total - paid

              return (
                <div key={d.id} className={`debt-item ${isFullyPaid ? 'debt-paid' : ''}`}>
                  <div className="debt-status">
                    <span className="debt-check" style={{ fontSize: '1.4rem', cursor: 'default' }}>
                      {isFullyPaid ? '✅' : isPartial ? '🔄' : '⬜'}
                    </span>
                  </div>
                  <div className="debt-info">
                    <span className="debt-amount">{total.toLocaleString()} ₪</span>
                    {isPartial && (
                      <span className="debt-partial">
                        שולם {paid.toLocaleString()} ₪ · נשאר {remaining.toLocaleString()} ₪
                      </span>
                    )}
                    {isFullyPaid && <span className="debt-paid-label">שולם במלואו</span>}
                    {pendingConf && <span className="debt-pending-label">⏳ ממתין לאישור מנהל</span>}
                    <span className="debt-desc">{d.description}</span>
                    <span className="debt-date">
                      {new Date(d.created_at).toLocaleDateString('he-IL', {
                        year: 'numeric', month: 'long', day: 'numeric'
                      })}
                    </span>
                    <span className="debt-date-hebrew">{formatHebrewDate(d.created_at)}</span>
                  </div>
                  {!isFullyPaid && !pendingConf && (
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => { setReportDebt(d); setReportAmount(String(remaining)); setReportError(null); setReportSuccess(false); }}
                      style={{ fontSize: '0.75rem', padding: '6px 10px', whiteSpace: 'nowrap' }}
                    >
                      דווח תשלום
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {confirmations.filter(c => c.status === 'pending').length > 0 && (
          <div style={{ marginTop: 16 }}>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => setShowConfirmations(!showConfirmations)}
            >
              {showConfirmations ? 'הסתר' : 'הצג'} דיווחי תשלום ממתינים ({confirmations.filter(c => c.status === 'pending').length})
            </button>
            {showConfirmations && (
              <div className="debts-list" style={{ marginTop: 8 }}>
                {confirmations.filter(c => c.status === 'pending').map(c => {
                  const debt = debts.find(d => d.id === c.debt_id)
                  return (
                    <div key={c.id} className="debt-item" style={{ opacity: 0.7 }}>
                      <div className="debt-info">
                        <span className="debt-amount">{Number(c.amount_paid).toLocaleString()} ₪</span>
                        <span className="debt-desc">{debt?.description || 'חוב'}</span>
                        <span className="debt-date">
                          דווח: {new Date(c.created_at).toLocaleDateString('he-IL')}
                        </span>
                        <span className="debt-pending-label">⏳ ממתין לאישור</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* דיווח תשלום */}
        {reportDebt && (
          <div className="modal-overlay" onClick={() => setReportDebt(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>💰 דיווח תשלום</h3>
              <p style={{ marginBottom: 12, color: 'var(--text-secondary)' }}>
                {reportDebt.description} — {Number(reportDebt.amount).toLocaleString()} ₪
              </p>

              {reportSuccess ? (
                <div className="success-msg" style={{ marginBottom: 0 }}>
                  ✅ דיווח התקבל! המנהל יאשר אותו בקרוב.
                </div>
              ) : (
                <form onSubmit={reportPayment}>
                  {reportError && <div className="error-msg">{reportError}</div>}
                  <div className="form-group">
                    <label>סכום ששולם (₪)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={Number(reportDebt.amount)}
                      placeholder="0.00"
                      value={reportAmount}
                      onChange={e => setReportAmount(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="form-buttons">
                    <button className="btn btn-primary" type="submit" disabled={reportSaving}>
                      {reportSaving ? 'שולח...' : 'דווח תשלום'}
                    </button>
                    <button className="btn btn-secondary" type="button" onClick={() => setReportDebt(null)}>
                      בטל
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
