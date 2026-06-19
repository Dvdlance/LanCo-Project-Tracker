export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  PM: 'pm',
  EMPLOYEE: 'employee',
  SUB: 'sub',
}

export const ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Admin',
  pm: 'Project Manager',
  employee: 'Employee',
  sub: 'Subcontractor',
}

// What each role can do
export const CAN = {
  manageUsers:    (r) => r === 'owner',
  deleteProject:  (r) => r === 'owner',
  createProject:  (r) => ['owner','admin'].includes(r),
  viewFinancials: (r) => ['owner','admin'].includes(r),
  editFinancials: (r) => ['owner','admin'].includes(r),
  editChecklist:  (r) => ['owner','admin','pm'].includes(r),
  viewAllProjects:(r) => ['owner','admin','pm'].includes(r),
  addNotes:       (r) => true,
  checkOffTasks:  (r) => true,
  viewSchedule:   (r) => ['owner','admin','pm'].includes(r),
  editSchedule:   (r) => ['owner','admin','pm'].includes(r),
  manageSubs:     (r) => ['owner','admin','pm'].includes(r),
}

export const DEFAULT_PHASES = [
  { label:"Contract execution & setup", days:3, color:"#534AB7", bg:"#EEEDFE", tasks:[
    {text:"File executed contract in project folder (physical + digital)", owner:"Admin"},
    {text:"Create project name and create project in QuickBooks", owner:"Admin"},
    {text:"Enter project into job tracking system", owner:"Admin"},
    {text:"Send client welcome email with project timeline overview", owner:"Admin"},
    {text:"Collect 10% deposit from client and log receipt", owner:"Admin", tags:["draw"]},
    {text:"Log any Notice to Owner (NTO) received — file immediately by date", owner:"Admin", tags:["lien"]},
  ]},
  { label:"NOC & permitting", days:14, color:"#185FA5", bg:"#E6F1FB", tasks:[
    {text:"Generate NOC and send to client for signature", owner:"Admin"},
    {text:"Record signed NOC with Pinellas County Clerk", owner:"David"},
    {text:"Post copy of recorded NOC at job site", owner:"David"},
    {text:"Obtain energy calculations (Manual J / compliance report if required)", owner:"David"},
    {text:"Submit permit application with plans, NOC, and energy calcs to Pinellas County", owner:"Admin"},
    {text:"Confirm permit fee payment and log permit number once issued", owner:"Admin"},
    {text:"Post permit card on site before any work begins", owner:"David"},
  ]},
  { label:"Sub & vendor coordination", days:7, color:"#C97A18", bg:"#FEF3E2", tasks:[
    {text:"Issue signed scope of work to all relevant subcontractors", owner:"David"},
    {text:"Collect signed sub agreements and certificates of insurance (COIs)", owner:"Admin"},
    {text:"Log all NTOs received from subs and suppliers — file by date received", owner:"Admin", tags:["lien"]},
    {text:"Confirm material lead times and place orders for long-lead items", owner:"David"},
    {text:"Build master schedule with sub sequencing and share with team", owner:"David"},
  ]},
  { label:"Demo (20% draw)", days:5, color:"#B83232", bg:"#FCEBEB", tasks:[
    {text:"Conduct pre-construction site walk with client", owner:"David"},
    {text:"Complete demolition scope per plans", owner:"David"},
    {text:"Collect conditional lien waivers from all subs and suppliers active to date", owner:"Admin", tags:["lien"]},
    {text:"Invoice client for 20% draw — demo complete", owner:"Admin", tags:["draw"]},
    {text:"Confirm draw payment received before proceeding to framing", owner:"Admin", tags:["draw"]},
  ]},
  { label:"Framing (20% draw)", days:10, color:"#3D4A5C", bg:"#EDF0F4", tasks:[
    {text:"Complete framing scope per approved plans", owner:"David"},
    {text:"Schedule and pass Pinellas County framing inspection", owner:"David", tags:["insp"]},
    {text:"Collect conditional lien waivers from framing sub and any new suppliers", owner:"Admin", tags:["lien"]},
    {text:"Invoice client for 20% draw — framing complete", owner:"Admin", tags:["draw"]},
    {text:"Confirm draw payment received before proceeding to rough-ins", owner:"Admin", tags:["draw"]},
  ]},
  { label:"Rough-in MEP & insulation", days:12, color:"#0F6E56", bg:"#E1F5EE", tasks:[
    {text:"Complete rough-in electrical, plumbing, and HVAC", owner:"David"},
    {text:"Schedule and pass Pinellas County rough-in electrical inspection", owner:"David", tags:["insp"]},
    {text:"Schedule and pass Pinellas County rough-in plumbing inspection", owner:"David", tags:["insp"]},
    {text:"Schedule and pass Pinellas County rough-in mechanical (HVAC) inspection", owner:"David", tags:["insp"]},
    {text:"Install insulation and schedule insulation inspection if required", owner:"David", tags:["insp"]},
  ]},
  { label:"Drywall (20% draw)", days:8, color:"#854F0B", bg:"#FEF3E2", tasks:[
    {text:"Complete drywall hang, tape, and finish", owner:"David"},
    {text:"Schedule and pass Pinellas County drywall inspection if required", owner:"David", tags:["insp"]},
    {text:"Collect conditional lien waivers from drywall sub and suppliers", owner:"Admin", tags:["lien"]},
    {text:"Invoice client for 20% draw — drywall complete", owner:"Admin", tags:["draw"]},
    {text:"Confirm draw payment received before proceeding to finish work", owner:"Admin", tags:["draw"]},
  ]},
  { label:"Cabinet install (20% draw)", days:7, color:"#7C3D8C", bg:"#F5ECF8", tasks:[
    {text:"Complete cabinet and millwork installation", owner:"David"},
    {text:"Collect conditional lien waivers from cabinet sub and suppliers", owner:"Admin", tags:["lien"]},
    {text:"Invoice client for 20% draw — cabinet install complete", owner:"Admin", tags:["draw"]},
    {text:"Confirm draw payment received before proceeding to finishes", owner:"Admin", tags:["draw"]},
  ]},
  { label:"Closeout & final draw", days:10, color:"#1D9E75", bg:"#E1F5EE", tasks:[
    {text:"Complete all finish work (flooring, trim, paint, fixtures, appliances)", owner:"David"},
    {text:"Schedule and pass Pinellas County final inspection", owner:"David", tags:["insp"]},
    {text:"Obtain Certificate of Completion / Occupancy from Pinellas County", owner:"David", tags:["insp"]},
    {text:"Conduct final walkthrough with client — create and complete punch list", owner:"David"},
    {text:"Collect unconditional lien waivers from all subs and suppliers", owner:"Admin", tags:["lien"]},
    {text:"Confirm lien period has run (90 days from last furnishing) or waivers fully cover", owner:"Admin", tags:["lien"]},
    {text:"Invoice client for final balance", owner:"Admin", tags:["draw"]},
    {text:"Collect final payment and confirm project financially closed", owner:"Admin", tags:["draw"]},
    {text:"Send client satisfaction follow-up and request Google review", owner:"Admin"},
    {text:"Archive complete job folder (contract, permits, inspections, waivers, draws)", owner:"Admin"},
  ]},
]

export const DEFAULT_DRAWS = [
  {label:"10% — Deposit",              pct:10},
  {label:"20% — Demo complete",        pct:20},
  {label:"20% — Framing complete",     pct:20},
  {label:"20% — Drywall complete",     pct:20},
  {label:"20% — Cabinets complete",    pct:20},
  {label:"Balance — Project complete", pct:10},
]
