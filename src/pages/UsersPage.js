import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getAllProfiles, updateProfile } from '../lib/db'
import { ROLE_LABELS, ROLES } from '../lib/constants'

export default function UsersPage({ profile, onBack }) {
  const [users, setUsers] = useState([])
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email:'', full_name:'', role:'employee' })
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    const { data } = await getAllProfiles()
    setUsers(data || [])
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    setInviting(true); setInviteMsg('')
    const { error } = await supabase.auth.admin.inviteUserByEmail(inviteForm.email, {
      data: { full_name: inviteForm.full_name, role: inviteForm.role }
    })
    if (error) {
      setInviteMsg('Error: ' + error.message)
    } else {
      setInviteMsg(`Invite sent to ${inviteForm.email}`)
      setInviteForm({ email:'', full_name:'', role:'employee' })
      loadUsers()
    }
    setInviting(false)
  }

  const changeRole = async (userId, newRole) => {
    await updateProfile(userId, { role: newRole })
    loadUsers()
  }

  const roleColors = { owner:'#1D9E75', admin:'#185FA5', pm:'#534AB7', employee:'#C97A18', sub:'#B83232' }

  return (
    <div style={{ padding:'24px 28px', maxWidth:800 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <button className="btn-ghost" onClick={onBack}>← Back</button>
        <h1 style={{ fontSize:22, fontWeight:700, letterSpacing:-0.4 }}>Manage users</h1>
      </div>

      {/* Role guide */}
      <div className="card" style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', color:'var(--ink-light)', marginBottom:12 }}>Role permissions</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
          {[
            { role:'owner', perms:['All projects','Financials','Manage users','Delete projects'] },
            { role:'admin', perms:['All projects','Financials','Checklist','Schedule','Subs'] },
            { role:'pm', perms:['All projects','Checklist','Schedule','Subs','No financials'] },
            { role:'employee', perms:['Assigned projects','Check off tasks','Add notes'] },
            { role:'sub', perms:['Assigned projects','Own tasks only','Add notes'] },
          ].map(r => (
            <div key={r.role} style={{ background:'var(--cream)', borderRadius:'var(--rs)', padding:'10px 12px' }}>
              <div style={{ fontSize:11, fontWeight:700, color: roleColors[r.role], textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>{ROLE_LABELS[r.role]}</div>
              {r.perms.map(p => <div key={p} style={{ fontSize:11, color:'var(--ink-mid)', marginBottom:2 }}>• {p}</div>)}
            </div>
          ))}
        </div>
      </div>

      {/* Users list */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ fontSize:13, fontWeight:600 }}>All users ({users.length})</div>
        <button className="btn-primary" onClick={() => setShowInvite(true)}>+ Invite user</button>
      </div>
      <div style={{ background:'var(--white)', border:'1px solid var(--rule)', borderRadius:'var(--r)', overflow:'hidden', marginBottom:20 }}>
        {users.map(u => (
          <div key={u.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom:'1px solid var(--rule)' }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background: roleColors[u.role]||'#ccc', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#fff', flexShrink:0 }}>
              {(u.full_name||'?')[0].toUpperCase()}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:500 }}>{u.full_name||'—'}</div>
              <div style={{ fontSize:11, color:'var(--ink-light)' }}>{u.email}</div>
            </div>
            {u.id === profile?.id
              ? <span style={{ fontSize:12, fontWeight:600, color:'var(--green)' }}>You (Owner)</span>
              : <select value={u.role} onChange={e => changeRole(u.id, e.target.value)}
                  style={{ fontSize:12, border:'1px solid var(--rule)', borderRadius:'var(--rs)', padding:'4px 8px', fontFamily:'inherit', outline:'none', background:'var(--cream)', color: roleColors[u.role]||'var(--ink)', fontWeight:500, cursor:'pointer' }}>
                  {Object.entries(ROLE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
            }
          </div>
        ))}
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:400, padding:20 }} onClick={e => { if(e.target===e.currentTarget) setShowInvite(false) }}>
          <div style={{ background:'#fff', borderRadius:'var(--r)', padding:28, width:'100%', maxWidth:420, boxShadow:'0 8px 32px rgba(0,0,0,0.18)' }}>
            <h2 style={{ fontSize:16, fontWeight:600, marginBottom:4 }}>Invite a user</h2>
            <p style={{ fontSize:12, color:'var(--ink-mid)', marginBottom:18 }}>They'll receive an email to set their password and access the app.</p>
            <form onSubmit={handleInvite}>
              <div style={{ marginBottom:12 }}><label className="field-label">Full name</label><input className="field-input" value={inviteForm.full_name} onChange={e => setInviteForm(f=>({...f,full_name:e.target.value}))} placeholder="e.g. Sarah Martinez" required /></div>
              <div style={{ marginBottom:12 }}><label className="field-label">Email</label><input className="field-input" type="email" value={inviteForm.email} onChange={e => setInviteForm(f=>({...f,email:e.target.value}))} placeholder="sarah@example.com" required /></div>
              <div style={{ marginBottom:16 }}>
                <label className="field-label">Role</label>
                <select className="field-input" value={inviteForm.role} onChange={e => setInviteForm(f=>({...f,role:e.target.value}))}>
                  {Object.entries(ROLE_LABELS).filter(([k])=>k!=='owner').map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              {inviteMsg && <div style={{ fontSize:12, padding:'8px 10px', borderRadius:'var(--rs)', marginBottom:12, background: inviteMsg.startsWith('Error') ? 'var(--red-light)' : 'var(--green-light)', color: inviteMsg.startsWith('Error') ? 'var(--red)' : 'var(--green-dark)' }}>{inviteMsg}</div>}
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button type="button" className="btn-ghost" onClick={() => setShowInvite(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={inviting}>{inviting ? 'Sending…' : 'Send invite'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
