import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, Play, Search, MoreVertical, Flag, PauseCircle, FolderInput, Tag, RotateCcw, X, ChevronLeft, ChevronRight, Inbox, FolderPlus } from 'lucide-react'
import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'
import { api, findDeck, flattenDecks, type BulkAction, type CardSummary } from '@/lib/api'
import { useBulk, useCards, useDecks, useDeleteNote, useInvalidateAll } from '@/lib/queries'
import { Counts, Empty, PageHeader, StateBadge, stagger } from '@/components/common'
import { DeckSheet } from '@/components/deck-sheet'
import { Sheet } from '@/components/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const STATES = [
  ['', 'Todos'],
  ['NEW', 'Novos'],
  ['LEARNING', 'Aprendendo'],
  ['REVIEW', 'Revisão'],
  ['RELEARNING', 'Reaprendendo'],
] as const

function CardItem({ c, selected, onToggle, onEdit, onDelete }: { c: CardSummary; selected: boolean; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  return (
    <motion.li
      variants={stagger.item}
      layout
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        'list-none rounded-2xl border bg-surface-raised p-3 shadow-soft transition-colors duration-300',
        selected ? 'border-brand' : 'border-line',
        c.suspended && 'opacity-60',
      )}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          aria-pressed={selected}
          aria-label="Selecionar card"
          className="mt-0.5 grid size-11 shrink-0 place-items-center rounded-xl"
        >
          <span className={cn('grid size-6 place-items-center rounded-lg border-2 transition-all duration-200', selected ? 'scale-110 border-brand bg-brand text-on-brand' : 'border-line-strong')}>
            <motion.svg viewBox="0 0 20 20" className="size-4" initial={false}>
              <motion.path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" animate={{ pathLength: selected ? 1 : 0 }} transition={{ duration: 0.25 }} />
            </motion.svg>
          </span>
        </button>
        <div className="min-w-0 flex-1 py-1">
          <p className="line-clamp-3 whitespace-pre-wrap break-words font-semibold">{c.question || '(imagem)'}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-muted">
            <StateBadge state={c.state} />
            {c.suspended && <span className="inline-flex items-center gap-1"><PauseCircle className="size-3.5" />suspenso</span>}
            {c.flag > 0 && <span className="inline-flex items-center gap-1"><Flag className="size-3.5" fill="currentColor" />{c.flag}</span>}
            <span>{c.reps} revisões</span>
            {c.lapses > 0 && <span>{c.lapses} lapsos</span>}
            {c.tags.map((t) => (
              <span key={t} className="rounded-full bg-brand-soft px-2 py-0.5 text-brand-ink">#{t}</span>
            ))}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Ações" className="size-11 shrink-0 rounded-xl">
              <MoreVertical className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem onClick={onEdit}><Pencil className="size-4" /> Editar nota</DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-danger-ink"><Trash2 className="size-4" /> Excluir nota</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.li>
  )
}

