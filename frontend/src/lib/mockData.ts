import type {
  User,
  Role,
  HazardCategory,
  Concern,
  AppNotification,
  AkoKorero,
  SupervisorPrompt,
} from './types'

export const APP_NAME = 'NQR'
export const APP_FULL_NAME = 'Not Quite Right'
export const APP_PARENT = 'Me Mataara'
export const ME_MATAARA_URL = 'https://memataara.circle.so'
export const NZBN_LOOKUP_URL = 'https://www.nzbn.govt.nz/'

export const USERS: Record<Role, User> = {
  worker: {
    id: 'u-worker',
    name: 'Te Ariki Wharekura',
    role: 'worker',
    crew: 'Civil Crew 3',
    site: 'Waterview — Zone B',
    initials: 'TW',
    avatarColor: 'bg-pounamu-600',
  },
  supervisor: {
    id: 'u-super',
    name: 'Mia Tanuvasa',
    role: 'supervisor',
    crew: 'Site Supervision',
    site: 'Waterview',
    initials: 'MT',
    avatarColor: 'bg-kokowai-600',
  },
  admin: {
    id: 'u-admin',
    name: 'System Admin',
    role: 'admin',
    crew: 'Platform',
    site: 'All sites',
    initials: 'SA',
    avatarColor: 'bg-ink',
  },
}

// Worker–supervisor linkage. New self-registered workers are linked to
// this supervisor so their concerns route "directly to their supervisor".
export const DEFAULT_SUPERVISOR = { id: 'u-super', name: 'Mia Tanuvasa' }

// Doc (leading option): the worker claims their supervisor from a dropdown at
// profile setup. Supervisors carry an approval state — becoming a supervisor may
// need "awaiting platform owner approval" gating (still open; shown for review).
export type SupervisorApproval = 'approved' | 'awaiting_approval'
export interface SupervisorRef {
  id: string
  name: string
  crew: string
  approval: SupervisorApproval
}
export const SUPERVISORS: SupervisorRef[] = [
  { id: 'u-super', name: 'Mia Tanuvasa', crew: 'Site Supervision', approval: 'approved' },
  { id: 'u-super-2', name: 'Rewa Pauling', crew: 'Civil / Traffic', approval: 'approved' },
  { id: 'u-super-3', name: 'Daniel Kohu', crew: 'Plant & Concrete', approval: 'awaiting_approval' },
]

// Doc: the supervisor sees their claimed crew, and unclaimed workers stay
// visible so the gaps can be chased. (supervisorId === null → unclaimed.)
export const CREW: { name: string; initials: string; color: string; supervisorId: string | null }[] = [
  { name: 'Te Ariki Wharekura', initials: 'TW', color: 'bg-pounamu-600', supervisorId: 'u-super' },
  { name: 'Sef Latu', initials: 'SL', color: 'bg-kokowai-500', supervisorId: 'u-super' },
  { name: 'Priya Nair', initials: 'PN', color: 'bg-mustard-600', supervisorId: 'u-super' },
  { name: 'Jordan Ellis', initials: 'JE', color: 'bg-pounamu-500', supervisorId: null },
  { name: 'Wiremu Ropata', initials: 'WR', color: 'bg-ink', supervisorId: null },
]

export const ROLE_LABEL: Record<Role, string> = {
  worker: 'Worker',
  supervisor: 'Supervisor',
  admin: 'Platform Admin',
}

// ---- Embedded hazard images (BRD: risks shown WITH images, no external URLs) ----
// Each is a self-contained SVG data-URL: a premium duotone gradient with soft
// studio lighting + a subtle geometric motif. Pure shapes (no emoji) so they
// render crisply and reliably at any DPI. The crisp lucide glyph is layered on
// top in the UI for a polished "photo card" look.
// Brand-aligned duotone stops (Green Stone / Charcoal / Mustard / Gravel).
const TINT_STOPS: Record<string, [string, string]> = {
  pounamu: ['#5f9aa1', '#33565b'],
  kokowai: ['#5c5b59', '#333333'],
  kowhai: ['#d8bd6f', '#a07f2e'],
  sand: ['#c7c6c1', '#8a8983'],
}

