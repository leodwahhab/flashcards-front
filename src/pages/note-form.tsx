import { useEffect, useRef, useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, ImagePlus, Trash2, AlertCircle, FolderPlus, ArrowLeftRight, Type, Keyboard, Brackets } from 'lucide-react'
import { toast } from 'sonner'
import { api, apiForm, ApiError, flattenDecks, type NoteResponse, type NoteType } from '@/lib/api'
import { useDecks, useInvalidateAll, useNote } from '@/lib/queries'
import { MediaImage, PageHeader } from '@/components/common'
import { DeckSheet } from '@/components/deck-sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Spinner } from '@/components/spinner'
import { cn } from '@/lib/utils'

const TYPES: { v: NoteType; label: string; hint: string; icon: typeof Type }[] = [
  { v: 'BASIC', label: 'Básico', hint: 'Frente → verso', icon: Type },
  { v: 'BASIC_REVERSED', label: 'Invertido', hint: '2 cards: ida e volta', icon: ArrowLeftRight },
  { v: 'TYPE_IN', label: 'Digitar', hint: 'Você digita a resposta', icon: Keyboard },
  { v: 'CLOZE', label: 'Lacuna', hint: '{{c1::resposta}}', icon: Brackets },
]

export default function NoteFormPage() {
  const { noteId } = useParams()
  const editId = noteId ? Number(noteId) : null
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const inv = useInvalidateAll()
  const { data: decks = [] } = useDecks()
  const { data: note, isLoading } = useNote(editId)

  const [type, setType] = useState<NoteType>('BASIC')
  const [deckId, setDeckId] = useState('')
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [image, setImage] = useState('')
  const [tags, setTags] = useState('')
  const [allowDup, setAllowDup] = useState(false)
  const [error, setError] = useState('')
  const [deckOpen, setDeckOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const file = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editId && !deckId && decks.length) setDeckId(sp.get('deck') ?? String(decks[0].id))
  }, [editId, deckId, decks, sp])

  useEffect(() => {
    if (!note) return
    setType(note.noteType)
    setFront(note.front ?? '')
    setBack(note.back ?? '')
    setImage(note.imageUrl ?? '')
    setTags(note.tags.join(' '))
    setDeckId(String(note.cards[0]?.deckId ?? ''))
  }, [note])

  const back_ = () => (history.length > 1 ? nav(-1) : nav('/'))

  const retry = useRef<(b: boolean) => void>(() => {})
  const save = useMutation<NoteResponse, ApiError, boolean>({
    mutationFn: (allowDuplicate: boolean) => {
      const common = { front, back, imageUrl: image.trim(), tags: tags.trim().split(/\s+/).filter(Boolean), allowDuplicate }
      if (editId) return api<NoteResponse>('PATCH', `/notes/${editId}`, common)
      const body: Record<string, unknown> = { ...common, noteType: type, deckId: Number(deckId) }
      if (!common.imageUrl) delete body.imageUrl
      if (type === 'CLOZE' && !back.trim()) delete body.back
      return api<NoteResponse>('POST', '/notes', body)
    },
    onSuccess: () => {
      toast.success(editId ? 'Nota salva' : 'Nota criada')
      inv()
      back_()
    },
    onError: (e, allowed) => {
      if (e.status === 409 && e.body?.existingNoteId && !allowed) {
        if (confirm(`${e.body.detail ?? 'Nota duplicada'}\n\nSalvar mesmo assim?`)) return retry.current(true)
      }
      setError(e.message)
    },
  })

  retry.current = (b) => save.mutate(b)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!front.trim() && !image.trim()) return setError('Informe o texto da frente ou uma imagem.')
    if (type !== 'CLOZE' && !back.trim()) return setError('O verso é obrigatório.')
    if (type === 'CLOZE' && !/\{\{c\d+::/.test(front)) return setError('O texto precisa de ao menos uma lacuna, ex.: {{c1::resposta}}')
    save.mutate(allowDup)
  }

  const upload = async (f: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', f)
      const m = await apiForm<{ url: string }>('/media', fd)
      setImage(m.url)
    } catch (e) {
      setError((e as Error).message)
    }
    setUploading(false)
  }

  const cloze = type === 'CLOZE'
  if (editId && isLoading) return <div className="grid place-items-center py-24"><Spinner className="size-8" /></div>

  return (
    <>
      <PageHeader
        back={<button onClick={back_} className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-ink-muted hover:text-ink"><ArrowLeft className="size-4" /> Voltar</button>}
        title={editId ? 'Editar nota' : 'Nova nota'}
      />
      <form onSubmit={submit} className="flex flex-col gap-6">
        {/* Tipo */}
        <fieldset disabled={!!editId} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <legend className="sr-only">Tipo de nota</legend>
          {TYPES.map(({ v, label, hint, icon: Icon }) => (
            <button
              key={v}
              type="button"
              onClick={() => setType(v)}
              aria-pressed={type === v}
              className={cn('relative flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-all duration-300 disabled:cursor-not-allowed', type === v ? 'border-brand shadow-soft' : 'border-line text-ink-muted hover:-translate-y-0.5 hover:border-line-strong', editId && type !== v && 'opacity-40')}
            >
              {type === v && <motion.span layoutId="type-bg" className="absolute inset-0 -z-10 rounded-2xl bg-brand-soft" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <Icon className="size-5" />
              <span className="text-sm font-bold text-ink">{label}</span>
              <span className="text-xs leading-tight">{hint}</span>
            </button>
          ))}
        </fieldset>

        {/* Baralho */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="deck">Baralho</Label>
          <div className="flex gap-2">
            <select id="deck" value={deckId} disabled={!!editId} onChange={(e) => setDeckId(e.target.value)} required className="h-12 min-w-0 flex-1 rounded-xl border border-line-strong bg-surface px-3 text-base disabled:opacity-60">
              {flattenDecks(decks).map((d) => <option key={d.node.id} value={d.node.id}>{'  '.repeat(d.depth)}{d.node.name}</option>)}
            </select>
            {!editId && <Button type="button" variant="secondary" size="icon" aria-label="Novo baralho" onClick={() => setDeckOpen(true)} className="size-12 rounded-xl"><FolderPlus className="size-5" /></Button>}
          </div>
          {editId && <p className="text-xs text-ink-muted">Para mudar de baralho, selecione os cards e use “Mover”.</p>}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="front">{cloze ? 'Texto com lacunas' : 'Frente'}</Label>
          <Textarea id="front" value={front} onChange={(e) => setFront(e.target.value)} rows={4} maxLength={50000} className="min-h-28 rounded-xl text-base" />
          {cloze && <p className="text-xs text-ink-muted">Use <code className="rounded bg-brand-soft px-1">{'{{c1::resposta}}'}</code> ou <code className="rounded bg-brand-soft px-1">{'{{c1::resposta::dica}}'}</code>. Cada número gera um card.</p>}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="back">{cloze ? 'Extra (opcional)' : 'Verso'}</Label>
          <Textarea id="back" value={back} onChange={(e) => setBack(e.target.value)} rows={3} maxLength={50000} className="min-h-24 rounded-xl text-base" />
        </div>

        {/* Imagem */}
        <div className="flex flex-col gap-2">
          <Label>Imagem</Label>
          <AnimatePresence initial={false} mode="wait">
            {image ? (
              <motion.div key="img" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3 rounded-2xl border border-line bg-surface-raised p-3">
                <MediaImage url={image} className="h-24 w-32 shrink-0 object-cover" />
                <span className="min-w-0 flex-1 truncate text-sm text-ink-muted">{image}</span>
                <Button type="button" variant="ghost" size="icon" aria-label="Remover imagem" onClick={() => setImage('')} className="size-11 rounded-xl"><Trash2 className="size-5" /></Button>
              </motion.div>
            ) : (
              <motion.div key="drop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => file.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) upload(f) }}
                  className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-strong text-sm font-semibold text-ink-muted transition-colors hover:border-brand hover:bg-brand-soft hover:text-ink"
                >
                  {uploading ? <Spinner className="size-5" /> : <ImagePlus className="size-5" />} {uploading ? 'Enviando…' : 'Enviar ou arrastar imagem'}
                </button>
                <Input placeholder="ou cole uma URL" onBlur={(e) => e.target.value.trim() && setImage(e.target.value.trim())} className="h-14 rounded-2xl sm:max-w-[16rem]" />
              </motion.div>
            )}
          </AnimatePresence>
          <input ref={file} type="file" hidden accept="image/png,image/jpeg,image/gif,image/webp" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="tags">Tags</Label>
          <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="separadas por espaço" className="h-12 rounded-xl" />
        </div>

        <label className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface-raised p-4">
          <span>
            <span className="block font-semibold">Permitir duplicada</span>
            <span className="text-sm text-ink-muted">Salva mesmo se já existir uma nota com a mesma frente.</span>
          </span>
          <Switch checked={allowDup} onCheckedChange={setAllowDup} />
        </label>

        <AnimatePresence>
          {error && (
            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} role="alert" className="flex items-start gap-2 overflow-hidden rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger-ink">
              <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="sticky bottom-24 z-10 flex gap-2 rounded-2xl border border-line bg-surface-raised/90 p-2 shadow-lift backdrop-blur-xl md:static md:border-0 md:bg-transparent md:p-0 md:shadow-none">
          <Button type="button" variant="secondary" size="lg" onClick={back_} className="h-12 rounded-xl">Cancelar</Button>
          <Button type="submit" size="lg" disabled={save.isPending} className="h-12 flex-1 rounded-xl shadow-lift">
            {save.isPending ? <Spinner className="size-5" /> : 'Salvar'}
          </Button>
        </div>
      </form>
      <DeckSheet open={deckOpen} onOpenChange={setDeckOpen} editing={null} onSaved={(d) => setDeckId(String(d.id))} />
    </>
  )
}
