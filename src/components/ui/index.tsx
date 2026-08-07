import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/utils'
import type { ConcernStatus } from '@/lib/types'

/* ------------------------------------------------------------------ Button */

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'outline'
  | 'white'
  | 'outlineInverse'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  block?: boolean
  icon?: ReactNode
}

const variants: Record<ButtonVariant, string> = {
  // Primary — teal, soft coloured shadow + subtle inner highlight
  primary:
    'bg-pounamu-600 text-white ring-1 ring-inset ring-white/10 shadow-[0_10px_24px_-10px_rgba(45,66,71,0.7)] hover:bg-pounamu-700 hover:shadow-[0_14px_30px_-10px_rgba(45,66,71,0.75)] active:bg-pounamu-800',
  // Secondary — charcoal
  secondary:
    'bg-kokowai-700 text-white ring-1 ring-inset ring-white/10 shadow-[0_10px_24px_-10px_rgba(40,40,40,0.6)] hover:bg-kokowai-800 active:bg-kokowai-900',
  outline:
    'border border-pounamu-600/25 bg-white text-pounamu-700 shadow-sm hover:border-pounamu-600/50 hover:bg-pounamu-50 active:bg-pounamu-100',
  ghost: 'text-ink-soft hover:bg-ink/5 active:bg-ink/10',
  danger:
    'bg-red-600 text-white ring-1 ring-inset ring-white/10 shadow-[0_10px_24px_-10px_rgba(220,38,38,0.55)] hover:bg-red-700 active:bg-red-800',
  // White — for use on dark / coloured panels
  white:
    'bg-white text-pounamu-700 shadow-[0_10px_26px_-10px_rgba(0,0,0,0.45)] hover:bg-pounamu-50 active:bg-pounamu-100',
  // Outline on dark panels
  outlineInverse:
    'border border-white/35 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 active:bg-white/25',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm rounded-xl gap-1.5',
  md: 'h-11 px-5 text-sm rounded-xl gap-2',
  lg: 'h-14 px-6 text-base rounded-2xl gap-2.5',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', block, icon, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'focus-ring inline-flex select-none items-center justify-center font-semibold transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:active:scale-100',
        variants[variant],
        sizes[size],
        block && 'w-full',
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  ),
)
Button.displayName = 'Button'

/* -------------------------------------------------------------------- Card */

export function Card({
  className,
  children,
  ...props
}: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('card p-5', className)} {...props}>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------- Badge */

export function Badge({
  children,
  className,
  tone = 'neutral',
}: {
  children: ReactNode
  className?: string
  tone?: 'neutral' | 'green' | 'clay' | 'gold' | 'red'
}) {
  const tones = {
    neutral: 'bg-sand-100 text-ink-soft',
    green: 'bg-pounamu-100 text-pounamu-800',
    clay: 'bg-kokowai-100 text-kokowai-800',
    gold: 'bg-kowhai-400/20 text-sand-800',
    red: 'bg-red-100 text-red-700',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

const STATUS_META: Record<ConcernStatus, { label: string; dot: string; cls: string }> = {
  open: { label: 'Open', dot: 'bg-kokowai-500', cls: 'bg-kokowai-100 text-kokowai-800' },
  in_progress: { label: 'In Progress', dot: 'bg-kowhai-500', cls: 'bg-kowhai-400/20 text-sand-800' },
  closed: { label: 'Closed', dot: 'bg-pounamu-500', cls: 'bg-pounamu-100 text-pounamu-800' },
}

export function StatusBadge({ status }: { status: ConcernStatus }) {
  const m = STATUS_META[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', m.cls)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', m.dot)} />
      {m.label}
    </span>
  )
}

/* ------------------------------------------------------------- Form fields */

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'focus-ring h-11 w-full rounded-xl border border-black/10 bg-white px-4 text-sm text-ink placeholder:text-ink-faint',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'focus-ring w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-ink placeholder:text-ink-faint',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'focus-ring h-11 w-full rounded-xl border border-black/10 bg-white px-4 text-sm text-ink',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
)
Select.displayName = 'Select'

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-faint">{hint}</span>}
    </label>
  )
}

/* ------------------------------------------------------------------ Avatar */

export function Avatar({
  initials,
  color,
  size = 'md',
}: {
  initials: string
  color: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const s = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg' }[size]
  return (
    <span className={cn('inline-flex items-center justify-center rounded-full font-bold text-white', color, s)}>
      {initials}
    </span>
  )
}

/* ------------------------------------------------------------- ProgressBar */

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-sand-200', className)}>
      <div
        className="h-full rounded-full bg-pounamu-500 transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

/* --------------------------------------------------------------- EmptyState */

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/10 bg-white/50 px-6 py-14 text-center">
      {icon && <div className="mb-3 text-pounamu-500">{icon}</div>}
      <p className="font-display text-lg font-semibold text-ink">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-sm text-ink-faint">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/* --------------------------------------------------------------- SectionTitle */

export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-display text-lg font-semibold text-ink">{children}</h2>
      {action}
    </div>
  )
}

/* ------------------------------------------------------------------ Toggle */

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'focus-ring relative h-6 w-11 shrink-0 rounded-full transition-colors',
        checked ? 'bg-pounamu-600' : 'bg-sand-300',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}
