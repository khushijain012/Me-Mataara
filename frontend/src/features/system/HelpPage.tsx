import { useState } from 'react'
import { LifeBuoy, ChevronDown, Phone, Mail, Sparkles, PlayCircle, Clapperboard } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { useApp } from '@/context/AppContext'
import { cn } from '@/lib/utils'

const FAQS = [
  { q: 'What is NQR?', a: 'NQR — “Not Quite Right”. If you spot something that isn’t right at work, you can raise it in a few taps and it goes straight to your supervisor.' },
  { q: 'What happens when I raise a concern?', a: 'It goes straight to your supervisor, who responds with an action and closes it once it’s sorted. You can follow the status any time.' },
  { q: 'Can I raise a concern anonymously?', a: 'Yes. When you submit, you can choose to raise it anonymously. Your supervisor still sees the concern and responds, but not who raised it.' },
  { q: 'Can I use the app with no signal?', a: 'Yes. Your report is saved on your device and sends automatically the moment you’re back online.' },
  { q: 'Why do you need my NZBN?', a: 'NQR is funded by ACC, which requires your employer’s New Zealand Business Number. You just type your company name and we store the number behind the scenes.' },
]

export function HelpPage() {
  const { akoKorero } = useApp()
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Help & support" subtitle="Answers, guidance and who to contact" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <a href="tel:0800000000" className="card flex items-center gap-3 p-5 transition hover:shadow-float">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-pounamu-100 text-pounamu-700">
            <Phone className="h-6 w-6" />
          </span>
          <div>
            <p className="font-semibold text-ink">Call support</p>
            <p className="text-sm text-ink-faint">0800 000 000</p>
          </div>
        </a>
        <a href="mailto:tautoko@memataara.nz" className="card flex items-center gap-3 p-5 transition hover:shadow-float">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-kokowai-100 text-kokowai-700">
            <Mail className="h-6 w-6" />
          </span>
          <div>
            <p className="font-semibold text-ink">Email us</p>
            <p className="text-sm text-ink-faint">tautoko@memataara.nz</p>
          </div>
        </a>
      </div>

      {/* Doc: 3-min explainer videos (filming in Wellington) will sit in the app
          once hosting is confirmed (YouTube / cloud / Circle). Placeholder for now. */}
      <div className="mt-4">
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-soft">
          <Clapperboard className="h-4 w-4 text-pounamu-600" /> Explainer videos
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {['What is NQR?', 'How to raise a concern'].map((title) => (
            <div key={title} className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-black/5">
              <div className="relative grid aspect-video place-items-center bg-gradient-to-br from-pounamu-700 to-pounamu-950">
                <PlayCircle className="h-12 w-12 text-white/60" />
                <span className="absolute bottom-2 right-2 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                  ~3 min
                </span>
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold text-ink">{title}</p>
                <p className="text-xs text-ink-faint">Coming soon — video hosting to be confirmed.</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 card p-2">
        {FAQS.map((f, i) => (
          <div key={i} className="border-b border-black/5 last:border-0">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="focus-ring flex w-full items-center justify-between gap-3 rounded-xl px-3 py-4 text-left"
            >
              <span className="font-semibold text-ink">{f.q}</span>
              <ChevronDown className={cn('h-5 w-5 shrink-0 text-ink-faint transition-transform', open === i && 'rotate-180')} />
            </button>
            {open === i && <p className="px-3 pb-4 text-sm text-ink-soft">{f.a}</p>}
          </div>
        ))}
      </div>

      {/* Ako kōrero — short cultural reflections */}
      <div className="mt-4 rounded-3xl bg-gradient-to-br from-kokowai-600 to-kokowai-800 p-5 text-white shadow-float">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-white/80">
          <Sparkles className="h-4 w-4" /> Ako kōrero · cultural learning
        </p>
        <div className="mt-3 space-y-2">
          {akoKorero.map((a) => (
            <div key={a.id} className="rounded-xl bg-white/10 px-3 py-2 text-sm">
              <span className="font-semibold">{a.title}</span> — {a.body}
            </div>
          ))}
        </div>
      </div>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-ink-faint">
        <LifeBuoy className="h-3.5 w-3.5" />
        NQR · Not Quite Right · Part of Me Mataara
      </p>
    </div>
  )
}
