import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Search, Trash2, X } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar, Badge, Button, Field, Input, Select } from '@/components/ui'
import { membersApi, type MemberRow, type NewMemberInput } from '@/lib/api/members'
import type { Role } from '@/lib/types'

const EMPTY_DRAFT: NewMemberInput = {
  firstName: '',
  lastName: '',
  mobile: '',
  email: '',
  role: 'worker',
  password: '',
  supervisorId: '',
  organisation: '',
}

const STATUS_TONE = { active: 'green', pending: 'clay' } as const
const STATUS_LABEL: Record<MemberRow['status'], string> = {
  active: 'active',
  pending: 'awaiting approval',
}
const ROLE_LABEL: Record<MemberRow['role'], string> = {
  worker: 'Worker',
  supervisor: 'Supervisor',
  admin: 'Platform Admin',
}

export function AdminUsers() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [draft, setDraft] = useState<NewMemberInput | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const members = useQuery({ queryKey: ['members'], queryFn: membersApi.list })
  const rows = members.data ?? []
  const supervisorOptions = useMemo(() => rows.filter((r) => r.role === 'supervisor'), [rows])

  const removeSelected = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await membersApi.remove(id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] })
      setSelected(new Set())
    },
  })

  const createMember = useMutation({
    mutationFn: (input: NewMemberInput) =>
      membersApi.create({
        ...input,
        // Only workers carry a supervisor edge.
        supervisorId: input.role === 'worker' ? input.supervisorId || undefined : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] })
      setDraft(null)
      setFormError(null)
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : 'Could not create the user.'),
  })

  function submitDraft() {
    if (!draft) return
    setFormError(null)
    const required: (keyof NewMemberInput)[] = ['firstName', 'lastName', 'mobile', 'email', 'password']
    if (required.some((k) => !String(draft[k] ?? '').trim())) {
      setFormError('Please fill in first name, last name, mobile, email and a password.')
      return
    }
    if (draft.password.length < 5) {
      setFormError('Password must be at least 5 characters.')
      return
    }
    createMember.mutate(draft)
  }

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const needle = q.toLowerCase()
        return r.name.toLowerCase().includes(needle) || r.userId.toLowerCase().includes(needle)
      }),
    [rows, q],
  )
  const allShownSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id))

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function toggleAll() {
    setSelected((prev) => {
      if (allShownSelected) {
        const next = new Set(prev)
        filtered.forEach((r) => next.delete(r.id))
        return next
      }
      return new Set([...prev, ...filtered.map((r) => r.id)])
    })
  }

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Manage workers and supervisors — including bulk removal"
        action={
          <Button
            icon={<UserPlus className="h-4 w-4" />}
            onClick={() => {
              setFormError(null)
              setDraft({ ...EMPTY_DRAFT })
            }}
          >
            Add user
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <Input className="pl-10" placeholder="Search users…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {selected.size > 0 && (
          <div className="flex items-center gap-3 rounded-xl bg-kokowai-50 px-4 py-2 ring-1 ring-kokowai-100">
            <span className="text-sm font-semibold text-kokowai-800">{selected.size} selected</span>
            <Button
              size="sm"
              variant="secondary"
              icon={<Trash2 className="h-4 w-4" />}
              disabled={removeSelected.isPending}
              onClick={() => removeSelected.mutate([...selected])}
            >
              Delete selected
            </Button>
          </div>
        )}
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-sand-50 text-xs uppercase tracking-wide text-ink-faint">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allShownSelected}
                    onChange={toggleAll}
                    aria-label="Select all"
                    className="h-4 w-4 accent-pounamu-600"
                  />
                </th>
                <th className="px-5 py-3 font-semibold">ID</th>
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">Crew</th>
                <th className="px-5 py-3 font-semibold">Site</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filtered.map((r) => (
                <tr key={r.id} className={selected.has(r.id) ? 'bg-pounamu-50/50' : 'hover:bg-sand-50/50'}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggle(r.id)}
                      aria-label={`Select ${r.name}`}
                      className="h-4 w-4 accent-pounamu-600"
                    />
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs text-ink-soft">{r.userId || '—'}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar initials={r.initials} color={r.color} size="sm" />
                      <span className="font-medium text-ink">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-ink-soft">{ROLE_LABEL[r.role] ?? r.role}</td>
                  <td className="px-5 py-3 text-ink-soft">{r.crew}</td>
                  <td className="px-5 py-3 text-ink-soft">{r.site}</td>
                  <td className="px-5 py-3">
                    <Badge tone={STATUS_TONE[r.status]} className="capitalize">
                      {STATUS_LABEL[r.status]}
                    </Badge>
                  </td>
                </tr>
              ))}
              {members.isLoading && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-ink-faint">
                    Loading users…
                  </td>
                </tr>
              )}
              {members.isError && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-kokowai-700">
                    Couldn’t load users.
                  </td>
                </tr>
              )}
              {!members.isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-ink-faint">
                    No users match “{q}”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {draft && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Add user"
          onClick={() => !createMember.isPending && setDraft(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg animate-scale-in overflow-y-auto rounded-t-3xl bg-white p-5 shadow-float ring-1 ring-black/5 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink">Add user</h2>
              <button
                type="button"
                aria-label="Close"
                className="rounded-lg p-1.5 text-ink-faint hover:bg-sand-50"
                onClick={() => setDraft(null)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                submitDraft()
              }}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="First name">
                  <Input
                    value={draft.firstName}
                    onChange={(e) => setDraft({ ...draft, firstName: e.target.value })}
                    autoFocus
                  />
                </Field>
                <Field label="Last name">
                  <Input
                    value={draft.lastName}
                    onChange={(e) => setDraft({ ...draft, lastName: e.target.value })}
                  />
                </Field>
              </div>

              <Field label="Mobile number">
                <Input
                  type="tel"
                  placeholder="021 234 5678"
                  value={draft.mobile}
                  onChange={(e) => setDraft({ ...draft, mobile: e.target.value })}
                />
              </Field>

              <Field label="Email">
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={draft.email}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Role">
                  <Select
                    value={draft.role}
                    onChange={(e) => setDraft({ ...draft, role: e.target.value as Role })}
                  >
                    <option value="worker">Worker</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="admin">Platform Admin</option>
                  </Select>
                </Field>
                {draft.role === 'worker' && (
                  <Field label="Supervisor" hint="Who this worker reports to">
                    <Select
                      value={draft.supervisorId}
                      onChange={(e) => setDraft({ ...draft, supervisorId: e.target.value })}
                    >
                      <option value="">Unassigned</option>
                      {supervisorOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
              </div>

              <Field label="Organisation" hint="Optional">
                <Input
                  value={draft.organisation}
                  onChange={(e) => setDraft({ ...draft, organisation: e.target.value })}
                />
              </Field>

              <Field label="Temporary password" hint="At least 5 characters — the user signs in with this and their mobile.">
                <Input
                  type="text"
                  value={draft.password}
                  onChange={(e) => setDraft({ ...draft, password: e.target.value })}
                />
              </Field>

              {formError && (
                <p className="rounded-xl bg-kokowai-50 px-4 py-2.5 text-sm text-kokowai-800 ring-1 ring-kokowai-100">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <Button type="button" variant="secondary" onClick={() => setDraft(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMember.isPending}>
                  {createMember.isPending ? 'Creating…' : 'Create user'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
