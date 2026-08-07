import { ShieldCheck, Lock, Database, Building2, EyeOff } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'

const SECTIONS = [
  {
    icon: Database,
    title: 'What we collect',
    body: 'Your name, date of birth, mobile, email, whether you hold a health & safety role, and your employer’s NZBN. Optionally your gender, age group and industry. Plus the risks you report.',
  },
  {
    icon: Building2,
    title: 'Why we collect it',
    body: 'NQR is funded by ACC, which needs each employer’s NZBN and industry to understand where risks sit. Your reports help supervisors respond and keep your crew safe.',
  },
  {
    icon: Lock,
    title: 'Demographics stay aggregate',
    body: 'Gender and age are optional. They are only ever reported as aggregates — a split or an average age band. No individual-level demographic data is shown to anyone, including the platform owner.',
  },
  {
    icon: EyeOff,
    title: 'You can report anonymously',
    body: 'When you raise a concern you can choose to do it anonymously. Your supervisor sees the concern and responds, but not who raised it.',
  },
]

export function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Privacy & data use" subtitle="How NQR looks after your information" />

      <div className="mb-4 flex items-center gap-3 rounded-3xl bg-gradient-to-br from-pounamu-600 to-pounamu-900 p-6 text-white shadow-float">
        <ShieldCheck className="h-10 w-10 shrink-0" />
        <p className="text-sm text-white/90">
          We keep data capture lightweight and only collect what helps keep you safe and meets ACC requirements.
        </p>
      </div>

      <div className="space-y-3">
        {SECTIONS.map((s) => (
          <div key={s.title} className="card flex items-start gap-4 p-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-pounamu-100 text-pounamu-700">
              <s.icon className="h-6 w-6" />
            </span>
            <div>
              <p className="font-display text-lg font-semibold text-ink">{s.title}</p>
              <p className="mt-1 text-sm text-ink-soft">{s.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
