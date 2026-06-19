import { supabase } from './supabase'

// ── AUTH ─────────────────────────────────────────
export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signOut = () => supabase.auth.signOut()

export const getSession = () => supabase.auth.getSession()

export const onAuthChange = (cb) =>
  supabase.auth.onAuthStateChange(cb)

// ── USER PROFILE ─────────────────────────────────
export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return { data, error }
}

export const getAllProfiles = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name')
  return { data, error }
}

export const updateProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  return { data, error }
}

export const inviteUser = async (email, role, fullName) => {
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { role, full_name: fullName }
  })
  return { data, error }
}

// ── PROJECTS ─────────────────────────────────────
export const getProjects = async (userId, role) => {
  if (['owner','admin','pm'].includes(role)) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    return { data, error }
  } else {
    // employees and subs only see assigned projects
    const { data, error } = await supabase
      .from('project_members')
      .select('project_id, projects(*)')
      .eq('user_id', userId)
    const projects = data?.map(pm => pm.projects) || []
    return { data: projects, error }
  }
}

export const getProject = async (projectId) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()
  return { data, error }
}

export const createProject = async (project) => {
  const { data, error } = await supabase
    .from('projects')
    .insert(project)
    .select()
    .single()
  return { data, error }
}

export const updateProject = async (projectId, updates) => {
  const { data, error } = await supabase
    .from('projects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .select()
    .single()
  return { data, error }
}

export const deleteProject = async (projectId) => {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
  return { error }
}

// ── NOTES ────────────────────────────────────────
export const getNotes = async (projectId) => {
  const { data, error } = await supabase
    .from('notes')
    .select('*, profiles(full_name, role)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  return { data, error }
}

export const addNote = async (projectId, userId, content) => {
  const { data, error } = await supabase
    .from('notes')
    .insert({ project_id: projectId, user_id: userId, content })
    .select('*, profiles(full_name, role)')
    .single()
  return { data, error }
}

export const deleteNote = async (noteId) => {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', noteId)
  return { error }
}

// ── PROJECT MEMBERS ───────────────────────────────
export const getProjectMembers = async (projectId) => {
  const { data, error } = await supabase
    .from('project_members')
    .select('*, profiles(full_name, role, email)')
    .eq('project_id', projectId)
  return { data, error }
}

export const addProjectMember = async (projectId, userId) => {
  const { data, error } = await supabase
    .from('project_members')
    .insert({ project_id: projectId, user_id: userId })
    .select()
  return { data, error }
}

export const removeProjectMember = async (projectId, userId) => {
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId)
  return { error }
}

// ── REALTIME ─────────────────────────────────────
export const subscribeToProject = (projectId, callback) => {
  return supabase
    .channel(`project-${projectId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'projects',
      filter: `id=eq.${projectId}`,
    }, callback)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'notes',
      filter: `project_id=eq.${projectId}`,
    }, callback)
    .subscribe()
}

export const unsubscribe = (channel) => supabase.removeChannel(channel)
