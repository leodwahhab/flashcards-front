import { useState } from 'react'
import { motion } from 'motion/react'
import { Link, useNavigate } from 'react-router-dom'
import { Flame, FolderPlus, Play, ChevronRight, Layers, Target } from 'lucide-react'
import { useDecks, useStreak, useToday } from '@/lib/queries'
import { flattenDecks, type DeckNode } from '@/lib/api'
import { Counts, Empty, PageHeader, stagger } from '@/components/common'
import { DeckSheet } from '@/components/deck-sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { RollingNumber } from '@/components/ui/rolling-number'
import { ShimmerText } from '@/components/shimmer-text'
import { Button } from '@/components/ui/button'

function greeting() {
  const h = new Date().getHours()
  return h < 5 ? 'Boa madrugada' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

function DeckRow({ node, depth }: { node: DeckNode; depth: number }) {
  const nav = useNavigate()
  const due = node.newCount + node.learningCount + node.reviewCount
  return (
    <motion.li variants={stagger.item} layout className="list-none">
      <div
        className="group flex items-center gap-2 rounded-2xl border border-line bg-surface-raised p-2 pr-2 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:shadow-lift"
        style={{ marginLeft: Math.min(depth, 4) * 14 }}
      >
        <Link to={`/deck/${node.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
            <Layers className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{node.name}</span>
            <Counts n={node.newCount} l={node.learningCount} r={node.reviewCount} />
          </span>
          <ChevronRight className="size-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-1" />
        </Link>
        <Button
          size="icon"
          variant={due > 0 ? 'default' : 'secondary'}
          aria-label={`Estudar ${node.name}`}
          disabled={due === 0}
          onClick={() => nav(`/study/${node.id}`)}
          className="size-12 shrink-0 rounded-xl transition-transform active:scale-90"
        >
          <Play className="size-5" fill="currentColor" />
        </Button>
      </div>
    </motion.li>
  )
}

export default function HomePage() {
  const { data: decks, isLoading, error } = useDecks()
  const { data: today } = useToday()
  const { data: streak } = useStreak()
  const [open, setOpen] = useState(false)
  const nav = useNavigate()

  const total = (decks ?? []).reduce((s, d) => s + d.newCount + d.learningCount + d.reviewCount, 0)

  return (
    <>
      <PageHeader title="Seus baralhos" subtitle={greeting()} actions={
        <Button variant="secondary" size="icon" aria-label="Novo baralho" onClick={() => setOpen(true)} className="size-11 rounded-xl">
          <FolderPlus className="size-5" />
        </Button>
      } />

      {/* Hero: estudar tudo */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-8 overflow-hidden rounded-3xl border border-line bg-surface-raised p-6 shadow-soft"
      >
        <motion.div
          aria-hidden
          className="absolute -right-10 -top-10 size-44 rounded-full bg-brand-soft"
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut' }}
        />
        <div className="relative">
          <p className="text-sm font-medium text-ink-muted">Pendentes hoje</p>
          <p className="mt-1 text-6xl font-extrabold tracking-tight tabular-nums">
            <RollingNumber value={total} />
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <Flame className="size-4 text-warn-ink" /> <b className="text-ink">{streak?.currentStreak ?? 0}</b> dias seguidos
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Target className="size-4 text-success-ink" />
              {today && today.reviews > 0 ? (
                <>
                  <b className="text-ink">{today.reviews}</b> revisões · {Math.round(today.accuracyPercent)}% de acerto
                </>
              ) : (
                'Nenhuma revisão hoje ainda'
              )}
            </span>
          </div>
          <Button
            size="lg"
            disabled={total === 0}
            onClick={() => nav('/study')}
            className="mt-6 h-12 w-full rounded-xl text-base transition-transform active:scale-[.98] sm:w-auto"
          >
            <Play className="mr-1 size-5" fill="currentColor" />
            {total === 0 ? <ShimmerText>Tudo em dia</ShimmerText> : 'Estudar tudo'}
          </Button>
        </div>
      </motion.section>

      {error && <p className="rounded-xl bg-danger-soft p-3 text-sm text-danger-ink">{(error as Error).message}</p>}

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[76px] rounded-2xl" />
          ))}
        </div>
      ) : decks && decks.length > 0 ? (
        <motion.ul variants={stagger.container} initial="hidden" animate="show" className="flex flex-col gap-3 p-0">
          {flattenDecks(decks).map(({ node, depth }) => (
            <DeckRow key={node.id} node={node} depth={depth} />
          ))}
        </motion.ul>
      ) : (
        <Empty icon={<Layers className="size-10" />} title="Nenhum baralho ainda" hint="Crie o primeiro no botão acima." />
      )}

      <DeckSheet open={open} onOpenChange={setOpen} editing={null} />
    </>
  )
}
