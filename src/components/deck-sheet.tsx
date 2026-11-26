import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Sheet } from '@/components/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api, ApiError, flattenDecks, type DeckNode } from '@/lib/api'
import { useDecks, useInvalidateAll } from '@/lib/queries'

/** Criar, renomear ou mover baralho. `editing` = null cria. */
export function DeckSheet({
  open,
  onOpenChange,
  editing,
  presetParentId,
  onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  editing: DeckNode | null
  presetParentId?: number | null
  onSaved?: (d: DeckNode) => void
}) {
  const { data: decks = [] } = useDecks()
  const inv = useInvalidateAll()
  const [name, setName] = useState('')
  const [parent, setParent] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setName(editing?.name ?? '')
    setParent(String(editing ? (editing.parentId ?? '') : (presetParentId ?? '')))
    setError('')
  }, [open, editing, presetParentId])

  const blocked = new Set(editing ? flattenDecks([editing]).map((x) => x.node.id) : [])

  const save = useMutation({
    mutationFn: () => {
      const parentId = parent ? Number(parent) : null
      return editing
        ? api<DeckNode>('PATCH', `/decks/${editing.id}`, { name: name.trim(), parentId })
        : api<DeckNode>('POST', '/decks', parentId ? { name: name.trim(), parentId } : { name: name.trim() })
    },
    onSuccess: (d) => {
      toast.success(editing ? 'Baralho atualizado' : 'Baralho criado')
      inv()
      onSaved?.(d)
      onOpenChange(false)
    },
    onError: (e: ApiError) => setError(e.message),
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={editing ? 'Renomear ou mover' : 'Novo baralho'} description='Use "Pai" para criar subbaralhos (até 8 níveis).'>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (name.includes('::')) return setError('O nome não pode conter "::"')
          save.mutate()
        }}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="deck-name">Nome</Label>
          <Input id="deck-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={255} required autoFocus className="h-12 rounded-xl" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="deck-parent">Baralho pai</Label>
          <select
            id="deck-parent"
            value={parent}
            onChange={(e) => setParent(e.target.value)}
            className="h-12 rounded-xl border border-line-strong bg-surface px-3 text-base"
          >
            <option value="">(raiz)</option>
            {flattenDecks(decks)
              .filter((d) => !blocked.has(d.node.id))
              .map((d) => (
                <option key={d.node.id} value={d.node.id}>
                  {'  '.repeat(d.depth)}
                  {d.node.name}
                </option>
              ))}
          </select>
        </div>
        {error && <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger-ink">{error}</p>}
        <Button type="submit" size="lg" disabled={save.isPending || !name.trim()} className="h-12 rounded-xl">
          {save.isPending ? 'Salvando…' : 'Salvar'}
        </Button>
      </form>
    </Sheet>
  )
}
