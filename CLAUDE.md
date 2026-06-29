# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## שפה
- תמיד תסביר ותענה בעברית, אלא אם ההנחיה עצמה כתובה באנגלית
- קוד, שמות משתנים, והערות בקוד - נשארים בשפה המקורית שלהם

## Commands

```bash
npm run dev      # Start Vite dev server (hot reload)
npm run build    # Production build to dist/
npm run preview  # Preview production build locally
```

## Tech Stack

- **React 18** with React Router v6 (client-side SPA)
- **Vite** bundler with `@vitejs/plugin-react`
- **Supabase** (Postgres + Auth) — free tier, client-side JS SDK `@supabase/supabase-js`
- **No CSS framework** — single `App.css` file with CSS variables and BEM-like naming
- **Mobile-first, RTL** — right-to-left Hebrew UI, bottom navigation on mobile, sidebar on desktop (>768px)

## Project Structure

```
src/
  main.jsx              # Entry point: BrowserRouter > AuthProvider > App
  App.jsx               # Routing logic: config check → login → setup → main app
  supabase.js           # Supabase client init (guarded by isConfigured)
  App.css               # All styles, single file
  contexts/
    AuthContext.jsx      # Auth state: session, profile, synagogue, role checks
  components/
    Navbar.jsx          # Bottom nav (mobile) / sidebar (desktop), logout button
  pages/
    Login.jsx           # Google OAuth login button
    SetupSynagogue.jsx  # First-user onboarding or account linking
    Dashboard.jsx       # Stats overview (members, debts) + recent members list
    Members.jsx         # Member list with search, add/delete, debt summary
    MemberDetail.jsx    # Single member with debt list, add/toggle-paid/delete debt
    AdminPanel.jsx      # super_admin only: manage synagogues and their admins
public/
  _redirects            # SPA fallback for Cloudflare Pages
```

## Data Model (Supabase/Postgres)

Tables defined in `supabase-schema.sql` — must be run manually via Supabase SQL Editor:

- **synagogues** — multi-tenant root: `id, name, created_at`
- **profiles** — links Google auth users to synagogues: `user_id, email, name, synagogue_id (FK), role (admin|super_admin)`
- **members** — worshippers: `name, phone, notes, synagogue_id (FK)`
- **debts** — per-member debts: `member_id (FK), amount, paid (bool), description, synagogue_id (FK)`

### Row Level Security (RLS)
All tables have RLS. Profiles are scoped by `user_id = auth.uid()::text`. Members and debts are scoped by `synagogue_id` matching the user's profile. Super admins bypass synagogue scoping and see everything.

## Auth Flow

1. **Supabase Google OAuth** — `supabase.auth.signInWithOAuth({ provider: 'google' })`
2. On first login, user creates their synagogue and becomes `super_admin` (SetupSynagogue page)
3. Subsequent login loads profile + synagogue from `AuthContext` via `loadProfile()`
4. Auth state changes handled by `supabase.auth.onAuthStateChange` subscription
5. Guest users (no profile) see `SetupSynagogue` flow — either first-user onboarding or "waiting for approval" screen

## Role System

- **super_admin**: Created at first-user setup. Full access to all synagogues, can add/delete synagogues and manage admins via `/admin` panel. Also sees regular app pages for their own synagogue.
- **admin**: Normal user assigned to one synagogue. Can only see/edit members and debts belonging to that synagogue.

## Key Patterns

- Each page checks `synagogueId` from `useAuth()` before loading data — null-safe (guards with `if (synagogueId) loadData()`)
- All Supabase queries filter by `synagogue_id` for data isolation
- Optimistic/local state management (no external state library — each page manages its own fetch/loading/error state)
- Modals for add forms (not separate pages)
- `refreshProfile()` exposed by AuthContext for re-fetching profile after changes (used by SetupSynagogue and AdminPanel)

## Deployment

Two supported targets:
- **Vercel**: SPA rewrites in `vercel.json`
- **Cloudflare Pages**: SPA fallback in `public/_redirects`, build config in `wrangler.toml`

Environment variables required for both:
```
VITE_SUPABASE_URL=<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```
