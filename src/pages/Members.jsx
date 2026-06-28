import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Members() {
  const { synagogueId } = useAuth()
  const [members, setMembers] = useState([])
  const [debtsSummary, setDebtsSummary] = useState({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (synagogueId) loadMembers()
  }, [synagogueId])

  async function loadMembers() {
    try {
      const { data: m, error } = await supabase
        .from('members')
        .select('*')
        .eq('synagogue_id', synagogueId)
        .order('name')
      if (error) throw error

      const { data: d } = await supabase
        .from('debts')
        .select('member_id, amount, paid')
        .eq('synagogue_id', synagogueId)

      const summary = {}
      d?.forEach(debt => {
        if (!summary[debt.member_id]) {
          summary[debt.member_id] = { total: 0, unpaid: 0 }
        }
        summary[debt.member_id].total += Number(debt.amount)
        summary[debt.member_id].unpaid += Number(debt.amount) - Number(debt.paid_amount || 0)
      })

      setMembers(m || [])
      setDebtsSummary(summary)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function addMember(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await supabase.from('members').insert({
        name: form.name.trim(),
        phone: form.phone.trim(),
        notes: form.notes.trim(),
        synagogue_id: synagogueId
      })
      setForm({ name: '', phone: '', notes: '' })
      setShowForm(false)
      await loadMembers()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function deleteMember(id, name) {
    if (!window.confirm(`למחוק את ${name}? כל החובות הקשורים ימחקו גם.`)) return
    try {
      await supabase.from('debts').delete().eq('member_id', id)
      await supabase.from('members').delete().eq('id', id)
      await loadMembers()
    } catch (err) {
      console.error(err)
    }
  }

  const filtered = members.filter(m =>
    m.name.includes(search) || m.phone?.includes(search)
  )

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>
  }

  return (
    <div className="members-page">
      <div className="page-header">
        <h1>מתפללים</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + הוסף
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <form onSubmit={addMember}>
              <h3>מתפלל חדש</h3>
              <div className="form-group">
                <label>שם מלא</label>
                <input
                  type="text"
                  placeholder="שם המתפלל"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>טלפון</label>
                <input
                  type="tel"
                  placeholder="טלפון (אופציונלי)"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>הערות</label>
                <textarea
                  placeholder="הערות (אופציונלי)"
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="form-buttons">
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? 'שומר...' : 'שמור'}
                </button>
                <button className="btn btn-secondary" type="button" onClick={() => setShowForm(false)}>
                  בטל
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="search-wrapper">
        <input
          className="search-input"
          type="search"
          placeholder="🔍  חפש מתפלל..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          {search ? 'לא נמצאו מתפללים התואמים לחיפוש' : 'אין מתפללים רשומים'}
        </div>
      ) : (
        <div className="members-list">
          {filtered.map(m => {
            const s = debtsSummary[m.id] || { total: 0, unpaid: 0 }
            return (
              <div key={m.id} className="member-item-wrapper">
                <Link to={`/members/${m.id}`} className="member-item">
                  <div className="member-avatar">{m.name[0]}</div>
                  <div className="member-info">
                    <span className="member-name">{m.name}</span>
                    <span className="member-debt">
                      {s.unpaid > 0 ? (
                        <span className="debt-amount-unpaid">{s.unpaid.toLocaleString()} ₪</span>
                      ) : (
                        <span className="debt-amount-paid">אין חובות</span>
                      )}
                    </span>
                  </div>
                  <svg className="chevron-left" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
                <button
                  className="btn-icon member-delete"
                  onClick={() => deleteMember(m.id, m.name)}
                  title="מחק"
                >
                  🗑️
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
