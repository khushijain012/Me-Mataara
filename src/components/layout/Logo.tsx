import { cn } from '@/lib/utils'

/** Me Mataara brandmark — the four-colour pinwheel (public/icons/logo-mark.png). */
export function Logo({ className }: { className?: string }) {
  return (
    <img
      src="/icons/logo-mark.png"
      alt="NQR — Not Quite Right"
      className={cn('h-9 w-9 object-contain', className)}
    />
  )
}

/** App wordmark: NQR, sitting within the Me Mataara ecosystem. */
export function Wordmark({ subtitle = true }: { subtitle?: boolean }) {
  return (
    <div className="leading-none">
      <p className="font-display text-lg font-bold tracking-tight text-ink">NQR</p>
      {subtitle && (
        <p className="text-[11px] font-medium text-pounamu-600">Not Quite Right · Me Mataara</p>
      )}
    </div>
  )
}

/** Full Me Mataara horizontal logo (wordmark + pinwheel) for splash/ecosystem attribution. */
export function MeMataaraWordmark({ className }: { className?: string }) {
  return (
    <img
      src="/icons/logo-wordmark.png"
      alt="Me Mataara"
      className={cn('h-8 w-auto object-contain', className)}
    />
  )
}
