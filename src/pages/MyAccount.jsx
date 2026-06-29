import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../contexts/AuthContext'

export default function MyAccount() {
  const { profile, synagogue } = useAuth()
  const [member, setMember] = useState(null)
  const [debts, setDebts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)

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
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
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
                        שולם {paid.toLocaleString()} ₪ · נשאר {(total - paid).toLocaleString()} ₪
                      </span>
                    )}
                    {isFullyPaid && <span className="debt-paid-label">שולם במלואו</span>}
                    <span className="debt-desc">{d.description}</span>
                    <span className="debt-date">
                      {new Date(d.created_at).toLocaleDateString('he-IL', {
                        year: 'numeric', month: 'long', day: 'numeric'
                      })}
                    </span>
                    <span className="debt-date-hebrew">{formatHebrewDate(d.created_at)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
