import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { updateProject, getNotes, addNote, deleteNote, getProjectMembers, getAllProfiles, addProjectMember, removeProjectMember } from '../lib/db'
import { CAN, ROLE_LABELS } from '../lib/constants'
 
const TABS = ['checklist','schedule','financials','notes','subs','team']
const TAB_LABELS = { checklist:'Checklist', schedule:'Schedule', financials:'Financials', notes:'Notes', subs:'Subcontractors', team:'Team' }
const OWNERS = ['David','Admin','PM','Employee','Sub']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
 
export default function ProjectPage({ projectId, profile, onBack }) {
  const [project, setProject] = useState(null)
  const [tab, setTab] = useState('checklist')
  const [expanded, setExpanded] = useState({})
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [schedModal, setSchedModal] = useState(null)
  const [notes, setNotes] = useState([])
  const [noteText, setNoteText] = useState('')
  const [members, setMembers] = useState([])
  const [allProfiles, setAllProfiles] = useState([])
 
  useEffect(() => {
    if (!projectId) return
    loadProject()
    loadNotes()
    loadMembers()
    if (CAN.manageUsers(profile?.role)) loadAllProfiles()
    // realtime
    const ch = supabase.channel(`proj-${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `id=eq.${projectId}` }, loadProject)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes', filter: `project_id=eq.${projectId}` }, loadNotes)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [projectId])
 
  const loadProject = async () => {
    const { data } = await supabase.from('projects').select('*').eq('id', projectId).single()
    setProject(data)
  }
  const loadNotes = async () => {
    const { data } = await getNotes(projectId)
    setNotes(data || [])
  }
  const loadMembers = async () => {
    const { data } = await getProjectMembers(projectId)
    setMembers(data || [])
  }
  const loadAllProfiles = async () => {
    const { data } = await getAllProfiles()
    setAllProfiles(data || [])
  }
 
  const update = async (changes) => {
    await updateProject(projectId, changes)
  }
 
  const toggleTask = async (pid, idx, val) => {
    if (!CAN.checkOffTasks(profile?.role)) return
    const state = { ...(project.task_state || {}), [`${pid}-${idx}`]: val }
    setProject(p => ({ ...p, task_state: state }))
    await update({ task_state: state })
  }
 
  const editTaskText = async (pid, idx, val) => {
    if (!CAN.editChecklist(profile?.role)) return
    const phases = JSON.parse(JSON.stringify(project.phases))
    phases[pid].tasks[idx].text = val
    setProject(p => ({ ...p, phases }))
    await update({ phases })
  }
 
  const editTaskOwner = async (pid, idx, val) => {
    if (!CAN.editChecklist(profile?.role)) return
    const phases = JSON.parse(JSON.stringify(project.phases))
    phases[pid].tasks[idx].owner = val
    setProject(p => ({ ...p, phases }))
    await update({ phases })
  }
 
  const editPhaseLabel = async (pid, val) => {
    if (!CAN.editChecklist(profile?.role)) return
    const phases = JSON.parse(JSON.stringify(project.phases))
    phases[pid].label = val
    setProject(p => ({ ...p, phases }))
    await update({ phases })
  }
 
  const editDrawLabel = async (idx, val) => {
    if (!CAN.editFinancials(profile?.role)) return
    const draws = JSON.parse(JSON.stringify(project.draws))
    draws[idx].label = val
    setProject(p => ({ ...p, draws }))
    await update({ draws })
  }
 
  const editDrawPct = async (idx, val) => {
    if (!CAN.editFinancials(profile?.role)) return
    const draws = JSON.parse(JSON.stringify(project.draws))
    draws[idx].pct = parseFloat(val) || 0
    setProject(p => ({ ...p, draws }))
    await update({ draws })
  }
 
  const toggleDraw = async (idx) => {
    if (!CAN.editFinancials(profile?.role)) return
    const dc = [...(project.draws_collected || [])]
    const i = dc.indexOf(idx)
    if (i >= 0) dc.splice(i, 1); else dc.push(idx)
    setProject(p => ({ ...p, draws_collected: dc }))
    await update({ draws_collected: dc })
  }
 
  const saveContractValue = async (val) => {
    if (!CAN.editFinancials(profile?.role)) return
    setProject(p => ({ ...p, contract_value: val }))
    await update({ contract_value: val })
  }
 
  const autoSchedule = (startStr) => {
    const sched = []; let cur = new Date(startStr + 'T00:00:00')
    project.phases.forEach(p => {
      const s = cur.toISOString().slice(0,10)
      cur.setDate(cur.getDate() + p.days)
      sched.push({ start: s, end: cur.toISOString().slice(0,10) })
      cur.setDate(cur.getDate() + 1)
    })
    return sched
  }
 
  const resetSchedule = async (startStr) => {
    if (!CAN.editSchedule(profile?.role) || !startStr) return
    const schedule = autoSchedule(startStr)
    setProject(p => ({ ...p, schedule, start_date: startStr }))
    await update({ schedule, start_date: startStr })
  }
 
  const saveSchedPhase = async (pid, start, end) => {
    if (!CAN.editSchedule(profile?.role)) return
    const schedule = [...(project.schedule || [])]
    while (schedule.length <= pid) schedule.push({ start:'', end:'' })
    schedule[pid] = { start, end }
    setProject(p => ({ ...p, schedule }))
    await update({ schedule })
    setSchedModal(null)
  }
 
  const addSub = async (sub) => {
    if (!CAN.manageSubs(profile?.role)) return
    const subs = [...(project.subs || []), sub]
    setProject(p => ({ ...p, subs }))
    await update({ subs })
  }
 
  const removeSub = async (idx) => {
    if (!CAN.manageSubs(profile?.role)) return
    const subs = (project.subs || []).filter((_, i) => i !== idx)
    setProject(p => ({ ...p, subs }))
    await update({ subs })
  }
 
  const submitNote = async (e) => {
    e.preventDefault()
    if (!noteText.trim()) return
    await addNote(projectId, profile.id, noteText.trim())
    setNoteText('')
  }
 
  const pct = () => {
    const total = (project?.phases||[]).reduce((s, ph) => s + (ph.tasks?.length||0), 0)
    const done = Object.values(project?.task_state||{}).filter(Boolean).length
    return total ? Math.round(done/total*100) : 0
  }
 
  const phaseDone = (pid) => (project?.phases[pid]?.tasks||[]).every((_,i) => project?.task_state?.[`${pid}-${i}`])
  const phaseCount = (pid) => (project?.phases[pid]?.tasks||[]).filter((_,i) => project?.task_state?.[`${pid}-${i}`]).length
  const phaseLocked = (pid) => pid > 0 && !phaseDone(pid-1)
 
  const totalCollected = () => {
    const v = project?.contract_value||0
    return (project?.draws_collected||[]).reduce((s,i) => s + (v*((project?.draws[i]?.pct||0)/100)), 0)
  }
 
  if (!project) return <div style={{ padding:40, color:'var(--ink-light)' }}>Loading project…</div>
 
  const pc = pct()
  const visibleTabs = TABS.filter(t => {
    if (t === 'financials' && !CAN.viewFinancials(profile?.role)) return false
    if (t === 'schedule' && !CAN.viewSchedule(profile?.role)) return false
    if (t === 'team' && !CAN.manageSubs(profile?.role)) return false
    return true
  })
 
  return (
    <div>
      {/* Sticky tab bar */}
      <div style={{ display:'flex', alignItems:'stretch', borderBottom:'1px solid var(--rule)', background:'var(--white)', padding:'0 24px', position:'sticky', top:52, zIndex:200, minHeight:50 }}>
        <div style={{ display:'flex', alignItems:'center', flex:1, minWidth:0, padding:'8px 0' }}>
          <button className="btn-ghost" onClick={onBack} style={{ marginRight:14, fontSize:12, whiteSpace:'nowrap' }}>← All projects</button>
          <span style={{ fontSize:14, fontWeight:600, marginRight:8, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{project.client}</span>
          <span style={{ fontSize:12, color:'var(--ink-light)', whiteSpace:'nowrap' }}>{project.job_number} · {pc}% complete</span>
        </div>
        <div style={{ display:'flex' }}>
          {visibleTabs.map(t => (
            <div key={t} onClick={() => setTab(t)}
              style={{ padding:'0 14px', height:48, display:'flex', alignItems:'center', fontSize:13, fontWeight:500, cursor:'pointer', color: tab===t ? 'var(--green-dark)' : 'var(--ink-mid)', borderBottom: tab===t ? '2px solid var(--green)' : '2px solid transparent', whiteSpace:'nowrap' }}>
              {TAB_LABELS[t]}
            </div>
          ))}
        </div>
        {CAN.deleteProject(profile?.role) && (
          <div style={{ display:'flex', alignItems:'center', paddingLeft:12 }}>
            <button className="btn-ghost btn-danger" onClick={async () => { if(window.confirm('Delete this project?')) { await supabase.from('projects').delete().eq('id',projectId); onBack() } }}>Delete</button>
          </div>
        )}
      </div>
 
      <div style={{ padding:'24px 28px', paddingTop:'32px' }}>
        {tab === 'checklist' && <ChecklistTab project={project} profile={profile} expanded={expanded} setExpanded={setExpanded} phaseDone={phaseDone} phaseCount={phaseCount} phaseLocked={phaseLocked} toggleTask={toggleTask} editTaskText={editTaskText} editTaskOwner={editTaskOwner} editPhaseLabel={editPhaseLabel} />}
        {tab === 'schedule' && <ScheduleTab project={project} profile={profile} calYear={calYear} calMonth={calMonth} setCalYear={setCalYear} setCalMonth={setCalMonth} schedModal={schedModal} setSchedModal={setSchedModal} resetSchedule={resetSchedule} saveSchedPhase={saveSchedPhase} />}
        {tab === 'financials' && <FinancialsTab project={project} profile={profile} toggleDraw={toggleDraw} editDrawLabel={editDrawLabel} editDrawPct={editDrawPct} saveContractValue={saveContractValue} totalCollected={totalCollected} />}
        {tab === 'notes' && <NotesTab notes={notes} profile={profile} noteText={noteText} setNoteText={setNoteText} submitNote={submitNote} deleteNote={async (id) => { await deleteNote(id); loadNotes() }} />}
        {tab === 'subs' && <SubsTab project={project} profile={profile} addSub={addSub} removeSub={removeSub} />}
        {tab === 'team' && <TeamTab projectId={projectId} profile={profile} members={members} allProfiles={allProfiles} onAdd={async (uid) => { await addProjectMember(projectId,uid); loadMembers() }} onRemove={async (uid) => { await removeProjectMember(projectId,uid); loadMembers() }} />}
      </div>
    </div>
  )
}
 
// ── CHECKLIST TAB ────────────────────────────────
function ChecklistTab({ project, profile, expanded, setExpanded, phaseDone, phaseCount, phaseLocked, toggleTask, editTaskText, editTaskOwner, editPhaseLabel }) {
  return (
    <div>
      {project.phases.map((phase, pid) => {
        const locked = phaseLocked(pid)
        const done = phaseDone(pid)
        const cnt = phaseCount(pid)
        const tot = phase.tasks.length
        const key = `${project.id}-${pid}`
        const isOpen = !locked && (expanded[key] !== false)
        return (
          <PhaseBlock key={pid} phase={phase} pid={pid} locked={locked} done={done} cnt={cnt} tot={tot} isOpen={isOpen}
            project={project} profile={profile}
            onToggle={() => { if (!locked) setExpanded(e => ({ ...e, [key]: e[key]===false ? true : false })) }}
            onToggleTask={toggleTask} onEditText={editTaskText} onEditOwner={editTaskOwner} onEditLabel={editPhaseLabel} />
        )
      })}
    </div>
  )
}
 
function PhaseBlock({ phase, pid, locked, done, cnt, tot, isOpen, project, profile, onToggle, onToggleTask, onEditText, onEditOwner, onEditLabel }) {
  const [editingLabel, setEditingLabel] = useState(false)
  const [labelVal, setLabelVal] = useState(phase.label)
  const canEdit = CAN.editChecklist(profile?.role)
 
  const saveLabel = () => { setEditingLabel(false); if (labelVal.trim()) onEditLabel(pid, labelVal.trim()) }
 
  return (
    <div style={{ background:'var(--white)', border:'1px solid var(--rule)', borderRadius:'var(--r)', marginBottom:10, overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'var(--white)', userSelect:'none' }}>
        <div style={{ width:22, height:22, borderRadius:'50%', background: done?'var(--green)':'var(--cream)', border:`1px solid ${done?'var(--green)':'var(--rule)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color: done?'#fff':'var(--ink-mid)', flexShrink:0 }}>
          {done ? '✓' : pid+1}
        </div>
        {editingLabel && canEdit
          ? <input value={labelVal} onChange={e => setLabelVal(e.target.value)} onBlur={saveLabel} onKeyDown={e => { if(e.key==='Enter') saveLabel(); if(e.key==='Escape') { setEditingLabel(false); setLabelVal(phase.label) }}} autoFocus style={{ flex:1, fontSize:13, fontWeight:500, border:'1px solid var(--green)', borderRadius:'var(--rs)', padding:'2px 8px', fontFamily:'inherit', outline:'none' }} />
          : <span style={{ flex:1, fontSize:13, fontWeight:500, cursor: locked?'default':'pointer' }} onClick={!locked ? onToggle : undefined}
              onDoubleClick={() => canEdit && !locked && setEditingLabel(true)} title={canEdit ? "Double-click to edit" : ""}>{phase.label}</span>
        }
        {canEdit && !locked && !editingLabel && <button onClick={() => setEditingLabel(true)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ink-light)', fontSize:11, padding:'2px 4px', borderRadius:4, opacity:0 }} className="phase-edit-hover">✏</button>}
        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99, fontWeight:500, flexShrink:0, background: locked?'var(--rule)':done?'var(--green-light)':'var(--amber-light)', color: locked?'var(--ink-light)':done?'var(--green-dark)':'var(--amber-dark)' }}>
          {locked ? 'Locked' : done ? 'Complete' : `${cnt}/${tot}`}
        </span>
        <span onClick={!locked ? onToggle : undefined} style={{ fontSize:12, color:'var(--ink-light)', cursor: locked?'default':'pointer', transform: isOpen?'rotate(180deg)':'none', display:'inline-block', transition:'transform 0.2s' }}>▾</span>
      </div>
      {(isOpen || locked) && (
        <div style={{ borderTop:'1px solid var(--rule)' }}>
          {locked
            ? <div style={{ fontSize:12, color:'var(--ink-light)', fontStyle:'italic', padding:'10px 16px' }}>Complete the previous phase to unlock.</div>
            : phase.tasks.map((t, i) => (
              <TaskRow key={i} task={t} pid={pid} idx={i} project={project} profile={profile} checked={!!(project.task_state?.[`${pid}-${i}`])} onToggle={toggleTask => onToggleTask(pid,i,!project.task_state?.[`${pid}-${i}`])} onEditText={v => onEditText(pid,i,v)} onEditOwner={v => onEditOwner(pid,i,v)} />
            ))
          }
        </div>
      )}
    </div>
  )
}
 
function TaskRow({ task, pid, idx, project, profile, checked, onToggle, onEditText, onEditOwner }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(task.text)
  const canEdit = CAN.editChecklist(profile?.role)
  const save = () => { setEditing(false); if (val.trim()) onEditText(val.trim()) }
  const opts = OWNERS.map(o => <option key={o} value={o}>{o}</option>)
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'9px 16px', borderBottom:'1px solid var(--rule)' }}>
      <input type="checkbox" checked={checked} onChange={onToggle} style={{ width:15, height:15, marginTop:3, flexShrink:0, accentColor:'var(--green)', cursor:'pointer' }} />
      <div style={{ flex:1 }}>
        {editing && canEdit
          ? <input value={val} onChange={e => setVal(e.target.value)} onBlur={save} onKeyDown={e => { if(e.key==='Enter') save(); if(e.key==='Escape'){setEditing(false);setVal(task.text)} }} autoFocus style={{ fontSize:13, border:'1px solid var(--green)', borderRadius:'var(--rs)', padding:'3px 8px', width:'100%', fontFamily:'inherit', outline:'none' }} />
          : <div style={{ fontSize:13, color:'var(--ink)', textDecoration: checked?'line-through':'none', color: checked?'var(--ink-light)':'var(--ink)' }}>{task.text}</div>
        }
        <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginTop:2 }}>
          {canEdit
            ? <select value={task.owner} onChange={e => onEditOwner(e.target.value)} style={{ fontSize:11, background:'var(--cream)', border:'1px solid var(--rule)', borderRadius:99, padding:'1px 6px', cursor:'pointer', fontFamily:'inherit', outline:'none' }}>{opts}</select>
            : <span style={{ fontSize:11, color:'var(--ink-light)' }}>{task.owner}</span>
          }
          {(task.tags||[]).map(tg => (
            <span key={tg} className={`tag tag-${tg}`}>{tg==='draw'?'Draw':tg==='lien'?'Lien':'Inspection'}</span>
          ))}
        </div>
      </div>
      {canEdit && !editing && <button onClick={() => setEditing(true)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ink-light)', fontSize:11, padding:'2px 4px', borderRadius:4, opacity:0, transition:'opacity 0.15s' }} onMouseEnter={e=>e.target.style.opacity=1} onMouseLeave={e=>e.target.style.opacity=0}>✏</button>}
    </div>
  )
}
 
