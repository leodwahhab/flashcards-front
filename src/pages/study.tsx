import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useNavigate, useParams } from 'react-router-dom'
import { X, Undo2, Trophy, Check, XCircle, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { api, ApiError, type AnswerResponse, type QueueCard, type QueueResponse, type Rating } from '@/lib/api'
import { MediaImage } from '@/components/common'
import { PopButton } from '@/components/pop-button'
import { WordsStagger } from '@/components/words-stagger'
import { RollingNumber } from '@/components/ui/rolling-number'
import { Spinner } from '@/components/spinner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const RATINGS: { r: Rating; key: '1' | '2' | '3' | '4'; label: string; k: 'again' | 'hard' | 'good' | 'easy'; cls: string }[] = [
  { r: 'AGAIN', key: '1', label: 'Errei', k: 'again', cls: 'border-danger-ink/50 bg-danger-soft text-danger-ink hover:bg-danger-soft/70 dark:border-danger-ink/60' },
  { r: 'HARD', key: '2', label: 'Difícil', k: 'hard', cls: 'border-warn-ink/50 bg-warn-soft text-warn-ink hover:bg-warn-soft/70 dark:border-warn-ink/60' },
  { r: 'GOOD', key: '3', label: 'Bom', k: 'good', cls: 'border-success-ink/50 bg-success-soft text-success-ink hover:bg-success-soft/70 dark:border-success-ink/60' },
  { r: 'EASY', key: '4', label: 'Fácil', k: 'easy', cls: 'border-info-ink/50 bg-info-soft text-info-ink hover:bg-info-soft/70 dark:border-info-ink/60' },
]

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

