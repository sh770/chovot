import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../contexts/AuthContext'

export default function SetupSynagogue() {
  const { session, refreshProfile } = useAuth()
  const [step, setStep] = useState('check')
  const [form, setForm] = useState({ name: '', synagogueName: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    checkExistingProfile()
  }, [])

  async function checkExistingProfile() {
    try {
      // Check if user already has a profile by email
      const { data: existing, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', session.user.email)
        .maybeSingle()

      if (pErr) {
        // If RLS blocks, assume no profile and let user create one
        setStep('create-synagogue')
        return
      }

      if (existing) {
        setStep('link-account')
        setForm(f => ({ ...f, name: existing.name || '' }))
      } else {
        setStep('create-synagogue')
      }
    } catch (err) {
      setError('שגיאה: ' + err.message)
    }
  }

  async function createFirstSynagogue(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.synagogueName.trim()) return
    setSaving(true)
    setError(null)
    try {
      // שלב 1: צור פרופיל (ללא synagogue_id)
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .insert({
          user_id: session.user.id,
          email: session.user.email,
          name: form.name.trim(),
          role: 'super_admin'
        })
        .select()
        .single()
      if (pErr) throw new Error(pErr.message)

      // שלב 2: צור בית כנסת
      const { data: synagogue, error: sErr } = await supabase
        .from('synagogues')
        .insert({ name: form.synagogueName.trim() })
        .select()
        .single()
      if (sErr) throw new Error(sErr.message)

      // שלב 3: עדכן פרופיל עם synagogue_id
      const { error: uErr } = await supabase
        .from('profiles')
        .update({ synagogue_id: synagogue.id })
        .eq('id', profile.id)
      if (uErr) throw new Error(uErr.message)

      await refreshProfile()
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
      const { error: pErr } = await supabase
        .from('profiles')
        .update({ user_id: session.user.id })
        .eq('email', session.user.email)
      if (pErr) throw new Error(pErr.message)

      await refreshProfile()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (step === 'check' && !error) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    )
  }

  if (step === 'create-synagogue') {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-icon">🕍</div>
          <h1>ברוך הבא!</h1>
          <p className="login-subtitle">הקמת בית כנסת חדש</p>
          <p className="login-desc">מלא את הפרטים כדי ליצור בית כנסת משלך ולהיות מנהל המערכת שלו</p>
          {error && <div className="error-msg">{error}</div>}
          <form onSubmit={createFirstSynagogue}>
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
              <label>שם בית הכנסת</label>
              <input
                type="text"
                placeholder="בית כנסת..."
                value={form.synagogueName}
                onChange={e => setForm({ ...form, synagogueName: e.target.value })}
                required
              />
            </div>
            <button className="btn btn-google" type="submit" disabled={saving}>
              {saving ? 'שומר...' : 'צור בית כנסת והתחל'}
            </button>
          </form>
        </div>
      </div>
    )
  }

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
