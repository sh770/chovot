import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../contexts/AuthContext'

export default function MemberDetail() {
  const { id } = useParams()
  const { synagogueId } = useAuth()
  const [member, setMember] = useState(null)
  const [debts, setDebts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editMember, setEditMember] = useState(false)
  const [form, setForm] = useState({ amount: '', description: '' })
  const [memberForm, setMemberForm] = useState({ name: '', phone: '', notes: '' })
  const [paymentDebt, setPaymentDebt] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState('')

  function formatHebrewDate(dateStr) {
    try {
      return new Intl.DateTimeFormat('he-IL-u-ca-hebrew', {
        year: 'numeric', month: 'long', day: 'numeric'
      }).format(new Date(dateStr))
    } catch {
      return ''
    }
  }

  useEffect(() => { loadData() }, [id])

  async function loadData() {
    try {
      const { data: m, error: mErr } = await supabase
        .from('members')
        .select('*')
        .eq('id', id)
        .eq('synagogue_id', synagogueId)
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
        paid: false,
        synagogue_id: synagogueId
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

  async function recordPayment(debtId, amount) {
    try {
      await supabase.from('debts').update({ paid_amount: amount }).eq('id', debtId)
      setPaymentDebt(null)
      setPaymentAmount('')
      await loadData()
    } catch (err) {
      console.error(err)
    }
  }

  function openPayment(debt) {
    setPaymentDebt(debt)
    setPaymentAmount(String(debt.paid_amount || 0))
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
    return <div className="loading"><div className="spinner"></div></div>
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
  const paidTotal = debts.reduce((sum, d) => sum + Number(d.paid_amount || 0), 0)
  const unpaidTotal = totalDebt - paidTotal

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
                    placeholder="למשל: תרומה, עליה לתורה... או כתוב חופשי"
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
            {debts.map(d => {
              const paid = Number(d.paid_amount || 0)
              const total = Number(d.amount)
              const remaining = total - paid
              const isFullyPaid = paid >= total && total > 0
              const isPartial = paid > 0 && !isFullyPaid
              const statusIcon = isFullyPaid ? '✅' : isPartial ? '🔄' : '⬜'

              return (
                <div key={d.id} className={`debt-item ${isFullyPaid ? 'debt-paid' : ''}`}>
                  <div className="debt-status">
                    <button
                      className={`debt-check ${isFullyPaid ? 'checked' : ''}`}
                      onClick={() => openPayment(d)}
                      title={isFullyPaid ? 'לחץ לשינוי תשלום' : 'לחץ להכנסת תשלום'}
                    >
                      {statusIcon}
                    </button>
                  </div>
                  <div className="debt-info">
                    <span className="debt-amount">
                      {total.toLocaleString()} ₪
                    </span>
                    {isPartial && (
                      <span className="debt-partial">
                        שולם {paid.toLocaleString()} ₪ · נשאר {remaining.toLocaleString()} ₪
                      </span>
                    )}
                    {isFullyPaid && (
                      <span className="debt-paid-label">שולם במלואו</span>
                    )}
                    <span className="debt-desc">{d.description}</span>
                    <span className="debt-date">
                      {new Date(d.created_at).toLocaleDateString('he-IL', {
                        year: 'numeric', month: 'long', day: 'numeric'
                      })}
                    </span>
                    <span className="debt-date-hebrew">
                      {formatHebrewDate(d.created_at)}
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
              )
            })}
          </div>
        )}

        {/* תפריט תשלום */}
        {paymentDebt && (
          <div className="modal-overlay" onClick={() => setPaymentDebt(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>תשלום חוב</h3>
              <p style={{ marginBottom: 12, color: 'var(--text-secondary)' }}>
                {paymentDebt.description} — {Number(paymentDebt.amount).toLocaleString()} ₪
              </p>
              <div className="form-group">
                <label>סכום ששולם (₪)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={Number(paymentDebt.amount)}
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-buttons">
                <button
                  className="btn btn-primary"
                  onClick={() => recordPayment(paymentDebt.id, parseFloat(paymentAmount) || 0)}
                  disabled={saving}
                >
                  {saving ? 'שומר...' : 'עדכן תשלום'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => recordPayment(paymentDebt.id, Number(paymentDebt.amount))}
                  disabled={saving}
                >
                  שלם מלא
                </button>
                {Number(paymentDebt.paid_amount || 0) > 0 && (
                  <button
                    className="btn btn-secondary"
                    style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                    onClick={() => recordPayment(paymentDebt.id, 0)}
                    disabled={saving}
                  >
                    בטל תשלום
                  </button>
                )}
                <button className="btn btn-secondary" type="button" onClick={() => setPaymentDebt(null)}>
                  בטל
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
