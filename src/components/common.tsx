import { useEffect, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { ImageOff } from 'lucide-react'
import { mediaSrc, type CardState } from '@/lib/api'
import { RollingNumber } from '@/components/ui/rolling-number'
import { cn } from '@/lib/utils'

export function MediaImage({ url, className, alt = '' }: { url: string | null | undefined; className?: string; alt?: string }) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let live = true
    setFailed(false)
    setSrc(null)
    mediaSrc(url).then((s) => {
      if (!live) return
      if (s) setSrc(s)
      else setFailed(true)
    })
    return () => {
      live = false
    }
  }, [url])
  if (!url) return null
  if (failed)
    return (
      <div className={cn('grid place-items-center rounded-xl bg-surface-soft text-ink-muted', className)}>
        <ImageOff className="size-5" />
      </div>
    )
  if (!src) return <div className={cn('animate-pulse rounded-xl bg-surface-soft', className)} />
  return (
    <motion.img
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      src={src}
      alt={alt}
      className={cn('rounded-xl object-contain', className)}
    />
  )
}

/** Três contadores do Anki: novos, aprendendo, revisão. */
export function Counts({ n, l, r, size = 'sm' }: { n: number; l: number; r: number; size?: 'sm' | 'lg' }) {
  const cls = size === 'lg' ? 'min-w-9 text-base' : 'min-w-7 text-sm'
  return (
    <span className={cn('inline-flex items-center gap-1 font-bold tabular-nums')}>
      <span title="Novos" className={cn('text-center text-info-ink', cls)}>
        <RollingNumber value={n} />
      </span>
      <span title="Aprendendo" className={cn('text-center text-warn-ink', cls)}>
        <RollingNumber value={l} />
      </span>
      <span title="Revisão" className={cn('text-center text-success-ink', cls)}>
        <RollingNumber value={r} />
      </span>
    </span>
  )
}

const STATE: Record<CardState, { label: string; cls: string }> = {
  NEW: { label: 'Novo', cls: 'bg-info-soft text-info-ink' },
  LEARNING: { label: 'Aprendendo', cls: 'bg-warn-soft text-warn-ink' },
  REVIEW: { label: 'Revisão', cls: 'bg-success-soft text-success-ink' },
  RELEARNING: { label: 'Reaprendendo', cls: 'bg-danger-soft text-danger-ink' },
}
export function StateBadge({ state }: { state: CardState }) {
  const s = STATE[state]
  return <span className={cn('inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', s.cls)}>{s.label}</span>
}

export function PageHeader({ title, subtitle, actions, back }: { title: string; subtitle?: string; actions?: ReactNode; back?: ReactNode }) {
  return (
    <header className="mb-6 flex items-end justify-between gap-3">
      <div className="min-w-0">
        {back}
        {subtitle && <p className="truncate text-sm font-medium text-ink-muted">{subtitle}</p>}
        <h1 className="truncate text-3xl font-extrabold tracking-tight md:text-4xl">{title}</h1>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}

export function Empty({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line px-6 py-12 text-center text-ink-muted"
    >
      <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut' }} className="text-ink">
        {icon}
      </motion.div>
      <p className="font-semibold text-ink">{title}</p>
      {hint && <p className="text-sm">{hint}</p>}
    </motion.div>
  )
}

export const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.05 } } },
  item: { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } } },
}
