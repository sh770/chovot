import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { isConfigured, supabase } from './supabase'
import Login from './pages/Login'
import SetupSynagogue from './pages/SetupSynagogue'
import Dashboard from './pages/Dashboard'
import Members from './pages/Members'
import MemberDetail from './pages/MemberDetail'
import AdminPanel from './pages/AdminPanel'
import MyAccount from './pages/MyAccount'
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
  const { session, profile, loading } = useAuth()

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

  if (!session) return <Login />

  // User logged in but has no profile or hasn't been approved yet → setup page
  if (!profile || !profile.synagogue_id) return <SetupSynagogue />

  // Member user - personal account view only
  if (profile.role === 'member') {
    return (
      <div className="app-layout">
        <main className="main-content">
          <MyAccount />
        </main>
      </div>
    )
  }

  // Admin / super_admin - full management app
  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/members" element={<Members />} />
          <Route path="/members/:id" element={<MemberDetail />} />
          {profile.role === 'super_admin' && (
            <Route path="/admin" element={<AdminPanel />} />
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