function hazardImage(tint: string): string {
  const [from, to] = TINT_STOPS[tint] ?? TINT_STOPS.pounamu
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="384" viewBox="0 0 480 384">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
    </linearGradient>
    <radialGradient id="sheen" cx="0.26" cy="0.2" r="0.95">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.28"/>
      <stop offset="0.55" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="480" height="384" fill="url(#g)"/>
  <g fill="none" stroke="#ffffff" stroke-opacity="0.10" stroke-width="2">
    <circle cx="360" cy="300" r="150"/><circle cx="360" cy="300" r="104"/><circle cx="360" cy="300" r="60"/>
  </g>
  <path d="M0 300 L200 150 L480 250 L480 384 L0 384 Z" fill="#000000" fill-opacity="0.08"/>
  <rect width="480" height="384" fill="url(#sheen)"/>
</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

// BRD "risks" — multi-select, shown with images. Includes the BRD examples
// "Manufacturing Risk" and "Back's Gone".
export const HAZARD_CATEGORIES: HazardCategory[] = [
  {
    id: 'backs-gone',
    label: 'Back’s Gone',
    maoriLabel: 'Tuarā',
    icon: 'PersonStanding',
    image: hazardImage('kokowai'),
    description: 'Strain, awkward lift, sore back — your body telling you something.',
    tint: 'kokowai',
    active: true,
  },
  {
    id: 'manufacturing',
    label: 'Manufacturing Risk',
    maoriLabel: 'Hanga',
    icon: 'Factory',
    image: hazardImage('kokowai'),
    description: 'Machinery, guarding, moving parts or process hazards.',
    tint: 'kokowai',
    active: true,
  },
  {
    id: 'slip-trip',
    label: 'Slips, Trips & Falls',
    maoriLabel: 'Hipa',
    icon: 'Footprints',
    image: hazardImage('kowhai'),
    description: 'Uneven ground, spills, trailing leads, working at height.',
    tint: 'kowhai',
    active: true,
  },
  {
    id: 'plant',
    label: 'Plant & Vehicles',
    maoriLabel: 'Miihini',
    icon: 'Truck',
    image: hazardImage('kokowai'),
    description: 'Moving plant, excavators, vehicles, pinch points.',
    tint: 'kokowai',
    active: true,
  },
  {
    id: 'electrical',
    label: 'Electrical',
    maoriLabel: 'Hiko',
    icon: 'Zap',
    image: hazardImage('kowhai'),
    description: 'Live wires, temporary power, damaged leads.',
    tint: 'kowhai',
    active: true,
  },
  {
    id: 'hazmat',
    label: 'Hazardous Substances',
    maoriLabel: 'Matū',
    icon: 'FlaskConical',
    image: hazardImage('kokowai'),
    description: 'Chemicals, dust, fumes, fuel, silica.',
    tint: 'kokowai',
    active: true,
  },
  {
    id: 'environment',
    label: 'Environment & Weather',
    maoriLabel: 'Taiao',
    icon: 'CloudRain',
    image: hazardImage('pounamu'),
    description: 'Wind, heat, cold, water, poor visibility.',
    tint: 'pounamu',
    active: true,
  },
  {
    id: 'fatigue',
    label: 'Fatigue & Wellbeing',
    maoriLabel: 'Hauora',
    icon: 'HeartPulse',
    image: hazardImage('pounamu'),
    description: 'Tiredness, stress, long hours, hydration.',
    tint: 'pounamu',
    active: true,
  },
]

// Preset supervisor response prompts (seed — admin-editable at runtime).
export const SUPERVISOR_PROMPTS: SupervisorPrompt[] = [
  { id: 'p-ack', label: 'Thanks — looking into this now.' },
  { id: 'p-isolate', label: 'Area isolated / tagged out.' },
  { id: 'p-spotter', label: 'Spotter assigned and barriers in place.' },
  { id: 'p-toolbox', label: 'Toolbox talk delivered to the crew.' },
  { id: 'p-stop', label: 'Task stopped until the control is in place.' },
  { id: 'p-escalate', label: 'Escalated to the site manager.' },
  { id: 'p-fixed', label: 'Control in place — safe to continue.' },
]

const now = new Date('2026-08-06T08:30:00+12:00').getTime()
const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString()
const dayISO = (h: number) => new Date(now - h * 3600_000).toISOString().slice(0, 10)

export const CONCERNS: Concern[] = [
  {
    id: 'c-1',
    ref: 'HZ-1042',
    categoryId: 'plant',
    riskIds: ['plant', 'slip-trip'],
    description:
      'The 20t excavator is swinging over the marked walkway with no spotter. Foot traffic from the site office passes through here every smoko.',
    status: 'open',
    sceneDate: dayISO(1),
    reportedBy: 'Te Ariki Wharekura',
    reportedById: 'u-worker',
    reportedAt: hoursAgo(1),
    supervisorId: 'u-super',
    actions: [],
    captureStatus: 'synced',
  },
  {
    id: 'c-2',
    ref: 'HZ-1041',
    categoryId: 'electrical',
    riskIds: ['electrical'],
    description: 'Outer sheath is split and copper is visible near the plug. Lead was still in use this morning.',
    status: 'in_progress',
    sceneDate: dayISO(4),
    reportedBy: 'Sef Latu',
    reportedById: 'u-sef',
    reportedAt: hoursAgo(4),
    assignedTo: 'Mia Tanuvasa',
    supervisorId: 'u-super',
    captureStatus: 'synced',
    actions: [
      {
        id: 'a-1',
        author: 'Mia Tanuvasa',
        role: 'supervisor',
        message: 'Lead tagged out and removed from service. Electrician booked for 11am to inspect the board.',
        at: hoursAgo(3),
        promptId: 'p-isolate',
        responseType: 'preset',
      },
    ],
  },
  {
    id: 'c-3',
    ref: 'HZ-1039',
    categoryId: 'slip-trip',
    riskIds: ['slip-trip', 'environment'],
    description: 'Overnight rain has pooled at the base of the ramp. Gets very slippery with mud tracked across.',
    status: 'in_progress',
    sceneDate: dayISO(20),
    reportedBy: 'Te Ariki Wharekura',
    reportedById: 'u-worker',
    reportedAt: hoursAgo(20),
    assignedTo: 'Mia Tanuvasa',
    supervisorId: 'u-super',
    captureStatus: 'synced',
    actions: [
      {
        id: 'a-2',
        author: 'Mia Tanuvasa',
        role: 'supervisor',
        message: 'Cones and a temporary mat placed. Drainage crew notified to clear the channel.',
        at: hoursAgo(18),
        promptId: 'p-spotter',
        responseType: 'preset',
      },
    ],
  },
  {
    id: 'c-4',
    ref: 'HZ-1035',
    categoryId: 'hazmat',
    riskIds: ['hazmat', 'manufacturing'],
    description: 'Crew were dry-cutting pavers without water suppression or masks near the lunch area.',
    status: 'closed',
    sceneDate: dayISO(52),
    reportedBy: 'Priya Nair',
    reportedById: 'u-priya',
    reportedAt: hoursAgo(52),
    assignedTo: 'Mia Tanuvasa',
    supervisorId: 'u-super',
    closedAt: dayISO(45.5),
    closedAtIso: hoursAgo(45.5),
    timeToCloseHours: 6.5,
    riskReduction: 'Switched to wet-cutting and P2 masks issued — dust exposure largely removed.',
    captureStatus: 'synced',
    actions: [
      {
        id: 'a-3',
        author: 'Mia Tanuvasa',
        role: 'supervisor',
        message: 'Stopped the task, switched to wet-cutting and issued P2 masks. Toolbox talk delivered to the crew.',
        at: hoursAgo(50),
        promptId: 'p-toolbox',
        responseType: 'preset',
      },
      {
        id: 'a-4',
        author: 'System Admin',
        role: 'admin',
        message: 'Verified control in place. Added silica to this week’s site inspection checklist.',
        at: hoursAgo(45.5),
        promptId: 'p-fixed',
        responseType: 'preset',
      },
    ],
  },
  {
    id: 'c-5',
    ref: 'HZ-1030',
    categoryId: 'backs-gone',
    riskIds: ['backs-gone', 'fatigue'],
    description: 'Crew lifting kerb units by hand all shift. A couple of the team are guarding their backs.',
    status: 'closed',
    sceneDate: dayISO(74),
    reportedBy: 'Sef Latu',
    reportedById: 'u-sef',
    reportedAt: hoursAgo(74),
    assignedTo: 'Mia Tanuvasa',
    supervisorId: 'u-super',
    closedAt: dayISO(69),
    closedAtIso: hoursAgo(69),
    timeToCloseHours: 5,
    riskReduction: 'Mechanical lifter brought in and two-person lift rule reset — manual load removed.',
    captureStatus: 'synced',
    actions: [
      {
        id: 'a-5',
        author: 'Mia Tanuvasa',
        role: 'supervisor',
        message: 'Brought in a mechanical lifter and reset the two-person lift rule. Reviewed at H&S committee.',
        at: hoursAgo(69),
        promptId: 'p-fixed',
        responseType: 'preset',
      },
    ],
  },
]

export const NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n-1',
    kind: 'new_concern',
    title: 'New concern raised',
    body: 'HZ-1042 · Plant & Vehicles — sent to you.',
    at: hoursAgo(1),
    read: false,
    concernRef: 'HZ-1042',
  },
  {
    id: 'n-3',
    kind: 'status',
    title: 'Concern in progress',
    body: 'HZ-1041 · Electrician booked to inspect the board.',
    at: hoursAgo(3),
    read: true,
    concernRef: 'HZ-1041',
  },
  {
    id: 'n-4',
    kind: 'closed',
    title: 'Concern closed',
    body: 'HZ-1035 · Silica dust control verified by H&S.',
    at: hoursAgo(48),
    read: true,
    concernRef: 'HZ-1035',
  },
]

