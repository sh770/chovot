import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Dashboard() {
  const { synagogueId, isSuperAdmin } = useAuth()
  const [stats, setStats] = useState({ members: 0, totalDebt: 0, paidDebt: 0, unpaidDebt: 0 })
  const [recentMembers, setRecentMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [synagogue, setSynagogue] = useState(null)

  useEffect(() => {
    if (synagogueId) loadData()
  }, [synagogueId])

  async function loadData() {
    try {
      const { data: syn } = await supabase
        .from('synagogues')
        .select('*')
        .eq('id', synagogueId)
        .single()
      setSynagogue(syn)

      const { count: membersCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('synagogue_id', synagogueId)

      const { data: debts } = await supabase
        .from('debts')
        .select('amount, paid')
        .eq('synagogue_id', synagogueId)

      const totalDebt = debts?.reduce((sum, d) => sum + Number(d.amount), 0) || 0
      const paidDebt = debts?.reduce((sum, d) => {
        const paidAmt = d.paid_amount !== undefined && d.paid_amount !== null ? Number(d.paid_amount) : (d.paid ? Number(d.amount) : 0)
        return sum + paidAmt
      }, 0) || 0
      const unpaidDebt = totalDebt - paidDebt

      const { data: members } = await supabase
        .from('members')
        .select('*')
        .eq('synagogue_id', synagogueId)
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
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>
  }

  return (
    <div className="dashboard">
      <h1>דשבורד</h1>
      {synagogue && <p className="synagogue-badge">{synagogue.name}</p>}

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

      {isSuperAdmin && (
        <div className="section">
          <div className="section-header">
            <h2>ניהול מערכת</h2>
            <Link to="/admin" className="btn btn-sm">לפאנל ניהול</Link>
          </div>
          <div className="empty-state" style={{ padding: '16px' }}>
            <p style={{ fontSize: '0.9rem' }}>אתה מנהל מערכת - יש לך גישה לכל בתי הכנסת</p>
          </div>
        </div>
      )}
    </div>
  )
}
