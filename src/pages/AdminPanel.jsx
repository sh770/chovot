import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../contexts/AuthContext'

export default function AdminPanel() {
  const { refreshProfile } = useAuth()
  const [synagogues, setSynagogues] = useState([])
  const [admins, setAdmins] = useState({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showAdminForm, setShowAdminForm] = useState(false)
  const [selectedSynagogue, setSelectedSynagogue] = useState(null)
  const [form, setForm] = useState({ name: '', adminEmail: '', adminName: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [pendingUsers, setPendingUsers] = useState([])

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const { data: s } = await supabase.from('synagogues').select('*').order('name')
      setSynagogues(s || [])

      // Load pending users (profile with no synagogue)
      const { data: p } = await supabase
        .from('profiles')
        .select('id, user_id, email, name, phone, role, created_at')
        .is('synagogue_id', null)
        .neq('role', 'member')
      setPendingUsers(p || [])

      // Load admins for each synagogue
      const adminsMap = {}
      for (const syn of s || []) {
        const { data: a } = await supabase
          .from('profiles')
          .select('id, email, name, role')
          .eq('synagogue_id', syn.id)
        adminsMap[syn.id] = a || []
      }
      setAdmins(adminsMap)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function addSynagogue(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const { data: synagogue, error: sErr } = await supabase
        .from('synagogues')
        .insert({ name: form.name.trim() })
        .select()
        .single()
      if (sErr) throw sErr

      setForm({ name: '', adminEmail: '', adminName: '' })
      setShowForm(false)
      await loadData()
      setMessage(`בית הכנסת "${synagogue.name}" נוצר בהצלחה`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteSynagogue(id, name) {
    if (!window.confirm(`למחוק את "${name}"? כל הנתונים ימחקו!`)) return
    try {
      await supabase.from('synagogues').delete().eq('id', id)
      await loadData()
      setMessage(`בית הכנסת "${name}" נמחק`)
    } catch (err) {
      setError(err.message)
    }
  }

  async function addAdmin(e) {
    e.preventDefault()
    if (!form.adminEmail.trim() || !selectedSynagogue) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      // Check if profile already exists for this email
      const { data: existing } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', form.adminEmail.trim())
        .maybeSingle()

      if (existing) {
        // Update existing profile to this synagogue
        const { error: uErr } = await supabase
          .from('profiles')
          .update({ synagogue_id: selectedSynagogue, role: 'admin' })
          .eq('id', existing.id)
        if (uErr) throw uErr
      } else {
        // Create a new profile (user will connect when they log in)
        const { error: pErr } = await supabase
          .from('profiles')
          .insert({
            user_id: `pending_${Date.now()}`,
            email: form.adminEmail.trim(),
            name: form.adminName.trim() || 'ממתין',
            synagogue_id: selectedSynagogue,
            role: 'admin'
          })
        if (pErr) throw pErr
      }

      setForm({ name: '', adminEmail: '', adminName: '' })
      setShowAdminForm(false)
      setSelectedSynagogue(null)
      await loadData()
      setMessage(`מנהל נוסף לבית הכנסת`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const [approveTarget, setApproveTarget] = useState(null)
  const [approveName, setApproveName] = useState('')

  async function approvePending(profileId, requestedName) {
    if (!requestedName.trim()) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      // Create synagogue with the requested name
      const { data: syn, error: sErr } = await supabase
        .from('synagogues')
        .insert({ name: requestedName.trim() })
        .select()
        .single()
      if (sErr) throw sErr

      // Update the profile: assign to new synagogue as admin
      const { error: uErr } = await supabase
        .from('profiles')
        .update({ synagogue_id: syn.id, role: 'admin' })
        .eq('id', profileId)
      if (uErr) throw uErr

      setApproveTarget(null)
      setApproveName('')
      await loadData()
      setMessage(`הבקשה אושרה! בית הכנסת "${syn.name}" נוצר והמשמש קיבל גישה`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function removeAdmin(adminId, email) {
    if (!window.confirm(`להסיר את ${email} מהניהול?`)) return
    try {
      await supabase.from('profiles').delete().eq('id', adminId)
      await loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>
  }

  return (
    <div className="admin-panel">
      <h1>ניהול מערכת</h1>

      {error && <div className="error-msg">{error}</div>}
      {message && <div className="success-msg">{message}</div>}

      {pendingUsers.length > 0 && (
        <div className="section">
          <div className="section-header">
            <h2>בקשות גישה ממתינות ({pendingUsers.length})</h2>
          </div>
          <div className="pending-list">
            {pendingUsers.map(u => (
              <div key={u.id} className="pending-item">
                <div className="pending-info">
                  <span className="pending-name">{u.name}</span>
                  <span className="pending-email">{u.email}</span>
                  <span className="pending-date">
                    {new Date(u.created_at).toLocaleDateString('he-IL')}
                  </span>
                </div>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => { setApproveTarget(u); setApproveName('') }}
                >
                  אשר
                </button>
                <button
                  className="btn-icon danger"
                  onClick={async () => {
                    if (window.confirm(`למחוק את בקשת ${u.name}?`)) {
                      await supabase.from('profiles').delete().eq('id', u.id)
                      await loadData()
                    }
                  }}
                  title="דחה בקשה"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* אישור בקשה - חלונית לבחירת שם בית כנסת */}
      {approveTarget && (
        <div className="modal-overlay" onClick={() => setApproveTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>אישור בקשה</h3>
            <p style={{ marginBottom: 12, color: 'var(--text-secondary)' }}>
              אשר את {approveTarget.name} ({approveTarget.email}) כמנהל בית כנסת חדש
            </p>
            <div className="form-group">
              <label>שם בית הכנסת</label>
              <input
                type="text"
                placeholder="בית כנסת..."
                value={approveName}
                onChange={e => setApproveName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="form-buttons">
              <button
                className="btn btn-primary"
                onClick={() => approvePending(approveTarget.id, approveName)}
                disabled={saving || !approveName.trim()}
              >
                {saving ? 'יוצר...' : 'צור בית כנסת ואשר'}
              </button>
              <button className="btn btn-secondary" onClick={() => setApproveTarget(null)}>
                בטל
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="section">
        <div className="section-header">
          <h2>בתי כנסת ({synagogues.length})</h2>
          <button className="btn btn-sm btn-primary" onClick={() => setShowForm(true)}>
            + הוסף בית כנסת
          </button>
        </div>

        {showForm && (
          <div className="modal-overlay" onClick={() => setShowForm(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <form onSubmit={addSynagogue}>
                <h3>בית כנסת חדש</h3>
                <div className="form-group">
                  <label>שם בית הכנסת</label>
                  <input
                    type="text"
                    placeholder="בית כנסת..."
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                    autoFocus
                  />
                </div>
                <div className="form-buttons">
                  <button className="btn btn-primary" type="submit" disabled={saving}>
                    {saving ? 'שומר...' : 'צור'}
                  </button>
                  <button className="btn btn-secondary" type="button" onClick={() => setShowForm(false)}>
                    בטל
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {synagogues.length === 0 ? (
          <div className="empty-state">
            <p>אין בתי כנסת עדיין</p>
          </div>
        ) : (
          <div className="synagogues-list">
            {synagogues.map(syn => (
              <div key={syn.id} className="synagogue-card">
                <div className="synagogue-header">
                  <div className="synagogue-info">
                    <span className="synagogue-name">{syn.name}</span>
                    <span className="synagogue-date">
                      נוצר: {new Date(syn.created_at).toLocaleDateString('he-IL')}
                    </span>
                  </div>
                  <button className="btn-icon danger" onClick={() => deleteSynagogue(syn.id, syn.name)}>
                    🗑️
                  </button>
                </div>

                <div className="synagogue-admins">
                  <div className="admins-header">
                    <span>מנהלים:</span>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => { setSelectedSynagogue(syn.id); setShowAdminForm(true); }}
                    >
                      + הוסף מנהל
                    </button>
                  </div>
                  {admins[syn.id]?.length === 0 ? (
                    <p className="no-admins">אין מנהלים</p>
                  ) : (
                    <div className="admins-list">
                      {admins[syn.id]?.map(a => (
                        <div key={a.id} className="admin-item">
                          <span className="admin-email">{a.email}</span>
                          <span className={`admin-role ${a.role}`}>
                            {a.role === 'super_admin' ? 'מנהל מערכת' : 'מנהל'}
                          </span>
                          {a.role !== 'super_admin' && (
                            <button className="btn-icon danger" onClick={() => removeAdmin(a.id, a.email)}>
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdminForm && (
        <div className="modal-overlay" onClick={() => { setShowAdminForm(false); setSelectedSynagogue(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <form onSubmit={addAdmin}>
              <h3>הוסף מנהל לבית הכנסת</h3>
              <div className="form-group">
                <label>אימייל המנהל</label>
                <input
                  type="email"
                  placeholder="admin@example.com"
                  value={form.adminEmail}
                  onChange={e => setForm({ ...form, adminEmail: e.target.value })}
                  required
                  autoFocus
                  dir="ltr"
                />
              </div>
              <div className="form-group">
                <label>שם המנהל</label>
                <input
                  type="text"
                  placeholder="ישראל ישראלי"
                  value={form.adminName}
                  onChange={e => setForm({ ...form, adminName: e.target.value })}
                />
              </div>
              <div className="form-buttons">
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? 'שומר...' : 'הוסף'}
                </button>
                <button className="btn btn-secondary" type="button" onClick={() => { setShowAdminForm(false); setSelectedSynagogue(null); }}>
                  בטל
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