// ── SCHEDULE TAB ─────────────────────────────────
function ScheduleTab({ project, profile, calYear, calMonth, setCalYear, setCalMonth, schedModal, setSchedModal, resetSchedule, saveSchedPhase }) {
  const fmt = d => d.toISOString().slice(0,10)
  const fmtDisp = str => { if(!str) return '—'; const d = new Date(str+'T00:00:00'); return d.toLocaleDateString('en-US',{month:'short',day:'numeric'}) }
  const today = fmt(new Date())
  const firstDay = new Date(calYear, calMonth, 1)
  const lastDay = new Date(calYear, calMonth+1, 0)
  const startDow = firstDay.getDay()
  const totalCells = Math.ceil((startDow + lastDay.getDate())/7)*7
  const sched = project.schedule || []
  const phases = project.phases || []
  const canEdit = CAN.editSchedule(profile?.role)
 
  const cells = []
  for (let c = 0; c < totalCells; c++) {
    const d = new Date(calYear, calMonth, 1 + c - startDow)
    const ds = fmt(d)
    const isOther = d.getMonth() !== calMonth
    const isTod = ds === today
    const chips = []
    sched.forEach((s,pid) => {
      if (!s?.start || !s?.end) return
      const ph = phases[pid]; if (!ph) return
      if (ds >= s.start && ds <= s.end) {
        chips.push(<div key={pid} onClick={() => canEdit && setSchedModal(pid)}
          style={{ fontSize:10, fontWeight:600, padding:'2px 5px', borderRadius:4, marginBottom:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', cursor: canEdit?'pointer':'default', background:ph.bg, color:ph.color, borderLeft: ds===s.start ? `3px solid ${ph.color}` : 'none', display:'block' }}
          title={`${ph.label}: ${fmtDisp(s.start)} → ${fmtDisp(s.end)}`}>
          {ds === s.start ? ph.label : ''}
        </div>)
      }
    })
    cells.push(
      <div key={c} style={{ minHeight:88, borderRight:'1px solid var(--rule)', borderBottom:'1px solid var(--rule)', padding:4, background: isOther?'rgba(0,0,0,0.015)':'transparent' }}>
        <span style={{ fontSize:11, fontWeight:600, color: isTod?'#fff':isOther?'var(--rule)':'var(--ink-light)', background: isTod?'var(--green)':'transparent', width:isTod?20:undefined, height:isTod?20:undefined, borderRadius:isTod?'50%':undefined, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, marginBottom:2 }}>{d.getDate()}</span>
        {chips}
      </div>
    )
  }
 
  const [smStart, setSmStart] = useState('')
  const [smEnd, setSmEnd] = useState('')
  useEffect(() => {
    if (schedModal !== null) {
      const s = sched[schedModal] || {}
      setSmStart(s.start||''); setSmEnd(s.end||'')
    }
  }, [schedModal])
 
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <button className="btn-ghost" onClick={() => { let m=calMonth-1,y=calYear; if(m<0){m=11;y--}; setCalMonth(m);setCalYear(y) }}>‹</button>
          <span style={{ fontSize:15, fontWeight:600, minWidth:150, textAlign:'center' }}>{MONTHS[calMonth]} {calYear}</span>
          <button className="btn-ghost" onClick={() => { let m=calMonth+1,y=calYear; if(m>11){m=0;y++}; setCalMonth(m);setCalYear(y) }}>›</button>
        </div>
        {canEdit && (
          <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center' }}>
            <label style={{ fontSize:12, color:'var(--ink-mid)', whiteSpace:'nowrap' }}>Project start:</label>
            <input type="date" value={project.start_date||''} onChange={e => resetSchedule(e.target.value)} style={{ border:'1px solid var(--rule)', borderRadius:'var(--rs)', padding:'5px 8px', fontSize:12, fontFamily:'inherit', outline:'none', background:'var(--cream)' }} />
          </div>
        )}
      </div>
      <div style={{ background:'var(--white)', border:'1px solid var(--rule)', borderRadius:'var(--r)', overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'1px solid var(--rule)' }}>
          {DAYS.map(d => <div key={d} style={{ padding:'8px 4px', textAlign:'center', fontSize:11, fontWeight:700, letterSpacing:'0.05em', color:'var(--ink-light)', textTransform:'uppercase' }}>{d}</div>)}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>{cells}</div>
      </div>
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginTop:12 }}>
        {phases.map((p,i) => {
          const s = sched[i]
          return <div key={i} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--ink-mid)' }}>
            <div style={{ width:10, height:10, borderRadius:3, background:p.color, flexShrink:0 }} />
            <span>{p.label} {s?.start ? `(${fmtDisp(s.start)} → ${fmtDisp(s.end)})` : '(not set)'}</span>
          </div>
        })}
      </div>
      {canEdit && <p style={{ fontSize:11, color:'var(--ink-light)', marginTop:10 }}>Click any phase bar to adjust dates manually.</p>}
 
      {schedModal !== null && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:400, padding:20 }} onClick={e => { if(e.target===e.currentTarget) setSchedModal(null) }}>
          <div style={{ background:'#fff', borderRadius:'var(--r)', padding:24, width:'100%', maxWidth:400, boxShadow:'0 8px 32px rgba(0,0,0,0.18)' }}>
            <h2 style={{ fontSize:16, fontWeight:600, marginBottom:4 }}>Edit phase dates</h2>
            <p style={{ fontSize:12, color:'var(--ink-mid)', marginBottom:16 }}>{phases[schedModal]?.label}</p>
            <div style={{ marginBottom:12 }}><label className="field-label">Start date</label><input className="field-input" type="date" value={smStart} onChange={e => setSmStart(e.target.value)} /></div>
            <div style={{ marginBottom:16 }}><label className="field-label">End date</label><input className="field-input" type="date" value={smEnd} onChange={e => setSmEnd(e.target.value)} /></div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn-ghost" onClick={() => setSchedModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={() => saveSchedPhase(schedModal, smStart, smEnd)}>Save dates</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
 