// ---- Derived data for dashboards (fallback only — live values preferred) ----

export const WEEKLY_TREND = [
  { week: 'Wk 1', reported: 12, closed: 9 },
  { week: 'Wk 2', reported: 18, closed: 14 },
  { week: 'Wk 3', reported: 9, closed: 10 },
  { week: 'Wk 4', reported: 22, closed: 17 },
  { week: 'Wk 5', reported: 15, closed: 16 },
  { week: 'Wk 6', reported: 11, closed: 12 },
]

export const CATEGORY_BREAKDOWN = [
  { name: 'Plant', value: 24, color: '#4f878f' },
  { name: 'Slips/Trips', value: 19, color: '#93b9bd' },
  { name: 'Back’s Gone', value: 16, color: '#404040' },
  { name: 'Electrical', value: 14, color: '#6b9ba1' },
  { name: 'Manufacturing', value: 12, color: '#caa545' },
  { name: 'Other', value: 15, color: '#bab9b4' },
]

// Governance org data (worker numbers + NZBN business identity) for the
// platform-owner analytics view.
export const ORGANISATIONS = [
  { name: 'Waterview Alliance', nzbn: '9429041902546', workers: 128, sites: 3, adoption: 91 },
  { name: 'Northline Civil Ltd', nzbn: '9429037561208', workers: 64, sites: 2, adoption: 83 },
  { name: 'Kaimahi Scaffolding', nzbn: '9429048820137', workers: 37, sites: 1, adoption: 76 },
]

