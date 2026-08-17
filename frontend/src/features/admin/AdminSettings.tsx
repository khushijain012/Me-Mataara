import { useState } from 'react'
import { LayoutGrid, Bell, WifiOff, Building2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Toggle, SectionTitle, Input, Field } from '@/components/ui'

interface SettingRow {
  key: string
  label: string
  hint: string
}

function SettingsGroup({
  icon,
  title,
  rows,
  state,
  setState,
}: {
  icon: React.ReactNode
  title: string
  rows: SettingRow[]
  state: Record<string, boolean>
  setState: (k: string, v: boolean) => void
}) {
  return (
    <section>
      <SectionTitle>
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
      </SectionTitle>
      <div className="card divide-y divide-black/5 p-0">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="min-w-0">
              <p className="font-medium text-ink">{r.label}</p>
              <p className="text-sm text-ink-faint">{r.hint}</p>
            </div>
            <Toggle checked={state[r.key] ?? false} onChange={(v) => setState(r.key, v)} label={r.label} />
          </div>
        ))}
      </div>
    </section>
  )
}

export function AdminSettings() {
  const [state, setState] = useState<Record<string, boolean>>({
    mod_report: true,
    mod_anon: true,
    mod_analytics: true,
    mod_reports: true,
    notif_inapp: true,
    notif_push: true,
    notif_sms: false,
    offline: true,
    autosync: true,
  })
  const set = (k: string, v: boolean) => setState((prev) => ({ ...prev, [k]: v }))

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader title="Settings" subtitle="Control which features are on for this organisation" />

      <SettingsGroup
        icon={<LayoutGrid className="h-5 w-5 text-pounamu-600" />}
        title="Modules"
        state={state}
        setState={set}
        rows={[
          { key: 'mod_report', label: 'Hazard reporting', hint: 'Let workers raise concerns' },
          { key: 'mod_anon', label: 'Anonymous reporting', hint: 'Let workers choose to raise a concern anonymously' },
          { key: 'mod_analytics', label: 'Analytics view', hint: 'Aggregated trends and drill-downs for the platform owner' },
          { key: 'mod_reports', label: 'Reports & exports', hint: 'CSV / PDF / Excel report generation' },
        ]}
      />

      <SettingsGroup
        icon={<Bell className="h-5 w-5 text-kokowai-600" />}
        title="Notifications"
        state={state}
        setState={set}
        rows={[
          { key: 'notif_inapp', label: 'In-app notifications', hint: 'Primary channel — supervisor alerted in the app' },
          { key: 'notif_push', label: 'Push when app closed', hint: 'Device push if the supervisor isn’t in the app' },
          { key: 'notif_sms', label: 'SMS fallback', hint: 'Text the supervisor if push can’t be delivered' },
        ]}
      />

      <SettingsGroup
        icon={<WifiOff className="h-5 w-5 text-sand-700" />}
        title="Offline"
        state={state}
        setState={set}
        rows={[
          { key: 'offline', label: 'Offline capture', hint: 'Save reports on-device with no connection' },
          { key: 'autosync', label: 'Auto background sync', hint: 'Upload pending reports when back online' },
        ]}
      />

      <section>
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-pounamu-600" />
            Organisation
          </span>
        </SectionTitle>
        <div className="card space-y-4 p-5">
          <Field label="Organisation name">
            <Input defaultValue="Waterview Alliance" />
          </Field>
          <Field label="Default site" hint="New users are assigned to this site unless changed.">
            <Input defaultValue="Waterview" />
          </Field>
        </div>
      </section>
    </div>
  )
}
