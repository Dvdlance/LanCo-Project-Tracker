import React, { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from './lib/supabase'
import { getProfile } from './lib/db'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import ProjectPage from './pages/ProjectPage'
import UsersPage from './pages/UsersPage'

export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('dashboard')    // 'dashboard' | 'project' | 'users'
  const [activeProjectId, setActiveProjectId] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadProfile(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session)
      if (session) loadProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const loadProfile = async (userId) => {
    const { data } = await getProfile(userId)
    setProfile(data)
    setLoading(false)
  }

  const openProject = (id) => { setActiveProjectId(id); setPage('project') }
  const goHome = () => { setPage('dashboard'); setActiveProjectId(null) }
  const goUsers = () => setPage('users')

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'var(--ink-light)'}}>Loading LanCo...</div>
  if (!session) return <LoginPage />

  return (
    <AuthContext.Provider value={{ session, profile, reload: () => loadProfile(session.user.id) }}>
      <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
        <Topbar profile={profile} onHome={goHome} onUsers={goUsers} page={page} />
        <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
          {page !== 'users' && (
            <Sidebar profile={profile} onOpenProject={openProject} activeProjectId={activeProjectId} onHome={goHome} />
          )}
          <main style={{ flex:1, overflowY:'auto' }}>
            {page === 'dashboard' && <Dashboard profile={profile} onOpenProject={openProject} />}
            {page === 'project' && <ProjectPage projectId={activeProjectId} profile={profile} onBack={goHome} />}
            {page === 'users' && <UsersPage profile={profile} onBack={goHome} />}
          </main>
        </div>
      </div>
    </AuthContext.Provider>
  )
}

function Topbar({ profile, onHome, onUsers, page }) {
  const roleColors = { owner:'#1D9E75', admin:'#185FA5', pm:'#534AB7', employee:'#C97A18', sub:'#B83232' }
  return (
    <header style={{ background:'var(--slate)', color:'#fff', height:52, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px', position:'sticky', top:0, zIndex:300, flexShrink:0 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }} onClick={onHome}>
        <div style={{ width:30, height:30, background:'var(--green)', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:12 }}>LC</div>
        <span style={{ fontSize:15, fontWeight:600 }}>LanCo Construction</span>
        <span style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginLeft:2 }}>Project Tracker</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        {profile?.role === 'owner' && (
          <button onClick={onUsers} style={{ background:'none', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'var(--rs)', padding:'5px 12px', color:'#fff', fontSize:12, cursor:'pointer' }}>
            Manage users
          </button>
        )}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:'50%', background: roleColors[profile?.role]||'#555', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700 }}>
            {(profile?.full_name||'?')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:500 }}>{profile?.full_name||'User'}</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', textTransform:'capitalize' }}>{profile?.role}</div>
          </div>
        </div>
        <button onClick={() => supabase.auth.signOut()} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.5)', fontSize:12, cursor:'pointer' }}>Sign out</button>
      </div>
    </header>
  )
}

function Sidebar({ profile, onOpenProject, activeProjectId, onHome }) {
  const [projects, setProjects] = useState([])

  useEffect(() => {
    loadProjects()
    // subscribe to project changes for live sidebar updates
    const ch = supabase.channel('sidebar-projects')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, loadProjects)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [profile])

  const loadProjects = async () => {
    if (!profile) return
    let query = supabase.from('projects').select('id,client,job_number,phases,task_state').order('created_at', { ascending: false })
    if (!['owner','admin','pm'].includes(profile.role)) {
      const { data: memberships } = await supabase.from('project_members').select('project_id').eq('user_id', profile.id)
      const ids = memberships?.map(m => m.project_id) || []
      if (!ids.length) { setProjects([]); return }
      query = query.in('id', ids)
    }
    const { data } = await query
    setProjects(data || [])
  }

  const pct = (p) => {
    const phases = p.phases || []
    const total = phases.reduce((s, ph) => s + (ph.tasks?.length || 0), 0)
    const done = Object.values(p.task_state || {}).filter(Boolean).length
    return total ? Math.round(done / total * 100) : 0
  }

  return (
    <aside style={{ width:240, flexShrink:0, background:'var(--white)', borderRight:'1px solid var(--rule)', overflowY:'auto', position:'sticky', top:52, height:'calc(100vh - 52px)' }}>
      <div style={{ padding:'12px 0' }}>
        {!projects.length
          ? <div style={{ padding:16, fontSize:12, color:'var(--ink-light)', fontStyle:'italic' }}>No projects yet.</div>
          : <>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.09em', color:'var(--ink-light)', textTransform:'uppercase', padding:'0 16px', marginBottom:4 }}>Projects</div>
            {projects.map(p => {
              const pc = pct(p)
              return (
                <div key={p.id} onClick={() => onOpenProject(p.id)}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 12px', borderRadius:'var(--rs)', cursor:'pointer', margin:'1px 8px', background: p.id===activeProjectId ? 'var(--green-light)' : 'transparent' }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background: pc===100 ? 'var(--green)' : pc>0 ? 'var(--amber)' : 'var(--rule)', flexShrink:0 }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:500, color: p.id===activeProjectId ? 'var(--green-dark)' : 'var(--ink)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.client}</div>
                    <div style={{ fontSize:10, color:'var(--ink-light)' }}>{pc}% complete</div>
                  </div>
                </div>
              )
            })}
          </>
        }
      </div>
    </aside>
  )
}
