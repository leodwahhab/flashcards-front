import { useRef, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { useMutation } from '@tanstack/react-query'
import { Download, Upload, KeyRound, Trash2, FileJson, FileSpreadsheet, Sun, Moon } from 'lucide-react'
import { toast } from 'sonner'
import { api, apiForm, apiRawJson, ApiError, download, flattenDecks } from '@/lib/api'
import { useApp } from '@/lib/app-context'
import { useDecks, useInvalidateAll } from '@/lib/queries'
import { PageHeader, stagger } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Sheet } from '@/components/sheet'

function Card({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <motion.section variants={stagger.item} className="rounded-2xl border border-line bg-surface-raised p-5 shadow-soft">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand-ink">{icon}</span>{title}</h2>
      {children}
    </motion.section>
  )
}

export default function SettingsPage() {
  const { logout, dark, toggleTheme } = useApp()
  const { data: decks = [] } = useDecks()
  const inv = useInvalidateAll()

  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const [csvDeck, setCsvDeck] = useState('')
  const [skip, setSkip] = useState(false)
  const [delOpen, setDelOpen] = useState(false)
  const [delPw, setDelPw] = useState('')
  const csv = useRef<HTMLInputElement>(null)
  const bak = useRef<HTMLInputElement>(null)

  const changePw = useMutation({
    mutationFn: () => api('POST', '/auth/change-password', { currentPassword: cur, newPassword: next }),
    onSuccess: () => { toast.success('Senha alterada'); setCur(''); setNext('') },
    onError: (e: ApiError) => toast.error(e.message),
  })
  const delAccount = useMutation({
    mutationFn: () => api('DELETE', '/account', { password: delPw }),
    onSuccess: () => logout(),
    onError: (e: ApiError) => toast.error(e.message),
  })
  const importCsv = useMutation({
    mutationFn: (f: File) => {
      const fd = new FormData()
      fd.append('file', f)
      if (csvDeck) fd.append('deckId', csvDeck)
      if (skip) fd.append('skipInvalid', 'true')
      return apiForm<{ imported: number; cardsCreated: number; decksCreated: number; skippedDuplicates: number; errors: { row: number; message: string }[] }>('/import/csv', fd)
    },
    onSuccess: (r) => {
      toast.success(`${r.imported} notas, ${r.cardsCreated} cards, ${r.decksCreated} baralhos criados${r.skippedDuplicates ? ` · ${r.skippedDuplicates} duplicadas ignoradas` : ''}`)
      if (r.errors?.length) toast.warning(`Linhas ignoradas: ${r.errors.map((e) => e.row).join(', ')}`)
      inv()
    },
    onError: (e: ApiError) => toast.error(e.message),
  })
  const importBackup = useMutation({
    mutationFn: async (f: File) => apiRawJson<{ decks: number; notes: number; cards: number; reviewLogs: number }>('/import/backup', await f.text()),
    onSuccess: (r) => { toast.success(`Restaurado: ${r.decks} baralhos, ${r.notes} notas, ${r.cards} cards`); inv() },
    onError: (e: ApiError) => toast.error(e.status === 409 ? 'A conta já tem notas/cards; o backup só restaura em conta vazia.' : e.message),
  })
  const exp = (path: string, name: string) => download(path, name).catch((e: Error) => toast.error(e.message))

  return (
    <>
      <PageHeader title="Conta e dados" subtitle="Preferências" />
      <motion.div variants={stagger.container} initial="hidden" animate="show" className="flex flex-col gap-4">
        <Card icon={dark ? <Moon className="size-5" /> : <Sun className="size-5" />} title="Aparência">
          <label className="flex items-center justify-between gap-3">
            <span><span className="block font-semibold">Tema escuro</span><span className="text-sm text-ink-muted">Mais confortável para sessões longas.</span></span>
            <Switch checked={dark} onCheckedChange={toggleTheme} />
          </label>
        </Card>

        <Card icon={<KeyRound className="size-5" />} title="Alterar senha">
          <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (next.length < 8 || next.length > 72) return toast.error('A nova senha deve ter de 8 a 72 caracteres.'); changePw.mutate() }}>
            <Input type="password" autoComplete="current-password" placeholder="Senha atual" value={cur} onChange={(e) => setCur(e.target.value)} required className="h-12 rounded-xl" />
            <Input type="password" autoComplete="new-password" placeholder="Nova senha (8 a 72)" value={next} onChange={(e) => setNext(e.target.value)} required className="h-12 rounded-xl" />
            <Button disabled={changePw.isPending} className="h-12 rounded-xl">Alterar senha</Button>
          </form>
        </Card>

        <Card icon={<Download className="size-5" />} title="Exportar">
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="secondary" className="h-12 justify-start rounded-xl" onClick={() => exp('/export/csv', 'flashcards.csv')}><FileSpreadsheet className="mr-2 size-5" />Exportar CSV</Button>
            <Button variant="secondary" className="h-12 justify-start rounded-xl" onClick={() => exp('/export/backup', 'flashcards-backup.json')}><FileJson className="mr-2 size-5" />Backup (JSON)</Button>
          </div>
        </Card>

        <Card icon={<Upload className="size-5" />} title="Importar">
          <p className="mb-3 text-sm text-ink-muted">CSV com colunas <code className="rounded bg-brand-soft px-1">front, back, tags, deck, noteType, imageUrl</code>.</p>
          <div className="flex flex-col gap-3">
            <select value={csvDeck} onChange={(e) => setCsvDeck(e.target.value)} className="h-12 rounded-xl border border-line-strong bg-surface px-3">
              <option value="">Baralho padrão</option>
              {flattenDecks(decks).map((d) => <option key={d.node.id} value={d.node.id}>{'  '.repeat(d.depth)}{d.node.name}</option>)}
            </select>
            <label className="flex items-center justify-between gap-3 text-sm font-medium">Ignorar linhas inválidas <Switch checked={skip} onCheckedChange={setSkip} /></label>
            <Button variant="secondary" disabled={importCsv.isPending} onClick={() => csv.current?.click()} className="h-12 rounded-xl"><FileSpreadsheet className="mr-2 size-5" />{importCsv.isPending ? 'Importando…' : 'Escolher CSV'}</Button>
            <input ref={csv} type="file" hidden accept=".csv,text/csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) importCsv.mutate(f); e.target.value = '' }} />
            <Button variant="secondary" disabled={importBackup.isPending} onClick={() => bak.current?.click()} className="h-12 rounded-xl"><FileJson className="mr-2 size-5" />{importBackup.isPending ? 'Restaurando…' : 'Restaurar backup (conta vazia)'}</Button>
            <input ref={bak} type="file" hidden accept=".json,application/json" onChange={(e) => { const f = e.target.files?.[0]; if (f && confirm('Restaurar o backup? Só funciona em conta sem notas/cards.')) importBackup.mutate(f); e.target.value = '' }} />
          </div>
        </Card>

        <Card icon={<Trash2 className="size-5" />} title="Zona de perigo">
          <p className="mb-3 text-sm text-ink-muted">Apaga a conta e todos os dados, inclusive as imagens enviadas.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="secondary" className="h-12 rounded-xl" onClick={() => logout()}>Sair</Button>
            <Button variant="secondary" className="h-12 rounded-xl text-danger-ink" onClick={() => setDelOpen(true)}>Excluir minha conta</Button>
          </div>
        </Card>
      </motion.div>

      <Sheet open={delOpen} onOpenChange={setDelOpen} title="Excluir conta" description="Esta ação não pode ser desfeita. Confirme sua senha.">
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); delAccount.mutate() }}>
          <Input type="password" autoComplete="current-password" placeholder="Senha" value={delPw} onChange={(e) => setDelPw(e.target.value)} required className="h-12 rounded-xl" />
          <Button variant="destructive" disabled={delAccount.isPending} className="h-12 rounded-xl bg-danger-ink text-surface hover:bg-danger-ink/90">Excluir tudo</Button>
        </form>
      </Sheet>
    </>
  )
}
