import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../contexts/AuthContext'

export default function SetupSynagogue() {
  const { session, refreshProfile } = useAuth()
  const [step, setStep] = useState('check')
  const [synagogues, setSynagogues] = useState([])
  const [selectedSynagogue, setSelectedSynagogue] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', synagogueName: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    checkProfile()
  }, [])

  async function checkProfile() {
    try {
      // Check if user already has a profile (by user_id)
      const { data: existing } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (existing) {
        if (existing.synagogue_id) {
          await refreshProfile()
        } else {
          setStep('waiting')
          setForm(f => ({ ...f, name: existing.name || '' }))
        }
        return
      }

      // Check if someone pre-created a profile for this email (admin added them)
      const { data: byEmail } = await supabase
        .rpc('find_profile_by_email', { user_email: session.user.email })

      if (byEmail && byEmail.length > 0) {
        setStep('link-account')
        setForm(f => ({ ...f, name: byEmail[0].name || '' }))
        return
      }

      // New user — load synagogues list for joining
      const { data: syns } = await supabase.rpc('list_synagogues')
      setSynagogues(syns || [])
      setStep('choose')
    } catch (err) {
      setError('שגיאה: ' + err.message)
    }
  }

  async function joinSynagogue(e) {
    e.preventDefault()
    if (!form.name.trim() || !selectedSynagogue) return
    setSaving(true)
    setError(null)
    try {
      // Step 1: Create member record
      const { data: member, error: mErr } = await supabase
        .from('members')
        .insert({
          name: form.name.trim(),
          phone: form.phone.trim(),
          synagogue_id: selectedSynagogue
        })
        .select()
        .single()
      if (mErr) throw new Error(mErr.message)

      // Step 2: Create profile linked to member
      const { error: pErr } = await supabase
        .from('profiles')
        .insert({
          user_id: session.user.id,
          email: session.user.email,
          name: form.name.trim(),
          phone: form.phone.trim(),
          synagogue_id: selectedSynagogue,
          member_id: member.id,
          role: 'member'
        })
      if (pErr) throw new Error(pErr.message)

      await refreshProfile()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function submitRequest(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const { error } = await supabase
        .from('profiles')
        .insert({
          user_id: session.user.id,
          email: session.user.email,
          name: form.name.trim(),
          phone: form.phone.trim(),
          role: 'admin',
          synagogue_id: null
        })
      if (error) throw new Error(error.message)
      setStep('waiting')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function linkAccount(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ user_id: session.user.id })
        .eq('email', session.user.email)
      if (error) throw new Error(error.message)
      await refreshProfile()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (step === 'check') {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    )
  }

  // ============ CHOOSE: join existing or request new ============
  if (step === 'choose') {
    return (
      <div className="login-page">
        <div className="login-card" style={{ maxWidth: 420 }}>
          <div className="login-icon">🕍</div>
          <h1>ברוך הבא!</h1>
          <p className="login-subtitle">הצטרפות לבית הכנסת</p>
          {error && <div className="error-msg">{error}</div>}

          {selectedSynagogue === null ? (
            <>
              <p className="login-desc">בחר בית כנסת מהרשימה או בקש פתיחת בית כנסת חדש</p>

              {synagogues.length > 0 && (
                <div className="synagogue-select-list">
                  {synagogues.map(s => (
                    <button
                      key={s.id}
                      className="btn btn-secondary synagogue-option"
                      onClick={() => setSelectedSynagogue(s.id)}
                      style={{ width: '100%', marginBottom: 8, padding: '14px 16px' }}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}

              <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--border)' }} />

              <button
                className="btn btn-google"
                onClick={() => { setStep('request'); setForm({ name: '', phone: '', synagogueName: '' }) }}
              >
                בקש פתיחת בית כנסת חדש
              </button>
            </>
          ) : (
            <>
              <p className="login-desc">
                הצטרפות אל <strong>{synagogues.find(s => s.id === selectedSynagogue)?.name}</strong>
              </p>
              <form onSubmit={joinSynagogue}>
                <div className="form-group">
                  <label>השם שלך</label>
                  <input
                    type="text"
                    placeholder="ישראל ישראלי"
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
                <div className="form-buttons" style={{ flexDirection: 'column', gap: 8 }}>
                  <button className="btn btn-google" type="submit" disabled={saving}>
                    {saving ? 'שומר...' : 'הצטרף לבית הכנסת'}
                  </button>
                  <button className="btn btn-secondary" type="button" onClick={() => setSelectedSynagogue(null)}>
                    חזור לבחירה
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    )
  }

  // ============ REQUEST new synagogue ============
  if (step === 'request') {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-icon">📋</div>
          <h1>בקשת פתיחת בית כנסת</h1>
          <p className="login-desc">מלא את הפרטים והמנהל הראשי יאשר את בקשתך</p>
          {error && <div className="error-msg">{error}</div>}
          <form onSubmit={submitRequest}>
            <div className="form-group">
              <label>השם שלך</label>
              <input
                type="text"
                placeholder="ישראל ישראלי"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>שם בית הכנסת המבוקש</label>
              <input
                type="text"
                placeholder="בית כנסת..."
                value={form.synagogueName}
                onChange={e => setForm({ ...form, synagogueName: e.target.value })}
                required
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
            <button className="btn btn-google" type="submit" disabled={saving}>
              {saving ? 'שולח...' : 'שלח בקשה'}
            </button>
          </form>
          <button
            className="btn btn-secondary"
            style={{ width: '100%', marginTop: 8 }}
            onClick={() => setStep('choose')}
          >
            חזור
          </button>
        </div>
      </div>
    )
  }

  // ============ WAITING for approval ============
  if (step === 'waiting') {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-icon">⏳</div>
          <h1>הבקשה נשלחה</h1>
          <p className="login-desc">
            בקשתך התקבלה. המנהל הראשי יאשר אותה בקרוב.
          </p>
          <p className="login-desc" style={{ fontSize: '0.85rem', direction: 'ltr' }}>
            {session.user.email}
          </p>
          <button
            className="btn btn-secondary"
            style={{ width: '100%', marginTop: 16 }}
            onClick={() => supabase.auth.signOut()}
          >
            התנתק
          </button>
        </div>
      </div>
    )
  }

  // ============ LINK existing account ============
  if (step === 'link-account') {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-icon">🔄</div>
          <h1>חיבור חשבון</h1>
          <p className="login-desc">
            נמצא חשבון קיים למייל {session.user.email}. לחבר אותו למשתמש הנוכחי?
          </p>
          {error && <div className="error-msg">{error}</div>}
          <div style={{ marginTop: 16 }}>
            <button className="btn btn-google" onClick={linkAccount} disabled={saving}>
              {saving ? 'מחבר...' : 'כן, חבר חשבון'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // error fallback
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-icon">⚠️</div>
        <h1>שגיאה</h1>
        <p className="login-desc">{error || 'אירעה שגיאה לא צפויה'}</p>
        <button className="btn btn-google" onClick={() => window.location.reload()}>
          נסה שוב
        </button>
      </div>
    </div>
  )
}
