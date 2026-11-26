import { motion } from 'motion/react'
import { Flame, Layers, Gauge, RotateCcw, CalendarCheck, Target, Timer, Trophy } from 'lucide-react'
import { useForecast, useHeatmap, useOverview, useRetention, useStreak, useToday } from '@/lib/queries'
import { PageHeader, stagger } from '@/components/common'
import { RollingNumber } from '@/components/ui/rolling-number'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

function Tile({ icon, label, value, suffix = '' }: { icon: ReactNode; label: string; value: number | undefined; suffix?: string }) {
  return (
    <motion.div variants={stagger.item} whileHover={{ y: -4 }} className="rounded-2xl border border-line bg-surface-raised p-4 shadow-soft transition-shadow hover:shadow-lift">
      <div className="mb-3 grid size-9 place-items-center rounded-xl bg-brand-soft text-brand-ink">{icon}</div>
      <p className="text-3xl font-extrabold tracking-tight tabular-nums">
        {value === undefined ? <Skeleton className="h-8 w-16" /> : <><RollingNumber value={value} />{suffix}</>}
      </p>
      <p className="text-sm text-ink-muted">{label}</p>
    </motion.div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} className="mt-8">
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      {children}
    </motion.section>
  )
}

export default function StatsPage() {
  const { data: t } = useToday()
  const { data: o } = useOverview()
  const { data: s } = useStreak()
  const { data: f } = useForecast(14)
  const { data: r } = useRetention(30)
  const { data: h } = useHeatmap()

  const maxDue = Math.max(1, ...(f?.items.map((i) => i.due) ?? [1]))
  const heat = new Map(h?.items.map((i) => [i.date, i.count]))
  const days: { date: string; count: number }[] = []
  if (h) {
    const end = new Date(h.to + 'T12:00:00')
    for (let i = 111; i >= 0; i--) {
      const d = new Date(end)
      d.setDate(d.getDate() - i)
      const k = d.toISOString().slice(0, 10)
      days.push({ date: k, count: heat.get(k) ?? 0 })
    }
  }

  return (
    <>
      <PageHeader title="Estatísticas" subtitle="Seu ritmo de estudo" />
      <motion.div variants={stagger.container} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile icon={<Flame className="size-5" />} label="Dias seguidos" value={s?.currentStreak} />
        <Tile icon={<Trophy className="size-5" />} label="Maior sequência" value={s?.longestStreak} />
        <Tile icon={<CalendarCheck className="size-5" />} label="Revisões hoje" value={t?.reviews} />
        <Tile icon={<Target className="size-5" />} label="Acerto hoje" value={t ? Math.round(t.accuracyPercent) : undefined} suffix="%" />
        <Tile icon={<Layers className="size-5" />} label="Cards" value={o?.totalCards} />
        <Tile icon={<Gauge className="size-5" />} label="Maduros" value={o?.mature} />
        <Tile icon={<RotateCcw className="size-5" />} label="Lapsos" value={o?.totalLapses} />
        <Tile icon={<Timer className="size-5" />} label="Tempo hoje (min)" value={t ? Math.round(t.timeMs / 60000) : undefined} />
      </motion.div>

      <Section title="Próximos 14 dias">
        <div className="flex h-44 items-end gap-1.5 rounded-2xl border border-line bg-surface-raised p-4 shadow-soft">
          {f?.items.map((i, idx) => (
            <div key={i.date} className="group flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${i.date}: ${i.due}`}>
              <span className="text-[10px] font-bold tabular-nums opacity-0 transition-opacity group-hover:opacity-100">{i.due}</span>
              <motion.div initial={{ height: 0 }} whileInView={{ height: `${Math.max(3, (i.due / maxDue) * 100)}%` }} viewport={{ once: true }} transition={{ delay: idx * 0.03, type: 'spring', stiffness: 120, damping: 18 }} className="w-full rounded-t-md bg-brand" style={{ opacity: i.due ? 1 : 0.25 }} />
              <span className="text-[10px] text-ink-muted">{i.date.slice(8)}</span>
            </div>
          )) ?? <Skeleton className="h-full w-full" />}
        </div>
      </Section>

      <Section title="Retenção (30 dias)">
        <div className="rounded-2xl border border-line bg-surface-raised p-5 shadow-soft">
          {r ? r.matureReviews === 0 ? (
            <p className="text-ink-muted">Sem revisões de cards maduros no período.</p>
          ) : (
            <>
              <p className="text-4xl font-extrabold tabular-nums"><RollingNumber value={r.retentionPercent} precision={1} />%</p>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-brand-soft">
                <motion.div initial={{ width: 0 }} animate={{ width: `${r.retentionPercent}%` }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} className="h-full rounded-full bg-success-ink" />
              </div>
              <p className="mt-2 text-sm text-ink-muted">{r.passed} de {r.matureReviews} revisões de cards maduros</p>
            </>
          ) : <Skeleton className="h-20" />}
        </div>
      </Section>

      <Section title="Atividade">
        <div className="no-scrollbar overflow-x-auto rounded-2xl border border-line bg-surface-raised p-4 shadow-soft">
          <div className="grid w-max grid-flow-col grid-rows-7 gap-1">
            {days.map((d, i) => {
              const lv = d.count === 0 ? 0 : Math.min(4, Math.ceil((d.count / Math.max(1, h?.maxCount ?? 1)) * 4))
              return (
                <motion.span key={d.date} title={`${d.date}: ${d.count}`} initial={{ opacity: 0, scale: 0 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.004 }}
                  className={cn('size-4 rounded-[5px]', lv === 0 ? 'bg-brand-soft' : 'bg-brand')} style={lv ? { opacity: 0.25 + lv * 0.19 } : undefined} />
              )
            })}
          </div>
          {h && <p className="mt-3 text-sm text-ink-muted">{h.activeDays} dias ativos · {h.totalReviews} revisões</p>}
        </div>
      </Section>
    </>
  )
}
