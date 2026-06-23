import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabase'

export default function MemberDetail() {
  const { id } = useParams()
  const [member, setMember] = useState(null)
  const [debts, setDebts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editMember, setEditMember] = useState(false)
  const [form, setForm] = useState({ amount: '', description: '' })
  const [memberForm, setMemberForm] = useState({ name: '', phone: '', notes: '' })

  useEffect(() => { loadData() }, [id])

  async function loadData() {
    try {
      const { data: m, error: mErr } = await supabase
        .from('members')
        .select('*')
        .eq('id', id)
        .single()
      if (mErr) throw mErr

      const { data: d, error: dErr } = await supabase
        .from('debts')
        .select('*')
        .eq('member_id', id)
        .order('created_at', { ascending: false })
      if (dErr) throw dErr

      setMember(m)
      setDebts(d || [])
      setMemberForm({ name: m.name, phone: m.phone || '', notes: m.notes || '' })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function addDebt(e) {
    e.preventDefault()
    if (!form.amount || !form.description) return
    setSaving(true)
    try {
      await supabase.from('debts').insert({
        member_id: id,
        amount: parseFloat(form.amount),
        description: form.description,
        paid: false
      })
      setForm({ amount: '', description: '' })
      setShowForm(false)
      await loadData()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function togglePaid(debtId, current) {
    try {
      await supabase.from('debts').update({ paid: !current }).eq('id', debtId)
      await loadData()
    } catch (err) {
      console.error(err)
    }
  }

  async function deleteDebt(debtId) {
    if (!window.confirm('למחוק חוב זה?')) return
    try {
      await supabase.from('debts').delete().eq('id', debtId)
      await loadData()
    } catch (err) {
      console.error(err)
    }
  }

  async function updateMember(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await supabase.from('members').update({
        name: memberForm.name,
        phone: memberForm.phone,
        notes: memberForm.notes
      }).eq('id', id)
      setEditMember(false)
      await loadData()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="error-page">
        <h2>מתפלל לא נמצא</h2>
        <Link to="/members" className="btn">חזרה לרשימה</Link>
      </div>
    )
  }

  const totalDebt = debts.reduce((sum, d) => sum + Number(d.amount), 0)
  const unpaidTotal = debts.filter(d => !d.paid).reduce((sum, d) => sum + Number(d.amount), 0)
  const paidTotal = debts.filter(d => d.paid).reduce((sum, d) => sum + Number(d.amount), 0)

  return (
    <div className="member-detail">
      <Link to="/members" className="back-link">← חזרה לרשימה</Link>

      <div className="member-header">
        <div className="member-header-main">
          <div className="member-avatar large">{member.name[0]}</div>
          <div className="member-header-info">
            {editMember ? (
              <form onSubmit={updateMember} className="edit-member-form">
                <input
                  type="text"
                  value={memberForm.name}
                  onChange={e => setMemberForm({ ...memberForm, name: e.target.value })}
                  required
                  className="edit-input"
                />
                <input
                  type="tel"
                  value={memberForm.phone}
                  onChange={e => setMemberForm({ ...memberForm, phone: e.target.value })}
                  placeholder="טלפון"
                  className="edit-input"
                />
                <textarea
                  value={memberForm.notes}
                  onChange={e => setMemberForm({ ...memberForm, notes: e.target.value })}
                  placeholder="הערות"
                  rows={2}
                  className="edit-input"
                />
                <div className="form-buttons">
                  <button className="btn btn-sm btn-primary" type="submit" disabled={saving}>
                    {saving ? 'שומר...' : 'שמור'}
                  </button>
                  <button className="btn btn-sm btn-secondary" type="button" onClick={() => setEditMember(false)}>
                    בטל
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h1>{member.name}</h1>
                {member.phone && <p className="member-phone">📞 {member.phone}</p>}
                {member.notes && <p className="member-notes">{member.notes}</p>}
                <button className="btn btn-sm btn-secondary" onClick={() => setEditMember(true)}>
                  ✏️ ערוך
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="stats-grid small">
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
            <span className="stat-label">סה"כ</span>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <h2>חובות</h2>
          <button className="btn btn-sm btn-primary" onClick={() => setShowForm(true)}>
            + הוסף חוב
          </button>
        </div>

        {showForm && (
          <div className="modal-overlay" onClick={() => setShowForm(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <form onSubmit={addDebt}>
                <h3>חוב חדש</h3>
                <div className="form-group">
                  <label>סכום (₪)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label>תיאור</label>
                  <input
                    type="text"
                    placeholder="למשל: אבול, מנוי שנתי, תרומה..."
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    required
                  />
                </div>
                <div className="form-buttons">
                  <button className="btn btn-primary" type="submit" disabled={saving}>
                    {saving ? 'שומר...' : 'הוסף חוב'}
                  </button>
                  <button className="btn btn-secondary" type="button" onClick={() => setShowForm(false)}>
                    בטל
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {debts.length === 0 ? (
          <div className="empty-state">
            <p>אין חובות רשומים למתפלל זה</p>
          </div>
        ) : (
          <div className="debts-list">
            {debts.map(d => (
              <div key={d.id} className={`debt-item ${d.paid ? 'debt-paid' : ''}`}>
                <div className="debt-status">
                  <button
                    className={`debt-check ${d.paid ? 'checked' : ''}`}
                    onClick={() => togglePaid(d.id, d.paid)}
                    title={d.paid ? 'סמן כפתוח' : 'סמן כשולם'}
                  >
                    {d.paid ? '✅' : '⬜'}
                  </button>
                </div>
                <div className="debt-info">
                  <span className="debt-amount">
                    {Number(d.amount).toLocaleString()} ₪
                  </span>
                  <span className="debt-desc">{d.description}</span>
                  <span className="debt-date">
                    {new Date(d.created_at).toLocaleDateString('he-IL', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <button
                  className="btn-icon danger"
                  onClick={() => deleteDebt(d.id)}
                  title="מחק חוב"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
