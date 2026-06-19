import React, { useState } from 'react'
import { signIn } from '../lib/db'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await signIn(email, password)
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--slate)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'#fff', borderRadius:12, padding:36, width:'100%', maxWidth:380, boxShadow:'0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:44, height:44, background:'var(--green)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:16, color:'#fff', margin:'0 auto 12px' }}>LC</div>
          <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:-0.4 }}>LanCo Project Tracker</h1>
          <p style={{ fontSize:13, color:'var(--ink-mid)', marginTop:4 }}>Sign in to your account</p>
        </div>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom:14 }}>
            <label className="field-label">Email</label>
            <input className="field-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div style={{ marginBottom:20 }}>
            <label className="field-label">Password</label>
            <input className="field-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          {error && <div style={{ fontSize:12, color:'var(--red)', marginBottom:12, background:'var(--red-light)', padding:'8px 10px', borderRadius:'var(--rs)' }}>{error}</div>}
          <button className="btn-primary" type="submit" disabled={loading} style={{ width:'100%', padding:'10px', fontSize:14 }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p style={{ fontSize:11, color:'var(--ink-light)', textAlign:'center', marginTop:20 }}>
          Contact David or Admin to get access.
        </p>
      </div>
    </div>
  )
}
