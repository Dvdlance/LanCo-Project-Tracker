-- ═══════════════════════════════════════════════════
-- LanCo Project Tracker — Supabase Database Setup
-- Run this entire file in your Supabase SQL editor
-- ═══════════════════════════════════════════════════

-- 1. PROFILES (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  role text default 'employee' check (role in ('owner','admin','pm','employee','sub')),
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

-- Profiles are readable by all authenticated users
create policy "profiles_read" on public.profiles
  for select using (auth.role() = 'authenticated');

-- Users can update their own profile; owner can update all
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "profiles_owner_update_all" on public.profiles
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
  );

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'role', 'employee')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2. PROJECTS
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  client text not null,
  job_number text,
  description text default 'Residential renovation',
  contract_value numeric default 0,
  start_date date,
  phases jsonb default '[]'::jsonb,
  draws jsonb default '[]'::jsonb,
  schedule jsonb default '[]'::jsonb,
  task_state jsonb default '{}'::jsonb,
  draws_collected jsonb default '[]'::jsonb,
  subs jsonb default '[]'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.projects enable row level security;

-- Owner, admin, pm can see all projects
create policy "projects_read_all" on public.projects
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('owner','admin','pm'))
  );

-- Employees and subs see only assigned projects
create policy "projects_read_assigned" on public.projects
  for select using (
    exists (
      select 1 from public.project_members
      where project_id = projects.id and user_id = auth.uid()
    )
  );

-- Owner and admin can create
create policy "projects_insert" on public.projects
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('owner','admin'))
  );

-- Owner, admin, pm, and assigned employees can update
create policy "projects_update" on public.projects
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('owner','admin','pm'))
    or
    exists (select 1 from public.project_members where project_id = projects.id and user_id = auth.uid())
  );

-- Only owner can delete
create policy "projects_delete" on public.projects
  for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
  );


-- 3. PROJECT MEMBERS (for assigning employees/subs to specific projects)
create table public.project_members (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(project_id, user_id)
);
alter table public.project_members enable row level security;

create policy "members_read" on public.project_members
  for select using (auth.role() = 'authenticated');

create policy "members_manage" on public.project_members
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('owner','admin','pm'))
  );


-- 4. NOTES
create table public.notes (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);
alter table public.notes enable row level security;

-- Anyone on the project can read notes
create policy "notes_read" on public.notes
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('owner','admin','pm'))
    or
    exists (select 1 from public.project_members where project_id = notes.project_id and user_id = auth.uid())
  );

-- Anyone authenticated can add notes
create policy "notes_insert" on public.notes
  for insert with check (auth.uid() = user_id);

-- Author or owner can delete
create policy "notes_delete" on public.notes
  for delete using (
    auth.uid() = user_id
    or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
  );


-- 5. ENABLE REALTIME on projects and notes tables
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.notes;
alter publication supabase_realtime add table public.project_members;


-- 6. CREATE YOUR OWNER ACCOUNT
-- After running this SQL, go to Authentication > Users in Supabase dashboard
-- and create your account manually, then run this to make yourself owner:
-- UPDATE public.profiles SET role = 'owner', full_name = 'David' WHERE email = 'your@email.com';