export default function StudyPage() {
  const { deckId: p } = useParams()
  const deckId = p ? Number(p) : null
  const nav = useNavigate()
  const qc = useQueryClient()

  const [queue, setQueue] = useState<QueueCard[] | null>(null)
  const [counts, setCounts] = useState({ n: 0, l: 0, r: 0 })
  const [flipped, setFlipped] = useState(false)
  const [typed, setTyped] = useState('')
  const [answered, setAnswered] = useState(0)
  const [again, setAgain] = useState(0)
  const [busy, setBusy] = useState(false)
  const [dir, setDir] = useState(1)
  const shownAt = useRef(Date.now())

  const load = useCallback(async () => {
    try {
      const res = await api<QueueResponse>('GET', `/study/queue?limit=50${deckId ? `&deckId=${deckId}` : ''}`)
      setQueue(res.cards)
      setCounts({ n: res.counts.newCount, l: res.counts.learningCount, r: res.counts.reviewCount })
      return res.cards
    } catch (e) {
      toast.error((e as Error).message)
      nav(deckId ? `/deck/${deckId}` : '/')
      return []
    }
  }, [deckId, nav])

  useEffect(() => {
    load()
    return () => {
      qc.invalidateQueries({ queryKey: ['decks'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    }
  }, [load, qc])

  const card = queue?.[0]
  useEffect(() => {
    setFlipped(false)
    setTyped('')
    shownAt.current = Date.now()
  }, [card?.cardId, card?.version])

  const rate = useCallback(
    async (rating: Rating) => {
      if (!card || !flipped || busy) return
      setBusy(true)
      setDir(1)
      try {
        const r = await api<AnswerResponse>('POST', `/study/cards/${card.cardId}/answer`, {
          rating,
          timeMs: Math.min(600000, Math.max(0, Date.now() - shownAt.current)),
          version: card.version,
        })
        setAnswered((a) => a + 1)
        if (rating === 'AGAIN') setAgain((a) => a + 1)
        if (r.leech) toast.warning('Este card falhou muitas vezes (leech) e foi suspenso.')
      } catch (e) {
        toast.error(e instanceof ApiError && e.status === 409 ? 'Este card mudou em outro lugar. Fila atualizada.' : (e as Error).message)
      }
      await load()
      setBusy(false)
    },
    [card, flipped, busy, load],
  )

  const undo = useCallback(async () => {
    if (busy) return
    setBusy(true)
    setDir(-1)
    try {
      const restored = await api<QueueCard>('POST', '/study/undo')
      const cards = await load()
      setQueue([restored, ...cards.filter((c) => c.cardId !== restored.cardId)])
      setAnswered((a) => Math.max(0, a - 1))
    } catch (e) {
      toast.error(e instanceof ApiError && e.status === 404 ? 'Nada para desfazer.' : (e as Error).message)
    }
    setBusy(false)
  }, [busy, load])

  // Atalhos: espaço revela, 1-4 avalia, Z desfaz.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && e.key !== 'Enter')) return
      if ((e.key === ' ' || e.key === 'Enter') && !flipped && card) {
        e.preventDefault()
        setFlipped(true)
        ;(document.activeElement as HTMLElement | null)?.blur()
      } else if (flipped) {
        const m = RATINGS.find((x) => x.key === e.key)
        if (m) rate(m.r)
      }
      if (e.key.toLowerCase() === 'z' && !e.metaKey && !e.ctrlKey) undo()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [flipped, card, rate, undo])

  const remaining = counts.n + counts.l + counts.r
  const progress = answered + remaining === 0 ? 1 : answered / (answered + remaining)
  const done = queue !== null && queue.length === 0
  const typedOk = card?.noteType === 'TYPE_IN' && typed.trim() ? norm(typed) === norm(card.answer) : null

  return (
    <motion.div
      className="aura relative flex min-h-dvh flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Topo: fechar, progresso, desfazer */}
      <header className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <Button variant="ghost" size="icon" aria-label="Sair do estudo" onClick={() => nav(deckId ? `/deck/${deckId}` : '/')} className="size-11 shrink-0 rounded-xl">
          <X className="size-6" />
        </Button>
        <div className="relative h-3.5 flex-1 overflow-hidden rounded-full bg-brand-soft" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <motion.div className="absolute inset-y-0 left-0 rounded-full bg-brand" animate={{ width: `${Math.max(progress * 100, 4)}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
          <motion.div className="absolute inset-x-2 top-[3px] h-1 rounded-full bg-on-brand/25" animate={{ width: `calc(${Math.max(progress * 100, 4)}% - 1rem)` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
        </div>
        <Button variant="ghost" size="icon" aria-label="Desfazer (Z)" onClick={undo} disabled={busy || answered === 0} className="size-11 shrink-0 rounded-xl">
          <Undo2 className="size-5" />
        </Button>
      </header>

      <div className="mx-auto flex w-full max-w-2xl items-center justify-center gap-6 px-4 py-2 text-sm font-bold tabular-nums">
        <span className="text-info-ink" title="Novos"><RollingNumber value={counts.n} /> <span className="font-medium opacity-70">novos</span></span>
        <span className="text-warn-ink" title="Aprendendo"><RollingNumber value={counts.l} /> <span className="font-medium opacity-70">aprendendo</span></span>
        <span className="text-success-ink" title="Revisão"><RollingNumber value={counts.r} /> <span className="font-medium opacity-70">revisão</span></span>
      </div>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-4">
        {queue === null && (
          <div className="grid flex-1 place-items-center"><Spinner className="size-8" /></div>
        )}

        {done && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 12, delay: 0.1 }}
              className="relative grid size-28 place-items-center rounded-full bg-brand-soft"
            >
              <Trophy className="size-14" />
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <motion.span
                  key={i}
                  className="absolute"
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                  animate={{ opacity: [0, 1, 0], x: Math.cos((i / 6) * Math.PI * 2) * 78, y: Math.sin((i / 6) * Math.PI * 2) * 78, scale: [0, 1, 0.6] }}
                  transition={{ duration: 1.2, delay: 0.4 + i * 0.05 }}
                >
                  <Sparkles className="size-5 text-warn-ink" />
                </motion.span>
              ))}
            </motion.div>
            <h2 className="text-3xl font-extrabold tracking-tight">
              <WordsStagger delay={0.3}>{answered > 0 ? 'Sessão concluída' : 'Nada pendente por agora'}</WordsStagger>
            </h2>
            {answered > 0 && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="text-ink-muted">
                {answered} revisões · {Math.round(((answered - again) / answered) * 100)}% de acerto
              </motion.p>
            )}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }}>
              <PopButton size="lg" onClick={() => nav(deckId ? `/deck/${deckId}` : '/')} className="mt-4 border-brand-strong bg-brand px-10 text-on-brand hover:bg-brand-strong dark:border-neutral-400 dark:bg-brand dark:text-on-brand dark:hover:bg-brand-strong">
                Continuar
              </PopButton>
            </motion.div>
          </motion.div>
        )}

        {card && (
          <div className="flex flex-1 flex-col justify-center py-4" style={{ perspective: 1400 }}>
            <AnimatePresence mode="wait" custom={dir} initial={false}>
              <motion.div
                key={`${card.cardId}-${card.version}`}
                custom={dir}
                variants={{
                  enter: (d: number) => ({ opacity: 0, x: 60 * d, rotate: 2 * d }),
                  center: { opacity: 1, x: 0, rotate: 0 },
                  exit: (d: number) => ({ opacity: 0, x: -60 * d, rotate: -2 * d }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                <motion.div
                  onClick={() => !flipped && setFlipped(true)}
                  animate={{ rotateY: flipped ? 180 : 0 }}
                  transition={{ type: 'spring', stiffness: 160, damping: 20 }}
                  style={{ transformStyle: 'preserve-3d' }}
                  className="relative min-h-[320px] w-full cursor-pointer md:min-h-[380px]"
                >
                  {/* Frente */}
                  <div style={{ backfaceVisibility: 'hidden' }} className="absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-y-auto rounded-3xl border border-line bg-surface-raised p-6 text-center shadow-lift">
                    <MediaImage url={card.imageUrl} className="max-h-48 w-auto" />
                    <p className="whitespace-pre-wrap break-words text-2xl font-bold leading-snug md:text-3xl">{card.question}</p>
                    {card.noteType === 'TYPE_IN' && !flipped && (
                      <input
                        autoFocus
                        value={typed}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setTyped(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), setFlipped(true))}
                        placeholder="Digite a resposta e pressione Enter"
                        autoComplete="off"
                        className="mt-2 h-12 w-full max-w-sm rounded-xl border border-line-strong bg-surface px-4 text-center text-lg"
                      />
                    )}
                    {!flipped && card.noteType !== 'TYPE_IN' && <p className="absolute bottom-4 text-xs font-medium text-ink-muted">toque para virar</p>}
                  </div>
                  {/* Verso */}
                  <div style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }} className="absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-y-auto rounded-3xl border border-line-strong/40 bg-brand-soft p-6 text-center shadow-lift">
                    <p className="whitespace-pre-wrap break-words text-2xl font-bold leading-snug md:text-3xl">{card.answer}</p>
                    {typedOk !== null && (
                      <p className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold', typedOk ? 'bg-success-soft text-success-ink' : 'bg-danger-soft text-danger-ink')}>
                        {typedOk ? <Check className="size-4" /> : <XCircle className="size-4" />}
                        {typedOk ? 'Correto' : `Você digitou: ${typed}`}
                      </p>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Doca inferior */}
      {card && (
        <footer className="sticky bottom-0 border-t border-line bg-surface/85 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl">
          <div className="mx-auto w-full max-w-2xl px-4">
            <AnimatePresence mode="wait" initial={false}>
              {!flipped ? (
                <motion.div key="show" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}>
                  <PopButton size="lg" onClick={() => setFlipped(true)} className="h-14 w-full border-brand-strong bg-brand text-base text-on-brand hover:bg-brand-strong dark:border-neutral-400 dark:bg-brand dark:text-on-brand dark:hover:bg-brand-strong">
                    Mostrar resposta
                    <kbd className="ml-3 hidden rounded-md bg-on-brand/15 px-1.5 py-0.5 text-xs md:inline">espaço</kbd>
                  </PopButton>
                </motion.div>
              ) : (
                <motion.div key="rate" className="grid grid-cols-4 gap-2" initial="hidden" animate="show" exit={{ opacity: 0, y: 16 }} variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}>
                  {RATINGS.map((x) => (
                    <motion.div key={x.r} variants={{ hidden: { opacity: 0, y: 20, scale: 0.9 }, show: { opacity: 1, y: 0, scale: 1 } }}>
                      <PopButton onClick={() => rate(x.r)} disabled={busy} aria-label={`${x.label}, ${card.intervals[x.k].label}`} className={cn('h-auto w-full flex-col gap-0.5 px-1 py-2.5', x.cls)}>
                        <span className="text-sm font-bold md:text-base">{x.label}</span>
                        <span className="text-[11px] font-semibold opacity-80">{card.intervals[x.k].label}</span>
                        <kbd className="hidden text-[10px] opacity-60 md:block">{x.key}</kbd>
                      </PopButton>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </footer>
      )}
    </motion.div>
  )
}
