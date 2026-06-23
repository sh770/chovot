import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase, isConfigured } from './supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Members from './pages/Members'
import MemberDetail from './pages/MemberDetail'
import Navbar from './components/Navbar'

function SetupNeeded() {
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-icon">🕍</div>
        <h1>ניהול חובות</h1>
        <p className="login-subtitle">בית הכנסת</p>
        <div className="setup-box">
          <p className="setup-title">⚠️ חסרה הגדרה</p>
          <p className="setup-desc">
            צריך ליצור קובץ <code>.env</code> בתיקיית הפרויקט עם מפתחות Supabase.
          </p>
          <div className="setup-code">
            <pre>VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key</pre>
          </div>
          <p className="setup-desc">
            עיין ב-<strong>README.md</strong> להוראות מלאות.
          </p>
          <button className="btn btn-google" onClick={() => window.location.reload()}>
            רענן אחרי ההגדרה
          </button>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isConfigured || !supabase) {
      setLoading(false)
      return
    }

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message || 'שגיאת התחברות')
        setLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!isConfigured || !supabase) {
    return <SetupNeeded />
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-icon">⚠️</div>
          <h1>שגיאת התחברות</h1>
          <p className="login-desc">{error}</p>
          <button className="btn btn-google" onClick={() => window.location.reload()}>
            נסה שוב
          </button>
        </div>
      </div>
    )
  }

  if (!session) return <Login />

  return (
    <div className="app-layout">
      <Navbar onLogout={() => supabase.auth.signOut()} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/members" element={<Members />} />
          <Route path="/members/:id" element={<MemberDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
