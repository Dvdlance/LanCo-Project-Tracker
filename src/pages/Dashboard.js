import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { createProject } from '../lib/db'
import { DEFAULT_PHASES, DEFAULT_DRAWS, CAN } from '../lib/constants'

export default function Dashboard({ profile, onOpenProject }) {
  const [projects, setProjects] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ client:'', jobnum:'', desc:'', value:'', start:'' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadProjects()
    const ch = supabase.channel('dash-projects')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, loadProjects)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [profile])

  const loadProjects = async () => {
    if (!profile) return
    let query = supabase.from('projects').select('*').order('created_at', { ascending: false })
    if (!CAN.viewAllProjects(profile.role)) {
      const { data: memberships } = await supabase.from('project_members').select('project_id').eq('user_id', profile.id)
      const ids = memberships?.map(m => m.project_id) || []
      if (!ids.length) { setProjects([]); return }
      query = query.in('id', ids)
    }
    const { data } = await query
    setProjects(data || [])
  }

  const autoSchedule = (startStr, phases) => {
    const sched = []
    let cur = new Date(startStr + 'T00:00:00')
    phases.forEach(p => {
      const s = cur.toISOString().slice(0,10)
      cur.setDate(cur.getDate() + p.days)
      sched.push({ start: s, end: cur.toISOString().slice(0,10) })
      cur.setDate(cur.getDate() + 1)
    })
    return sched
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.client.trim()) return
    setSaving(true)
    const phases = JSON.parse(JSON.stringify(DEFAULT_PHASES))
    const draws = JSON.parse(JSON.stringify(DEFAULT_DRAWS))
    const schedule = form.start ? autoSchedule(form.start, phases) : []
    const { error } = await createProject({
      client: form.client.trim(),
      job_number: form.jobnum.trim() || `LC-${Date.now().toString().slice(-4)}`,
      description: form.desc.trim() || 'Residential renovation',
      contract_value: parseFloat(form.value) || 0,
      start_date: form.start || null,
      phases, draws, schedule,
      task_state: {},
      draws_collected: [],
      created_by: profile.id,
    })
    setSaving(false)
    if (!error) { setShowNew(false); setForm({ client:'', jobnum:'', desc:'', value:'', start:'' }); loadProjects() }
  }

  const pct = (p) => {
    const total = (p.phases||[]).reduce((s, ph) => s + (ph.tasks?.length||0), 0)
    const done = Object.values(p.task_state||{}).filter(Boolean).length
    return total ? Math.round(done/total*100) : 0
  }
  const collected = (p) => {
    const v = p.contract_value||0
    const draws = p.draws||[]
    return (p.draws_collected||[]).reduce((s,i) => s + (v * ((draws[i]?.pct||0)/100)), 0)
  }
  const total = projects.length
  const active = projects.filter(p => pct(p) < 100).length
  const complete = projects.filter(p => pct(p) === 100).length
  const totalVal = projects.reduce((s,p) => s + (p.contract_value||0), 0)

  return (
    <div style={{ padding:'24px 28px' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:700, letterSpacing:-0.5 }}>Project dashboard</h1>
          <p style={{ fontSize:13, color:'var(--ink-mid)', marginTop:3 }}>LanCo Construction & Development — St. Petersburg, FL</p>
        </div>
        {CAN.createProject(profile?.role) && (
          <button className="btn-primary" onClick={() => setShowNew(true)}>+ New project</button>
        )}
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
        {[
          { label:'Total projects', value:total, color:'var(--ink)' },
          { label:'Active', value:active, color:'var(--amber)' },
          { label:'Complete', value:complete, color:'var(--green)' },
          { label:'Total contract value', value:`$${Math.round(totalVal).toLocaleString()}`, color:'var(--blue)' },
        ].map(k => (
          <div key={k.label} className="card">
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.07em', color:'var(--ink-light)', textTransform:'uppercase', marginBottom:5 }}>{k.label}</div>
            <div style={{ fontSize:26, fontWeight:700, letterSpacing:-1, color:k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Project cards */}
      <div style={{ fontSize:13, fontWeight:600, marginBottom:12 }}>All projects</div>
      {!projects.length
        ? <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--ink-light)' }}>
            <p style={{ marginBottom:14 }}>No projects yet.</p>
            {CAN.createProject(profile?.role) && <button className="btn-primary" onClick={() => setShowNew(true)}>+ New project</button>}
          </div>
        : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
          {projects.map(p => {
            const pc = pct(p); const col = collected(p); const val = p.contract_value||0
            const isDone = pc === 100
            return (
              <div key={p.id} className="card" onClick={() => onOpenProject(p.id)}
                style={{ cursor:'pointer', transition:'border-color 0.15s', borderColor: 'var(--rule)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor='var(--green)'}
                onMouseLeave={e => e.currentTarget.style.borderColor='var(--rule)'}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:600 }}>{p.client}</div>
                    <div style={{ fontSize:11, color:'var(--ink-light)', marginTop:1 }}>{p.job_number}</div>
                  </div>
                  <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:99, background: isDone?'#EAF3DE':pc>0?'var(--green-light)':'var(--amber-light)', color: isDone?'#3B6D11':pc>0?'var(--green-dark)':'var(--amber-dark)' }}>
                    {isDone ? 'Complete' : pc > 0 ? 'In progress' : 'Not started'}
                  </span>
                </div>
                <div style={{ height:5, background:'var(--rule)', borderRadius:99, overflow:'hidden', marginBottom:4 }}>
                  <div style={{ height:5, background:'var(--green)', borderRadius:99, width:`${pc}%` }} />
                </div>
                <div style={{ fontSize:11, color:'var(--ink-light)', marginBottom:10 }}>{pc}% · {p.description}</div>
                <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
                  <div style={{ fontSize:11, color:'var(--ink-mid)' }}><strong style={{ color:'var(--ink)' }}>${val.toLocaleString()}</strong> contract</div>
                  {CAN.viewFinancials(profile?.role) && <div style={{ fontSize:11, color:'var(--ink-mid)' }}><strong style={{ color:'var(--ink)' }}>${Math.round(col).toLocaleString()}</strong> collected</div>}
                  <div style={{ fontSize:11, color:'var(--ink-mid)' }}><strong style={{ color:'var(--ink)' }}>{(p.subs||[]).length}</strong> subs</div>
                </div>
              </div>
            )
          })}
        </div>
      }

      {/* New project modal */}
      {showNew && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:400, padding:20 }} onClick={e => { if(e.target===e.currentTarget) setShowNew(false) }}>
          <div style={{ background:'#fff', borderRadius:'var(--r)', padding:28, width:'100%', maxWidth:460, boxShadow:'0 8px 32px rgba(0,0,0,0.18)' }}>
            <h2 style={{ fontSize:16, fontWeight:600, marginBottom:4 }}>New project</h2>
            <p style={{ fontSize:12, color:'var(--ink-mid)', marginBottom:18 }}>Start a new job — schedule auto-estimates from your start date.</p>
            <form onSubmit={handleCreate}>
              {[
                { id:'client', label:'Client name', placeholder:'e.g. Thompson', required:true },
                { id:'jobnum', label:'Job number', placeholder:'e.g. LC-2026-048' },
                { id:'desc', label:'Project description', placeholder:'e.g. Kitchen & master bath renovation' },
              ].map(f => (
                <div key={f.id} style={{ marginBottom:12 }}>
                  <label className="field-label">{f.label}</label>
                  <input className="field-input" placeholder={f.placeholder} value={form[f.id]} onChange={e => setForm(x => ({...x, [f.id]:e.target.value}))} required={f.required} />
                </div>
              ))}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                <div>
                  <label className="field-label">Contract value ($)</label>
                  <input className="field-input" type="number" placeholder="e.g. 85000" value={form.value} onChange={e => setForm(x => ({...x, value:e.target.value}))} />
                </div>
                <div>
                  <label className="field-label">Start date</label>
                  <input className="field-input" type="date" value={form.start} onChange={e => setForm(x => ({...x, start:e.target.value}))} />
                </div>
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:4 }}>
                <button type="button" className="btn-ghost" onClick={() => setShowNew(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create project'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