// ── FINANCIALS TAB ───────────────────────────────
function FinancialsTab({ project, profile, toggleDraw, editDrawLabel, editDrawPct, saveContractValue, totalCollected }) {
  const [cvInput, setCvInput] = useState(project.contract_value||'')
  const v = project.contract_value||0
  const tc = totalCollected()
  const canEdit = CAN.editFinancials(profile?.role)
 
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <div className="card">
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', color:'var(--ink-light)', marginBottom:12 }}>Contract summary</div>
          {[['Contract value', `$${v.toLocaleString()}`, 'var(--ink)'],['Collected to date', `$${Math.round(tc).toLocaleString()}`, 'var(--green)'],['Remaining', `$${Math.round(v-tc).toLocaleString()}`, 'var(--amber)']].map(([l,val,c]) => (
            <div key={l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid var(--rule)', fontSize:13 }}>
              <span style={{ color:'var(--ink-mid)' }}>{l}</span><span style={{ fontWeight:600, color:c }}>{val}</span>
            </div>
          ))}
          <div style={{ marginTop:12 }}>
            <div style={{ height:8, background:'var(--rule)', borderRadius:99, overflow:'hidden', marginBottom:4 }}><div style={{ height:8, background:'var(--green)', borderRadius:99, width:`${v?Math.round(tc/v*100):0}%` }} /></div>
            <div style={{ fontSize:11, color:'var(--ink-light)' }}>{v?Math.round(tc/v*100):0}% of contract collected</div>
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', color:'var(--ink-light)', marginBottom:12 }}>Draw schedule {canEdit && <span style={{ fontWeight:400, textTransform:'none', fontSize:11, letterSpacing:0 }}>— click ✏ to edit</span>}</div>
          {(project.draws||[]).map((d,i) => {
            const isDone = (project.draws_collected||[]).includes(i)
            const amt = v*(d.pct/100)
            return <DrawRow key={i} draw={d} idx={i} isDone={isDone} amt={amt} canEdit={canEdit} onToggle={() => toggleDraw(i)} onEditLabel={v => editDrawLabel(i,v)} onEditPct={v => editDrawPct(i,v)} />
          })}
        </div>
      </div>
      {canEdit && (
        <div className="card">
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', color:'var(--ink-light)', marginBottom:10 }}>Update contract value</div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <input type="number" value={cvInput} onChange={e => setCvInput(e.target.value)} placeholder="Enter contract value" style={{ border:'1px solid var(--rule)', borderRadius:'var(--rs)', padding:'7px 10px', fontSize:13, fontFamily:'inherit', outline:'none', background:'var(--cream)', width:200 }} />
            <button className="btn-primary" onClick={() => saveContractValue(parseFloat(cvInput)||0)}>Save</button>
          </div>
        </div>
      )}
    </div>
  )
}
 
