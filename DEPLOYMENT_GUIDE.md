# LanCo Project Tracker — Deployment Guide
## From zero to live in about 30 minutes

---

## What you're setting up
- **Supabase** — free database + authentication (handles logins, user accounts, real-time sync)
- **Netlify** — free hosting (you already use this for Dr. Detail 727)
- **Your app** — the React code in this folder

---

## STEP 1 — Set up Supabase (10 min)

1. Go to **https://supabase.com** and sign up for a free account
2. Click **"New project"**
   - Name it: `lanco-tracker`
   - Set a database password (save this somewhere)
   - Region: **US East (N. Virginia)** — closest to St. Pete
3. Wait ~2 minutes for it to provision
4. In the left sidebar, click **SQL Editor**
5. Click **"New query"**
6. Open the file `supabase_setup.sql` from this folder
7. Copy the entire contents and paste into the SQL editor
8. Click **"Run"** — you should see "Success" messages
9. Go to **Project Settings → API**
   - Copy your **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - Copy your **anon public key** (long string starting with `eyJ...`)

---

## STEP 2 — Create your owner account (5 min)

1. In Supabase, go to **Authentication → Users**
2. Click **"Invite user"** (or "Add user")
3. Enter your email and a password — this becomes your owner login
4. Go back to **SQL Editor** and run this (replace with YOUR email):
   ```sql
   UPDATE public.profiles 
   SET role = 'owner', full_name = 'David' 
   WHERE email = 'your@email.com';
   ```
5. That's it — you're now the owner with full access

---

## STEP 3 — Configure the app (2 min)

1. In this folder, find the file `.env.example`
2. Create a new file called `.env` (same folder) with this content:
   ```
   REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
   ```
3. Replace the values with what you copied from Supabase Step 1

---

## STEP 4 — Deploy to Netlify (10 min)

### Option A — Deploy via GitHub (recommended, enables auto-updates)

1. Create a free account at **https://github.com** if you don't have one
2. Create a new repository called `lanco-tracker` (set to Private)
3. Upload all files from this folder to that repository
4. Go to **https://netlify.com** (log in with your existing account)
5. Click **"Add new site" → "Import an existing project"**
6. Connect GitHub and select your `lanco-tracker` repo
7. Build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `build`
8. Click **"Add environment variables"** and add:
   - `REACT_APP_SUPABASE_URL` = your Supabase URL
   - `REACT_APP_SUPABASE_ANON_KEY` = your anon key
9. Click **"Deploy site"** — takes 2-3 minutes
10. Netlify gives you a URL like `https://random-name.netlify.app`
    - You can rename it to something like `lanco-tracker.netlify.app` in Site Settings

### Option B — Deploy via drag-and-drop

1. On your computer, open a terminal in this folder and run:
   ```
   npm install
   npm run build
   ```
2. This creates a `build` folder
3. Go to Netlify, click **"Add new site" → "Deploy manually"**
4. Drag the `build` folder onto the Netlify upload area
5. Done — but you'll need to re-upload manually each time you make changes

---

## STEP 5 — Set up your custom domain (optional, 5 min)

If you want `tracker.lanco-construction.com` instead of a Netlify URL:
1. In Netlify → Site Settings → Domain Management
2. Click "Add custom domain"
3. Follow the DNS instructions (add a CNAME record at your domain registrar)

---

## STEP 6 — Invite your team

Once the app is live:
1. Log in as David (owner)
2. Click **"Manage users"** in the top bar
3. Click **"+ Invite user"**
4. Enter their name, email, and role
5. They'll receive an email with a link to set their password
6. Employees and Subs won't see any projects until you assign them from the **Team** tab inside each project

---

## Role quick reference

| Role | Can do |
|------|--------|
| **Owner (David)** | Everything — all projects, financials, users, delete |
| **Admin** | All projects, financials, checklist, schedule, subs |
| **Project Manager** | All projects, checklist, schedule, subs — no financials |
| **Employee** | Assigned projects only — tasks, notes |
| **Sub** | Assigned projects only — tasks, notes |

---

## Troubleshooting

**"Cannot read properties of undefined"** on login
→ Check your `.env` file has the correct Supabase URL and key

**Invited user gets error when setting password**
→ In Supabase → Authentication → URL Configuration, make sure Site URL matches your Netlify URL

**Changes not syncing in real time**
→ Check that you ran the `alter publication supabase_realtime` lines in the SQL setup

**Need help?** Bring this guide back to Claude and describe what you're seeing — I can walk you through it step by step.

---

## Costs

| Service | Free tier | When you'd pay |
|---------|-----------|----------------|
| Supabase | 500MB database, 50,000 monthly active users | If you exceed (very unlikely) |
| Netlify | 100GB bandwidth, 300 build minutes/month | If you exceed (very unlikely) |

**For LanCo's usage, this will almost certainly remain free.**