export default function DeckPage() {
  const { id } = useParams()
  const deckId = Number(id)
  const nav = useNavigate()
  const { data: decks } = useDecks()
  const deck = decks ? findDeck(decks, deckId) : null
  const inv = useInvalidateAll()

  const [text, setText] = useState('')
  const [debounced, setDebounced] = useState('')
  const [state, setState] = useState('')
  const [page, setPage] = useState(0)
  const [sel, setSel] = useState<Set<number>>(new Set())
  const [renaming, setRenaming] = useState(false)
  const [newSub, setNewSub] = useState(false)
  const [bulkAct, setBulkAct] = useState<BulkAction | null>(null)

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(text.trim()); setPage(0) }, 300)
    return () => clearTimeout(t)
  }, [text])
  useEffect(() => { setSel(new Set()) }, [page, state, debounced, deckId])

  const { data, isLoading, isFetching } = useCards({ deckId, text: debounced, state, page, size: 20 })
  const bulk = useBulk()
  const delNote = useDeleteNote()
  const delDeck = useMutation({
    mutationFn: () => api('DELETE', `/decks/${deckId}`),
    onSuccess: () => { toast.success('Baralho excluído'); inv(); nav('/') },
    onError: (e: Error) => toast.error(e.message),
  })

  if (decks && !deck) return <Empty icon={<Inbox className="size-10" />} title="Baralho não encontrado" />

  const toggle = (cid: number) => setSel((s) => { const n = new Set(s); n.has(cid) ? n.delete(cid) : n.add(cid); return n })
  const ids = [...sel]
  const quick = (action: BulkAction) => bulk.mutate({ ids, action }, { onSuccess: () => setSel(new Set()) })

  return (
    <>
      <PageHeader
        back={<Link to="/" className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-ink-muted hover:text-ink"><ArrowLeft className="size-4" /> Baralhos</Link>}
        title={deck?.name ?? '…'}
        subtitle={deck && deck.fullName !== deck.name ? deck.fullName : undefined}
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" aria-label="Opções do baralho" className="size-11 rounded-xl"><MoreVertical className="size-5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem onClick={() => setRenaming(true)}><Pencil className="size-4" /> Renomear / mover</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setNewSub(true)}><FolderPlus className="size-4" /> Novo subbaralho</DropdownMenuItem>
                <DropdownMenuItem className="text-danger-ink" onClick={() => confirm('Excluir este baralho, os subbaralhos e TODOS os cards dentro deles?') && delDeck.mutate()}><Trash2 className="size-4" /> Excluir baralho</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => nav(`/study/${deckId}`)} className="h-11 rounded-xl px-5" disabled={!deck || deck.newCount + deck.learningCount + deck.reviewCount === 0}>
              <Play className="mr-1 size-4" fill="currentColor" /> Estudar
            </Button>
          </>
        }
      />

      {deck && (
        <div className="-mt-3 mb-5 flex flex-wrap items-center gap-2">
          <Counts n={deck.newCount} l={deck.learningCount} r={deck.reviewCount} size="lg" />
          {deck.children.map((c) => (
            <Link key={c.id} to={`/deck/${c.id}`} className="rounded-full border border-line bg-surface-raised px-3 py-1.5 text-sm font-semibold shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
              {c.name}
            </Link>
          ))}
        </div>
      )}

      <div className="sticky top-0 z-20 -mx-4 mb-4 bg-surface/85 px-4 py-3 backdrop-blur-xl md:-mx-2 md:px-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-muted" />
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Buscar na frente ou no verso" className="h-12 rounded-2xl pl-12" />
          {text && <button aria-label="Limpar" onClick={() => setText('')} className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-ink-muted hover:bg-brand-soft"><X className="size-4" /></button>}
        </div>
        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          {STATES.map(([v, l]) => (
            <button key={v} onClick={() => { setState(v); setPage(0) }} className={cn('relative h-9 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors', state === v ? 'text-on-brand' : 'text-ink-muted hover:text-ink')}>
              {state === v && <motion.span layoutId="state-chip" className="absolute inset-0 rounded-full bg-brand" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <span className="relative">{l}</span>
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : data && data.items.length > 0 ? (
        <motion.ul variants={stagger.container} initial="hidden" animate="show" className={cn('flex flex-col gap-3 p-0 transition-opacity', isFetching && 'opacity-60')}>
          <AnimatePresence initial={false}>
            {data.items.map((c) => (
              <CardItem key={c.id} c={c} selected={sel.has(c.id)} onToggle={() => toggle(c.id)} onEdit={() => nav(`/note/${c.noteId}`)} onDelete={() => confirm('Excluir esta nota e todos os seus cards?') && delNote.mutate(c.noteId)} />
            ))}
          </AnimatePresence>
        </motion.ul>
      ) : (
        <Empty icon={<Inbox className="size-10" />} title="Nenhum card encontrado" hint={debounced || state ? 'Tente limpar os filtros.' : 'Crie uma nota com o botão +.'} />
      )}

      {data && data.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <Button variant="secondary" size="icon" aria-label="Página anterior" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="size-11 rounded-xl"><ChevronLeft className="size-5" /></Button>
          <span className="text-sm text-ink-muted">{page + 1} / {data.totalPages} · {data.totalElements} cards</span>
          <Button variant="secondary" size="icon" aria-label="Próxima página" disabled={page + 1 >= data.totalPages} onClick={() => setPage((p) => p + 1)} className="size-11 rounded-xl"><ChevronRight className="size-5" /></Button>
        </div>
      )}

      {/* Barra de ações em lote */}
      <AnimatePresence>
        {sel.size > 0 && (
          <motion.div
            initial={{ y: 120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 120, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed inset-x-3 bottom-24 z-40 mx-auto max-w-xl rounded-2xl border border-line bg-surface-raised/95 p-2 shadow-lift backdrop-blur-xl md:bottom-6 md:left-[calc(16rem+1rem)] md:right-4"
          >
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              <span className="shrink-0 px-3 text-sm font-bold">{sel.size}</span>
              <Button variant="ghost" className="h-11 rounded-xl" onClick={() => quick('SUSPEND')}><PauseCircle className="mr-1 size-4" />Suspender</Button>
              <Button variant="ghost" className="h-11 rounded-xl" onClick={() => setBulkAct('MOVE')}><FolderInput className="mr-1 size-4" />Mover</Button>
              <Button variant="ghost" className="h-11 rounded-xl" onClick={() => setBulkAct('ADD_TAG')}><Tag className="mr-1 size-4" />Tag</Button>
              <Button variant="ghost" className="h-11 rounded-xl" onClick={() => setBulkAct('FLAG')}><Flag className="mr-1 size-4" />Flag</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Mais ações" className="size-11 shrink-0 rounded-xl"><MoreVertical className="size-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  <DropdownMenuItem onClick={() => quick('UNSUSPEND')}><PauseCircle className="size-4" /> Reativar</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setBulkAct('REMOVE_TAG')}><Tag className="size-4" /> Remover tag</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => confirm('Zerar o progresso dos cards selecionados?') && quick('RESET')}><RotateCcw className="size-4" /> Zerar progresso</DropdownMenuItem>
                  <DropdownMenuItem className="text-danger-ink" onClick={() => confirm(`Excluir ${sel.size} card(s)? Notas sem cards também são removidas.`) && quick('DELETE')}><Trash2 className="size-4" /> Excluir</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="icon" aria-label="Limpar seleção" className="ml-auto size-11 shrink-0 rounded-xl" onClick={() => setSel(new Set())}><X className="size-4" /></Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BulkSheet action={bulkAct} onClose={() => setBulkAct(null)} onApply={(extra) => { bulk.mutate({ ids, action: bulkAct!, ...extra }, { onSuccess: () => { setSel(new Set()); setBulkAct(null) } }) }} />
      <DeckSheet open={renaming} onOpenChange={setRenaming} editing={deck} />
      <DeckSheet open={newSub} onOpenChange={setNewSub} editing={null} presetParentId={deckId} />
    </>
  )
}

function BulkSheet({ action, onClose, onApply }: { action: BulkAction | null; onClose: () => void; onApply: (e: { deckId?: number; tag?: string; flag?: number }) => void }) {
  const { data: decks = [] } = useDecks()
  const [deckId, setDeckId] = useState('')
  const [tag, setTag] = useState('')
  const [flag, setFlag] = useState(1)
  useEffect(() => { setTag(''); setDeckId('') }, [action])
  const titles: Partial<Record<BulkAction, string>> = { MOVE: 'Mover para baralho', ADD_TAG: 'Adicionar tag', REMOVE_TAG: 'Remover tag', FLAG: 'Marcar com flag' }
  return (
    <Sheet open={!!action} onOpenChange={(o) => !o && onClose()} title={action ? (titles[action] ?? '') : ''}>
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); onApply(action === 'MOVE' ? { deckId: Number(deckId) } : action === 'FLAG' ? { flag } : { tag: tag.trim() }) }}>
        {action === 'MOVE' && (
          <select required value={deckId} onChange={(e) => setDeckId(e.target.value)} className="h-12 rounded-xl border border-line-strong bg-surface px-3">
            <option value="" disabled>Escolha…</option>
            {flattenDecks(decks).map((d) => <option key={d.node.id} value={d.node.id}>{'  '.repeat(d.depth)}{d.node.name}</option>)}
          </select>
        )}
        {(action === 'ADD_TAG' || action === 'REMOVE_TAG') && <Input autoFocus required value={tag} onChange={(e) => setTag(e.target.value)} placeholder="tag" maxLength={100} className="h-12 rounded-xl" />}
        {action === 'FLAG' && (
          <div className="flex flex-wrap gap-2">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((f) => (
              <button type="button" key={f} onClick={() => setFlag(f)} className={cn('size-12 rounded-xl border-2 font-bold transition', flag === f ? 'border-brand bg-brand text-on-brand' : 'border-line')}>{f === 0 ? '∅' : f}</button>
            ))}
          </div>
        )}
        <Button type="submit" size="lg" className="h-12 rounded-xl">Aplicar</Button>
      </form>
    </Sheet>
  )
}
