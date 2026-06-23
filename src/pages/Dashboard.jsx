import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Dashboard() {
  const [stats, setStats] = useState({ members: 0, totalDebt: 0, paidDebt: 0, unpaidDebt: 0 })
  const [recentMembers, setRecentMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const { count: membersCount, error: countErr } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
      if (countErr) throw countErr

      const { data: debts, error: debtsErr } = await supabase
        .from('debts')
        .select('amount, paid')
      if (debtsErr) throw debtsErr

      const totalDebt = debts?.reduce((sum, d) => sum + Number(d.amount), 0) || 0
      const paidDebt = debts?.filter(d => d.paid).reduce((sum, d) => sum + Number(d.amount), 0) || 0
      const unpaidDebt = totalDebt - paidDebt

      const { data: members } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      setStats({
        members: membersCount || 0,
        totalDebt: Math.round(totalDebt * 100) / 100,
        paidDebt: Math.round(paidDebt * 100) / 100,
        unpaidDebt: Math.round(unpaidDebt * 100) / 100
      })
      setRecentMembers(members || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-page">
        <h2>שגיאה בטעינת נתונים</h2>
        <p>{error}</p>
        <button className="btn" onClick={loadData}>נסה שוב</button>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <h1>דשבורד</h1>

      <div className="stats-grid">
        <div className="stat-card stat-members">
          <div className="stat-icon">👥</div>
          <div className="stat-body">
            <span className="stat-number">{stats.members}</span>
            <span className="stat-label">מתפללים</span>
          </div>
        </div>
        <div className="stat-card stat-unpaid">
          <div className="stat-icon">📋</div>
          <div className="stat-body">
            <span className="stat-number">{stats.unpaidDebt.toLocaleString()} ₪</span>
            <span className="stat-label">חובות פתוחים</span>
          </div>
        </div>
        <div className="stat-card stat-paid">
          <div className="stat-icon">✅</div>
          <div className="stat-body">
            <span className="stat-number">{stats.paidDebt.toLocaleString()} ₪</span>
            <span className="stat-label">נגבה</span>
          </div>
        </div>
        <div className="stat-card stat-total">
          <div className="stat-icon">💰</div>
          <div className="stat-body">
            <span className="stat-number">{stats.totalDebt.toLocaleString()} ₪</span>
            <span className="stat-label">סה"כ חובות</span>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <h2>מתפללים אחרונים</h2>
          <Link to="/members" className="btn btn-sm">לכל המתפללים</Link>
        </div>
        {recentMembers.length === 0 ? (
          <div className="empty-state">
            <p>אין מתפללים עדיין</p>
            <Link to="/members" className="btn">הוסף מתפלל ראשון</Link>
          </div>
        ) : (
          <div className="members-list">
            {recentMembers.map(m => (
              <Link to={`/members/${m.id}`} key={m.id} className="member-item">
                <div className="member-avatar">{m.name[0]}</div>
                <div className="member-info">
                  <span className="member-name">{m.name}</span>
                  {m.phone && <span className="member-phone">{m.phone}</span>}
                </div>
                <svg className="chevron-left" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
