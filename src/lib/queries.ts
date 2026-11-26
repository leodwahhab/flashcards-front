import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  api,
  ApiError,
  type BulkAction,
  type CardSummary,
  type DeckNode,
  type ForecastStats,
  type HeatmapStats,
  type NoteResponse,
  type OverviewStats,
  type PageResponse,
  type QueueResponse,
  type RetentionStats,
  type StreakStats,
  type TodayStats,
} from '@/lib/api'

export const useDecks = () => useQuery({ queryKey: ['decks'], queryFn: () => api<DeckNode[]>('GET', '/decks') })
export const useToday = () => useQuery({ queryKey: ['stats', 'today'], queryFn: () => api<TodayStats>('GET', '/stats/today') })
export const useOverview = () => useQuery({ queryKey: ['stats', 'overview'], queryFn: () => api<OverviewStats>('GET', '/stats/overview') })
export const useStreak = () => useQuery({ queryKey: ['stats', 'streak'], queryFn: () => api<StreakStats>('GET', '/stats/streak') })
export const useForecast = (days = 14) =>
  useQuery({ queryKey: ['stats', 'forecast', days], queryFn: () => api<ForecastStats>('GET', `/stats/forecast?days=${days}`) })
export const useRetention = (days = 30) =>
  useQuery({ queryKey: ['stats', 'retention', days], queryFn: () => api<RetentionStats>('GET', `/stats/retention?days=${days}`) })
export const useHeatmap = () => useQuery({ queryKey: ['stats', 'heatmap'], queryFn: () => api<HeatmapStats>('GET', '/stats/heatmap') })

export interface CardSearch {
  deckId?: number
  text?: string
  state?: string
  tag?: string
  page: number
  size: number
}
export const useCards = (s: CardSearch) =>
  useQuery({
    queryKey: ['cards', s],
    queryFn: () =>
      api<PageResponse<CardSummary>>('POST', '/cards/search', {
        deckId: s.deckId,
        includeSubdecks: true,
        text: s.text || undefined,
        states: s.state ? [s.state] : undefined,
        tags: s.tag ? [s.tag.toLowerCase().replace(/\s+/g, '-')] : undefined,
        page: s.page,
        size: s.size,
        sort: 'createdAt,desc',
      }),
    placeholderData: (prev) => prev,
  })

export const useNote = (id: number | null) =>
  useQuery({ queryKey: ['note', id], queryFn: () => api<NoteResponse>('GET', `/notes/${id}`), enabled: id != null })

export const useQueue = (deckId: number | null) =>
  useQuery({
    queryKey: ['queue', deckId],
    queryFn: () => api<QueueResponse>('GET', `/study/queue?limit=50${deckId ? `&deckId=${deckId}` : ''}`),
    gcTime: 0,
    staleTime: 0,
  })

export function useInvalidateAll() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['decks'] })
    qc.invalidateQueries({ queryKey: ['cards'] })
    qc.invalidateQueries({ queryKey: ['stats'] })
    qc.invalidateQueries({ queryKey: ['note'] })
  }
}

export function useBulk() {
  const inv = useInvalidateAll()
  return useMutation({
    mutationFn: (b: { ids: number[]; action: BulkAction; flag?: number; deckId?: number; tag?: string }) =>
      api<{ affected: number }>('POST', '/cards/bulk', b),
    onSuccess: (r) => {
      toast.success(`${r.affected} card(s) atualizado(s)`)
      inv()
    },
    onError: (e: ApiError) => toast.error(e.message),
  })
}

export function useDeleteNote() {
  const inv = useInvalidateAll()
  return useMutation({
    mutationFn: (id: number) => api('DELETE', `/notes/${id}`),
    onSuccess: () => {
      toast.success('Nota excluída')
      inv()
    },
    onError: (e: ApiError) => toast.error(e.message),
  })
}
