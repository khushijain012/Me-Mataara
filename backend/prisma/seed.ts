import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

// Seed uses a plain client (no soft-delete middleware) so it can reset cleanly.
const prisma = new PrismaClient()

// ---- Hazard images (small generated SVG data URLs) --------------------------
const TINT_STOPS: Record<string, [string, string]> = {
  pounamu: ['#5f9aa1', '#33565b'],
  kokowai: ['#5c5b59', '#333333'],
  kowhai: ['#d8bd6f', '#a07f2e'],
  sand: ['#c7c6c1', '#8a8983'],
}
function hazardImage(tint: string): string {
  const [from, to] = TINT_STOPS[tint] ?? TINT_STOPS.pounamu
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="384" viewBox="0 0 480 384"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="480" height="384" fill="url(#g)"/></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const now = Date.now()
const hoursAgo = (h: number) => new Date(now - h * 3600_000)
const dayISO = (h: number) => hoursAgo(h).toISOString().slice(0, 10)

async function main() {
  const passwordHash = await bcrypt.hash('password', 10)

  // ---- Clean slate (FK-safe order) ----
  await prisma.auditLog.deleteMany()
  await prisma.errorLog.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.syncEvent.deleteMany()
  await prisma.correctiveAction.deleteMany()
  await prisma.concernPhoto.deleteMany()
  await prisma.concernRisk.deleteMany()
  await prisma.concern.deleteMany()
  await prisma.quickLink.deleteMany()
  await prisma.mediaAsset.deleteMany()
  await prisma.mimeType.deleteMany()
  await prisma.mediaType.deleteMany()
  await prisma.quickLinkType.deleteMany()
  await prisma.memberRole.deleteMany()
  await prisma.member.deleteMany()
  await prisma.company.deleteMany()
  await prisma.hazardCategory.deleteMany()
  await prisma.supervisorPrompt.deleteMany()
  await prisma.akoKorero.deleteMany()
  await prisma.systemRole.deleteMany()

  // ---- Master: system roles (#1) ----
  const roleCodes = ['worker', 'supervisor', 'company_owner', 'platform_owner'] as const
  const roleId: Record<string, string> = {}
  for (const code of roleCodes) {
    const r = await prisma.systemRole.create({
      data: { code, name: code.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) },
    })
    roleId[code] = r.id
  }

  // ---- Master: media types + mime types (#4, #5) ----
  const mediaTypes = [
    { code: 'doc', name: 'Document', storageFolder: 'doc', mimes: [{ code: 'application/pdf', extension: 'pdf' }] },
    { code: 'video', name: 'Video', storageFolder: 'video', mimes: [{ code: 'video/mp4', extension: 'mp4' }] },
    { code: 'audio', name: 'Audio', storageFolder: 'audio', mimes: [{ code: 'audio/mpeg', extension: 'mp3' }] },
  ]
  for (const mt of mediaTypes) {
    const created = await prisma.mediaType.create({
      data: { code: mt.code, name: mt.name, storageFolder: mt.storageFolder },
    })
    for (const mime of mt.mimes) {
      await prisma.mimeType.create({ data: { ...mime, mediaTypeId: created.id } })
    }
  }

  // ---- Master: quick-link types (#6) ----
  await prisma.quickLinkType.createMany({
    data: [
      { code: 'docs', name: 'Documents' },
      { code: 'videos', name: 'Videos' },
    ],
  })

  // ---- Companies (NZBN registry) ----
  const orgSeed = [
    { name: 'Waterview Alliance', nzbn: '9429041902546', sites: 3, adoption: 91 },
    { name: 'Northline Civil Ltd', nzbn: '9429037561208', sites: 2, adoption: 83 },
    { name: 'Kaimahi Scaffolding', nzbn: '9429048820137', sites: 1, adoption: 76 },
    { name: 'Southbase Construction Ltd', nzbn: '9429036200193', sites: 1, adoption: 0 },
    { name: 'Fletcher Building Ltd', nzbn: '9429041771806', sites: 1, adoption: 0 },
    { name: 'Downer NZ Ltd', nzbn: '9429032170157', sites: 1, adoption: 0 },
    { name: 'Demo Construction Co', nzbn: '9429000000000', sites: 1, adoption: 0 },
  ]
  const companies: Record<string, string> = {}
  for (const o of orgSeed) {
    const c = await prisma.company.create({ data: o })
    companies[o.nzbn] = c.id
  }
  const waterview = companies['9429041902546']
  const WATERVIEW_NZBN = '9429041902546'

  // ---- Members (+ member_role link) ----
  async function createMember(
    data: Parameters<typeof prisma.member.create>[0]['data'] & { circleRole: (typeof roleCodes)[number] },
  ) {
    const member = await prisma.member.create({ data })
    await prisma.memberRole.create({ data: { memberId: member.id, roleId: roleId[data.circleRole] } })
    return member
  }

  const base = {
    passwordHash,
    industry: 'Construction',
    organisation: 'Waterview Alliance',
    companyId: waterview,
    companyName: 'Waterview Alliance',
    nzbn: WATERVIEW_NZBN,
  }

  await createMember({
    id: 'u-admin',
    circleId: 'circle-u-admin',
    firstName: 'System',
    lastName: 'Admin',
    email: 'admin@nqr.nz',
    mobile: '021 000 0001',
    passwordHash,
    circleRole: 'platform_owner',
    role: 'admin',
    initials: 'SA',
    avatarColor: 'bg-ink',
    crew: 'Platform',
  })

  // TEMPORARY dev convenience login (admin). Remove before production.
  await createMember({
    id: 'u-dev',
    circleId: 'circle-u-dev',
    firstName: 'Dev',
    lastName: 'Login',
    email: 'dev@nqr.nz',
    mobile: '7014509776',
    passwordHash: await bcrypt.hash('12345', 10),
    circleRole: 'platform_owner',
    role: 'admin',
    initials: 'DL',
    avatarColor: 'bg-ink',
    crew: 'Platform',
  })

  const supervisors = [
    { id: 'u-super', first: 'Mia', last: 'Tanuvasa', mobile: '021 000 0002', crew: 'Site Supervision', approval: 'approved' as const, dob: '1982-03-10', gender: 'female' as const, initials: 'MT', color: 'bg-kokowai-600' },
    { id: 'u-super-2', first: 'Rewa', last: 'Pauling', mobile: '021 000 0003', crew: 'Civil / Traffic', approval: 'approved' as const, dob: '1988-06-25', gender: 'female' as const, initials: 'RP', color: 'bg-pounamu-500' },
    { id: 'u-super-3', first: 'Daniel', last: 'Kohu', mobile: '021 000 0004', crew: 'Plant & Concrete', approval: 'awaiting_approval' as const, dob: '1975-12-05', gender: 'male' as const, initials: 'DK', color: 'bg-sand-600' },
  ]
  for (const s of supervisors) {
    await createMember({
      ...base,
      id: s.id,
      circleId: `circle-${s.id}`,
      firstName: s.first,
      lastName: s.last,
      email: `${s.first.toLowerCase()}@nqr.nz`,
      mobile: s.mobile,
      circleRole: 'supervisor',
      role: 'supervisor',
      crew: s.crew,
      approval: s.approval,
      dob: s.dob,
      gender: s.gender,
      initials: s.initials,
      avatarColor: s.color,
    })
  }

  const workers = [
    { id: 'u-worker', first: 'Te Ariki', last: 'Wharekura', mobile: '021 234 5678', worker: 'W-1001', dob: '1990-05-12', gender: 'male' as const, initials: 'TW', color: 'bg-pounamu-600', supervisorId: 'u-super', hsr: true },
    { id: 'u-sef', first: 'Sef', last: 'Latu', mobile: '021 000 0006', worker: 'W-1002', dob: '1985-11-03', gender: 'male' as const, initials: 'SL', color: 'bg-kokowai-500', supervisorId: 'u-super', hsr: false },
    { id: 'u-priya', first: 'Priya', last: 'Nair', mobile: '021 000 0007', worker: 'W-1003', dob: '1993-02-20', gender: 'female' as const, initials: 'PN', color: 'bg-mustard-600', supervisorId: 'u-super', hsr: false },
    { id: 'u-jordan', first: 'Jordan', last: 'Ellis', mobile: '021 000 0008', worker: 'W-1004', dob: '1998-07-15', gender: 'male' as const, initials: 'JE', color: 'bg-pounamu-500', supervisorId: null, hsr: false },
    { id: 'u-wiremu', first: 'Wiremu', last: 'Ropata', mobile: '021 000 0009', worker: 'W-1005', dob: '1979-09-01', gender: 'male' as const, initials: 'WR', color: 'bg-ink', supervisorId: null, hsr: false },
  ]
  for (const w of workers) {
    await createMember({
      ...base,
      id: w.id,
      circleId: `circle-${w.id}`,
      workerId: w.worker,
      firstName: w.first,
      lastName: w.last,
      email: `${w.first}.${w.last}`.toLowerCase().replace(/\s/g, '') + '@nqr.nz',
      mobile: w.mobile,
      circleRole: 'worker',
      role: 'worker',
      dob: w.dob,
      gender: w.gender,
      isHSR: w.hsr,
      initials: w.initials,
      avatarColor: w.color,
      crew: 'Civil Crew 3',
      supervisorId: w.supervisorId,
      supervisorName: w.supervisorId ? 'Mia Tanuvasa' : null,
    })
  }

  // ---- Hazard catalogue (image held as data_url, #8) ----
  const hazards = [
    { id: 'backs-gone', label: 'Back’s Gone', maoriLabel: 'Tuarā', icon: 'PersonStanding', description: 'Strain, awkward lift, sore back — your body telling you something.', tint: 'kokowai' },
    { id: 'manufacturing', label: 'Manufacturing Risk', maoriLabel: 'Hanga', icon: 'Factory', description: 'Machinery, guarding, moving parts or process hazards.', tint: 'kokowai' },
    { id: 'slip-trip', label: 'Slips, Trips & Falls', maoriLabel: 'Hipa', icon: 'Footprints', description: 'Uneven ground, spills, trailing leads, working at height.', tint: 'kowhai' },
    { id: 'plant', label: 'Plant & Vehicles', maoriLabel: 'Miihini', icon: 'Truck', description: 'Moving plant, excavators, vehicles, pinch points.', tint: 'kokowai' },
    { id: 'electrical', label: 'Electrical', maoriLabel: 'Hiko', icon: 'Zap', description: 'Live wires, temporary power, damaged leads.', tint: 'kowhai' },
    { id: 'hazmat', label: 'Hazardous Substances', maoriLabel: 'Matū', icon: 'FlaskConical', description: 'Chemicals, dust, fumes, fuel, silica.', tint: 'kokowai' },
    { id: 'environment', label: 'Environment & Weather', maoriLabel: 'Taiao', icon: 'CloudRain', description: 'Wind, heat, cold, water, poor visibility.', tint: 'pounamu' },
    { id: 'fatigue', label: 'Fatigue & Wellbeing', maoriLabel: 'Hauora', icon: 'HeartPulse', description: 'Tiredness, stress, long hours, hydration.', tint: 'pounamu' },
  ]
  await prisma.hazardCategory.createMany({
    data: hazards.map((h, i) => ({ ...h, image: hazardImage(h.tint), sortOrder: i })),
  })

  // ---- Supervisor prompts ----
  const prompts = [
    { id: 'p-ack', label: 'Thanks — looking into this now.' },
    { id: 'p-isolate', label: 'Area isolated / tagged out.' },
    { id: 'p-spotter', label: 'Spotter assigned and barriers in place.' },
    { id: 'p-toolbox', label: 'Toolbox talk delivered to the crew.' },
    { id: 'p-stop', label: 'Task stopped until the control is in place.' },
    { id: 'p-escalate', label: 'Escalated to the site manager.' },
    { id: 'p-fixed', label: 'Control in place — safe to continue.' },
  ]
  await prisma.supervisorPrompt.createMany({ data: prompts.map((p, i) => ({ ...p, sortOrder: i })) })

  // ---- Ako kōrero ----
  await prisma.akoKorero.createMany({
    data: [
      { id: 'ako-1', title: 'Me mataara', body: 'Stay alert, stay aware — notice what’s not quite right.', sortOrder: 0 },
      { id: 'ako-2', title: 'Tū māia, tū kaha', body: 'Standing steady and strong for yourself and your crew.', sortOrder: 1 },
      { id: 'ako-3', title: 'He waka eke noa', body: 'We are all in this together — safety is shared.', sortOrder: 2 },
    ],
  })

  // ---- Concerns (risks via concern_risk, #1) ----
  const authorId = (name: string) => (name === 'System Admin' ? 'u-admin' : 'u-super')
  type Action = { authorName: string; role: 'supervisor' | 'admin'; message: string; at: Date; promptId: string; responseType: 'preset' }
  const concerns: {
    id: string; ref: string; categoryId: string; riskIds: string[]; description: string
    status: 'open' | 'in_progress' | 'closed'; sceneDate: string; reportedById: string; reportedByName: string
    reportedAt: Date; assignedTo?: string; closedAt?: string; closedAtIso?: Date; timeToCloseHours?: number
    riskReduction?: string; actions: Action[]
  }[] = [
    {
      id: 'c-1', ref: 'HZ-1042', categoryId: 'plant', riskIds: ['plant', 'slip-trip'],
      description: 'The 20t excavator is swinging over the marked walkway with no spotter. Foot traffic from the site office passes through here every smoko.',
      status: 'open', sceneDate: dayISO(1), reportedById: 'u-worker', reportedByName: 'Te Ariki Wharekura', reportedAt: hoursAgo(1), actions: [],
    },
    {
      id: 'c-2', ref: 'HZ-1041', categoryId: 'electrical', riskIds: ['electrical'],
      description: 'Outer sheath is split and copper is visible near the plug. Lead was still in use this morning.',
      status: 'in_progress', sceneDate: dayISO(4), reportedById: 'u-sef', reportedByName: 'Sef Latu', reportedAt: hoursAgo(4), assignedTo: 'Mia Tanuvasa',
      actions: [{ authorName: 'Mia Tanuvasa', role: 'supervisor', message: 'Lead tagged out and removed from service. Electrician booked for 11am to inspect the board.', at: hoursAgo(3), promptId: 'p-isolate', responseType: 'preset' }],
    },
    {
      id: 'c-3', ref: 'HZ-1039', categoryId: 'slip-trip', riskIds: ['slip-trip', 'environment'],
      description: 'Overnight rain has pooled at the base of the ramp. Gets very slippery with mud tracked across.',
      status: 'in_progress', sceneDate: dayISO(20), reportedById: 'u-worker', reportedByName: 'Te Ariki Wharekura', reportedAt: hoursAgo(20), assignedTo: 'Mia Tanuvasa',
      actions: [{ authorName: 'Mia Tanuvasa', role: 'supervisor', message: 'Cones and a temporary mat placed. Drainage crew notified to clear the channel.', at: hoursAgo(18), promptId: 'p-spotter', responseType: 'preset' }],
    },
    {
      id: 'c-4', ref: 'HZ-1035', categoryId: 'hazmat', riskIds: ['hazmat', 'manufacturing'],
      description: 'Crew were dry-cutting pavers without water suppression or masks near the lunch area.',
      status: 'closed', sceneDate: dayISO(52), reportedById: 'u-priya', reportedByName: 'Priya Nair', reportedAt: hoursAgo(52), assignedTo: 'Mia Tanuvasa',
      closedAt: dayISO(45.5), closedAtIso: hoursAgo(45.5), timeToCloseHours: 6.5, riskReduction: 'Switched to wet-cutting and P2 masks issued — dust exposure largely removed.',
      actions: [
        { authorName: 'Mia Tanuvasa', role: 'supervisor', message: 'Stopped the task, switched to wet-cutting and issued P2 masks. Toolbox talk delivered to the crew.', at: hoursAgo(50), promptId: 'p-toolbox', responseType: 'preset' },
        { authorName: 'System Admin', role: 'admin', message: 'Verified control in place. Added silica to this week’s site inspection checklist.', at: hoursAgo(45.5), promptId: 'p-fixed', responseType: 'preset' },
      ],
    },
    {
      id: 'c-5', ref: 'HZ-1030', categoryId: 'backs-gone', riskIds: ['backs-gone', 'fatigue'],
      description: 'Crew lifting kerb units by hand all shift. A couple of the team are guarding their backs.',
      status: 'closed', sceneDate: dayISO(74), reportedById: 'u-sef', reportedByName: 'Sef Latu', reportedAt: hoursAgo(74), assignedTo: 'Mia Tanuvasa',
      closedAt: dayISO(69), closedAtIso: hoursAgo(69), timeToCloseHours: 5, riskReduction: 'Mechanical lifter brought in and two-person lift rule reset — manual load removed.',
      actions: [{ authorName: 'Mia Tanuvasa', role: 'supervisor', message: 'Brought in a mechanical lifter and reset the two-person lift rule. Reviewed at H&S committee.', at: hoursAgo(69), promptId: 'p-fixed', responseType: 'preset' }],
    },
  ]

  for (const c of concerns) {
    await prisma.concern.create({
      data: {
        id: c.id,
        ref: c.ref,
        categoryId: c.categoryId,
        description: c.description,
        status: c.status,
        sceneDate: c.sceneDate,
        reportedById: c.reportedById,
        reportedByName: c.reportedByName,
        reportedAt: c.reportedAt,
        assignedTo: c.assignedTo ?? null,
        supervisorId: 'u-super',
        companyId: waterview,
        nzbn: WATERVIEW_NZBN,
        closedAt: c.closedAt ?? null,
        closedAtIso: c.closedAtIso ?? null,
        timeToCloseHours: c.timeToCloseHours ?? null,
        riskReduction: c.riskReduction ?? null,
        captureStatus: 'synced',
        capturedAt: c.reportedAt,
        syncedAt: c.reportedAt,
        risks: {
          create: c.riskIds.map((categoryId) => ({ categoryId, isPrimary: categoryId === c.categoryId })),
        },
        actions: {
          create: c.actions.map((a) => ({
            authorId: authorId(a.authorName),
            authorName: a.authorName,
            role: a.role,
            message: a.message,
            at: a.at,
            promptId: a.promptId,
            responseType: a.responseType,
          })),
        },
      },
    })
  }

  // ---- Notifications (supervisor inbox) ----
  await prisma.notification.createMany({
    data: [
      { recipientId: 'u-super', kind: 'new_concern', title: 'New concern raised', body: 'HZ-1042 · Plant & Vehicles — sent to you.', at: hoursAgo(1), read: false, concernRef: 'HZ-1042' },
      { recipientId: 'u-super', kind: 'status', title: 'Concern in progress', body: 'HZ-1041 · Electrician booked to inspect the board.', at: hoursAgo(3), read: true, concernRef: 'HZ-1041' },
      { recipientId: 'u-super', kind: 'closed', title: 'Concern closed', body: 'HZ-1035 · Silica dust control verified by H&S.', at: hoursAgo(48), read: true, concernRef: 'HZ-1035' },
    ],
  })

  // ---- A sample quick link (external, no file) to show the type in use ----
  const docsType = await prisma.quickLinkType.findUnique({ where: { code: 'docs' } })
  if (docsType) {
    await prisma.quickLink.create({
      data: { title: 'WorkSafe NZ — Health & Safety at Work Act', typeId: docsType.id, externalUrl: 'https://www.worksafe.govt.nz/', sortOrder: 0 },
    })
  }

  console.log('Seed v2 complete.')
  console.log('Sign in with any seeded mobile + password "password" (worker 021 234 5678, supervisor 021 000 0002, admin 021 000 0001).')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