// Ako kōrero cultural learning prompts (shown on the Help screen).
export const AKO_KORERO: AkoKorero[] = [
  { id: 'ako-1', title: 'Me mataara', body: 'Stay alert, stay aware — notice what’s not quite right.' },
  { id: 'ako-2', title: 'Tū māia, tū kaha', body: 'Standing steady and strong for yourself and your crew.' },
  { id: 'ako-3', title: 'He waka eke noa', body: 'We are all in this together — safety is shared.' },
]

// Doc: NZBN lookup by COMPANY NAME. The worker types their company name, picks
// it off a list, and we store the NZBN behind the scenes. Mock registry stands
// in for the live nzbn.govt.nz search API.
const NZBN_REGISTRY: Record<string, string> = {
  '9429041902546': 'Waterview Alliance',
  '9429037561208': 'Northline Civil Ltd',
  '9429048820137': 'Kaimahi Scaffolding',
  '9429036200193': 'Southbase Construction Ltd',
  '9429041771806': 'Fletcher Building Ltd',
  '9429032170157': 'Downer NZ Ltd',
  '9429000000000': 'Demo Construction Co',
}

export interface NzbnMatch {
  nzbn: string
  name: string
}

/** Reverse lookup — search registered businesses by (partial) company name. */
export function searchNzbnByName(query: string): NzbnMatch[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  return Object.entries(NZBN_REGISTRY)
    .filter(([, name]) => name.toLowerCase().includes(q))
    .map(([nzbn, name]) => ({ nzbn, name }))
    .slice(0, 6)
}

export function lookupNzbn(nzbn: string): string | null {
  return NZBN_REGISTRY[nzbn.replace(/\s/g, '')] ?? null
}

// Doc: industry captured via a dropdown/lookup built on recognised NZ industry
// categories (ANZSIC divisions) rather than free text, so data stays clean.
export const NZ_INDUSTRIES = [
  'Construction',
  'Manufacturing',
  'Agriculture, Forestry & Fishing',
  'Transport, Postal & Warehousing',
  'Electricity, Gas, Water & Waste',
  'Mining',
  'Wholesale Trade',
  'Retail Trade',
  'Accommodation & Food Services',
  'Health Care & Social Assistance',
  'Education & Training',
  'Public Administration & Safety',
  'Professional, Scientific & Technical',
  'Administrative & Support Services',
  'Rental, Hiring & Real Estate',
  'Arts & Recreation Services',
  'Other Services',
]

export function categoryById(id: string) {
  return HAZARD_CATEGORIES.find((c) => c.id === id)
}

export function concernByRef(ref: string) {
  return CONCERNS.find((c) => c.ref === ref)
}

export function promptById(id?: string) {
  return SUPERVISOR_PROMPTS.find((p) => p.id === id)
}