function DrawRow({ draw, idx, isDone, amt, canEdit, onToggle, onEditLabel, onEditPct }) {
  const [editingLabel, setEditingLabel] = useState(false)
  const [editingPct, setEditingPct] = useState(false)
  const [lv, setLv] = useState(draw.label)
  const [pv, setPv] = useState(draw.pct)
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--rule)' }}>
      <div onClick={canEdit ? onToggle : undefined} style={{ width:18, height:18, borderRadius:'50%', border:`2px solid ${isDone?'var(--green)':'var(--rule)'}`, background: isDone?'var(--green)':'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, flexShrink:0, cursor: canEdit?'pointer':'default', color:'#fff', transition:'all 0.15s' }}>{isDone?'✓':''}</div>
      {editingLabel && canEdit
        ? <input value={lv} onChange={e => setLv(e.target.value)} onBlur={() => { setEditingLabel(false); onEditLabel(lv) }} onKeyDown={e => { if(e.key==='Enter'||e.key==='Escape'){setEditingLabel(false);onEditLabel(lv)} }} autoFocus style={{ flex:1, fontSize:13, border:'1px solid var(--green)', borderRadius:'var(--rs)', padding:'2px 7px', fontFamily:'inherit', outline:'none' }} />
        : <span style={{ flex:1, fontSize:13, color:'var(--ink-mid)', cursor: canEdit?'pointer':'default' }} onDoubleClick={() => canEdit && setEditingLabel(true)} title={canEdit?"Double-click to edit":""}>{draw.label}</span>
      }
      {editingPct && canEdit
        ? <input type="number" value={pv} onChange={e => setPv(e.target.value)} onBlur={() => { setEditingPct(false); onEditPct(pv) }} onKeyDown={e => { if(e.key==='Enter'||e.key==='Escape'){setEditingPct(false);onEditPct(pv)} }} autoFocus style={{ width:52, fontSize:12, border:'1px solid var(--green)', borderRadius:'var(--rs)', padding:'2px 6px', fontFamily:'inherit', outline:'none', textAlign:'center' }} />
        : <span style={{ fontWeight:600, fontSize:13, minWidth:36, textAlign:'right', cursor: canEdit?'pointer':'default' }} onDoubleClick={() => canEdit && setEditingPct(true)} title={canEdit?"Double-click to edit %":""}>{draw.pct}%</span>
      }
      <span style={{ fontSize:12, color:'var(--ink-light)', minWidth:80, textAlign:'right' }}>{amt?`$${Math.round(amt).toLocaleString()}`:'—'}</span>
      {canEdit && <button onClick={() => setEditingLabel(true)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ink-light)', fontSize:11, padding:'2px 4px' }}>✏</button>}
    </div>
  )
}
 
// ── NOTES TAB ────────────────────────────────────
function NotesTab({ notes, profile, noteText, setNoteText, submitNote, deleteNote }) {
  const roleColors = { owner:'#1D9E75', admin:'#185FA5', pm:'#534AB7', employee:'#C97A18', sub:'#B83232' }
  const fmtDate = str => new Date(str).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})
  return (
    <div>
      <form onSubmit={submitNote} style={{ marginBottom:20 }}>
        <label className="field-label" style={{ marginBottom:6, display:'block' }}>Add a note</label>
        <div style={{ display:'flex', gap:8 }}>
          <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Type your note here — visible to all team members on this project…" rows={3} style={{ flex:1, border:'1px solid var(--rule)', borderRadius:'var(--rs)', padding:'8px 10px', fontSize:13, fontFamily:'inherit', outline:'none', resize:'vertical', background:'var(--cream)' }} onFocus={e => e.target.style.borderColor='var(--green)'} onBlur={e => e.target.style.borderColor='var(--rule)'} />
          <button type="submit" className="btn-primary" style={{ alignSelf:'flex-end' }}>Post</button>
        </div>
      </form>
      {!notes.length
        ? <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--ink-light)' }}>No notes yet. Add the first one above.</div>
        : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {notes.map(n => (
            <div key={n.id} className="card" style={{ padding:'14px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background: roleColors[n.profiles?.role]||'#ccc', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff' }}>
                    {(n.profiles?.full_name||'?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500 }}>{n.profiles?.full_name||'Unknown'}</div>
                    <div style={{ fontSize:11, color:'var(--ink-light)', textTransform:'capitalize' }}>{n.profiles?.role} · {fmtDate(n.created_at)}</div>
                  </div>
                </div>
                {(profile?.id === n.user_id || profile?.role === 'owner') && (
                  <button className="btn-ghost btn-danger" style={{ fontSize:11, padding:'3px 8px' }} onClick={() => deleteNote(n.id)}>Delete</button>
                )}
              </div>
              <div style={{ fontSize:13, color:'var(--ink)', lineHeight:1.6, whiteSpace:'pre-wrap' }}>{n.content}</div>
            </div>
          ))}
        </div>
      }
    </div>
  )
}
 
// ── SUBS TAB ─────────────────────────────────────
function SubsTab({ project, profile, addSub, removeSub }) {
  const [form, setForm] = useState({ name:'', trade:'', phone:'' })
  const canManage = CAN.manageSubs(profile?.role)
  const subs = project.subs || []
  const initials = name => name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
  return (
    <div>
      <div style={{ background:'var(--white)', border:'1px solid var(--rule)', borderRadius:'var(--r)', overflow:'hidden', marginBottom:16 }}>
        {!subs.length
          ? <div style={{ padding:'20px 16px', fontSize:12, color:'var(--ink-light)', fontStyle:'italic' }}>No subcontractors added yet.</div>
          : subs.map((s,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', borderBottom:'1px solid var(--rule)' }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--blue-light)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'var(--blue)', flexShrink:0 }}>{initials(s.name)}</div>
              <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:500 }}>{s.name}</div><div style={{ fontSize:11, color:'var(--ink-light)' }}>{s.trade}</div></div>
              <div style={{ fontSize:12, color:'var(--ink-mid)' }}>{s.phone}</div>
              {canManage && <button className="btn-ghost btn-danger" style={{ fontSize:11 }} onClick={() => removeSub(i)}>✕ Remove</button>}
            </div>
          ))
        }
      </div>
      {canManage && (
        <div className="card">
          <div style={{ fontSize:11, fontWeight:700, color:'var(--ink-mid)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>Add subcontractor</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:8, alignItems:'end' }}>
            {[['name','Name / Company','e.g. Jones Electric'],['trade','Trade','e.g. Electrical'],['phone','Phone','(727) 555-1234']].map(([k,l,p]) => (
              <div key={k}><label className="field-label">{l}</label><input className="field-input" placeholder={p} value={form[k]} onChange={e => setForm(f=>({...f,[k]:e.target.value}))} /></div>
            ))}
            <button className="btn-primary" style={{ height:34 }} onClick={() => { if(!form.name.trim()) return; addSub({name:form.name.trim(),trade:form.trade.trim(),phone:form.phone.trim()}); setForm({name:'',trade:'',phone:''}) }}>Add</button>
          </div>
        </div>
      )}
    </div>
  )
}
 
// ── TEAM TAB ─────────────────────────────────────
function TeamTab({ projectId, profile, members, allProfiles, onAdd, onRemove }) {
  const memberIds = members.map(m => m.user_id)
  const available = allProfiles.filter(p => !memberIds.includes(p.id))
  const roleColors = { owner:'#1D9E75', admin:'#185FA5', pm:'#534AB7', employee:'#C97A18', sub:'#B83232' }
  const canManage = CAN.manageSubs(profile?.role)
  return (
    <div>
      <div style={{ fontSize:13, fontWeight:600, marginBottom:12 }}>Team members on this project</div>
      <div style={{ background:'var(--white)', border:'1px solid var(--rule)', borderRadius:'var(--r)', overflow:'hidden', marginBottom:20 }}>
        {!members.length
          ? <div style={{ padding:'20px 16px', fontSize:12, color:'var(--ink-light)', fontStyle:'italic' }}>No team members assigned yet. Owner, Admin, and PM see all projects automatically.</div>
          : members.map(m => (
            <div key={m.user_id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', borderBottom:'1px solid var(--rule)' }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background: roleColors[m.profiles?.role]||'#ccc', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff', flexShrink:0 }}>
                {(m.profiles?.full_name||'?')[0].toUpperCase()}
              </div>
              <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:500 }}>{m.profiles?.full_name}</div><div style={{ fontSize:11, color:'var(--ink-light)', textTransform:'capitalize' }}>{ROLE_LABELS[m.profiles?.role]}</div></div>
              <div style={{ fontSize:12, color:'var(--ink-light)' }}>{m.profiles?.email}</div>
              {canManage && <button className="btn-ghost btn-danger" style={{ fontSize:11 }} onClick={() => onRemove(m.user_id)}>Remove</button>}
            </div>
          ))
        }
      </div>
      {canManage && available.length > 0 && (
        <div>
          <div style={{ fontSize:13, fontWeight:600, marginBottom:12 }}>Add team member</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:10 }}>
            {available.map(p => (
              <div key={p.id} className="card" style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background: roleColors[p.role]||'#ccc', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff', flexShrink:0 }}>
                  {(p.full_name||'?')[0].toUpperCase()}
                </div>
                <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:500 }}>{p.full_name}</div><div style={{ fontSize:11, color:'var(--ink-light)', textTransform:'capitalize' }}>{ROLE_LABELS[p.role]}</div></div>
                <button className="btn-primary" style={{ fontSize:11, padding:'4px 10px' }} onClick={() => onAdd(p.id)}>Add</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
