export const API = import.meta.env.VITE_API_URL ?? 'https://flashcards-back-production-4f5d.up.railway.app/api/v1'
export const API_ORIGIN = new URL(API).origin

const TOKEN_KEY = 'token'
export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t: string | null) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY))

// ---------- Tipos (docs/api.md do back-end) ----------
export type NoteType = 'BASIC' | 'BASIC_REVERSED' | 'CLOZE' | 'TYPE_IN'
export type CardState = 'NEW' | 'LEARNING' | 'REVIEW' | 'RELEARNING'
export type Rating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY'

export interface DeckNode {
  id: number
  parentId: number | null
  name: string
  fullName: string
  optionsId: number
  newCount: number
  learningCount: number
  reviewCount: number
  children: DeckNode[]
}
export interface CardSummary {
  id: number
  noteId: number
  deckId: number
  noteType: NoteType
  ordinal: number
  state: CardState
  dueAt: string
  intervalDays: number
  easePermille: number
  reps: number
  lapses: number
  suspended: boolean
  flag: number
  question: string
  tags: string[]
}
export interface PageResponse<T> {
  items: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
export interface NoteResponse {
  id: number
  noteType: NoteType
  front: string | null
  back: string | null
  imageUrl: string | null
  tags: string[]
  cards: CardSummary[]
}
export interface Interval {
  label: string
  intervalDays: number
  dueAt: string
}
export interface QueueCard {
  cardId: number
  noteId: number
  deckId: number
  state: CardState
  noteType: NoteType
  ordinal: number
  question: string
  answer: string
  imageUrl: string | null
  dueAt: string
  version: number
  intervals: Record<'again' | 'hard' | 'good' | 'easy', Interval>
}
export interface QueueResponse {
  counts: { newCount: number; learningCount: number; reviewCount: number }
  cards: QueueCard[]
}
export interface AnswerResponse {
  cardId: number
  leech: boolean
  version: number
}
export interface TodayStats {
  date: string
  reviews: number
  correct: number
  again: number
  newCards: number
  timeMs: number
  accuracyPercent: number
}
export interface OverviewStats {
  newCards: number
  learning: number
  young: number
  mature: number
  relearning: number
  suspended: number
  buried: number
  totalCards: number
  totalNotes: number
  averageEasePercent: number
  averageIntervalDays: number
  totalLapses: number
}
export interface StreakStats {
  currentStreak: number
  longestStreak: number
  totalDaysStudied: number
  lastStudyDate: string | null
}
export interface ForecastStats {
  days: number
  totalDue: number
  items: { date: string; due: number; cumulative: number }[]
}
export interface HeatmapStats {
  from: string
  to: string
  totalReviews: number
  activeDays: number
  maxCount: number
  items: { date: string; count: number }[]
}
export interface RetentionStats {
  days: number
  totalReviews: number
  matureReviews: number
  passed: number
  retentionPercent: number
}
export type BulkAction = 'SUSPEND' | 'UNSUSPEND' | 'FLAG' | 'MOVE' | 'ADD_TAG' | 'REMOVE_TAG' | 'RESET' | 'DELETE'

// ---------- Erros ----------
export class ApiError extends Error {
  status: number
  body: { detail?: string; errors?: { field?: string; row?: number; message: string }[]; existingNoteId?: number } | null
  retryAfter: string | null
  constructor(status: number, body: ApiError['body'], retryAfter: string | null, message: string) {
    super(message)
    this.status = status
    this.body = body
    this.retryAfter = retryAfter
  }
}

function messageFor(status: number, body: ApiError['body'], retryAfter: string | null): string {
  if (status === 0) return 'Não foi possível conectar ao servidor.'
  if (status === 429) return `Muitas tentativas de login.${retryAfter ? ` Tente novamente em ${retryAfter}s.` : ''}`
  if (status === 413) return 'Arquivo grande demais.'
  if (body?.errors?.length)
    return body.errors.map((e) => `${e.row ? `Linha ${e.row}: ` : e.field ? `${e.field}: ` : ''}${e.message}`).join(' · ')
  if (body?.detail) return body.detail
  return 'Algo deu errado. Tente de novo.'
}

export const UNAUTHORIZED_EVENT = 'flashcards:unauthorized'

async function handle(res: Response, path: string): Promise<Response> {
  if (res.ok) return res
  let body: ApiError['body'] = null
  try {
    body = await res.json()
  } catch {
    /* sem corpo */
  }
  const retry = res.headers.get('Retry-After')
  if (res.status === 401 && !path.startsWith('/auth/') && getToken()) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
  throw new ApiError(res.status, body, retry, messageFor(res.status, body, retry))
}

function authHeaders(): Record<string, string> {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

async function send(path: string, init: RequestInit): Promise<Response> {
  try {
    return await handle(await fetch(API + path, init), path)
  } catch (e) {
    if (e instanceof ApiError) throw e
    throw new ApiError(0, null, null, messageFor(0, null, null))
  }
}

export async function api<T = void>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await send(path, {
    method,
    headers: { ...authHeaders(), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export async function apiForm<T>(path: string, form: FormData): Promise<T> {
  const res = await send(path, { method: 'POST', headers: authHeaders(), body: form })
  return res.json()
}

export async function apiRawJson<T>(path: string, text: string): Promise<T> {
  const res = await send(path, { method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: text })
  return res.json()
}

export async function download(path: string, filename: string) {
  const res = await send(path, { headers: authHeaders() })
  const url = URL.createObjectURL(await res.blob())
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Mídia enviada exige JWT: baixa como blob e cacheia o object URL.
const mediaCache = new Map<string, Promise<string>>()
export function mediaSrc(url: string | null | undefined): Promise<string> {
  if (!url) return Promise.resolve('')
  const isMedia = url.startsWith('/api/v1/media/') || url.startsWith(`${API_ORIGIN}/api/v1/media/`)
  if (!isMedia) return Promise.resolve(url)
  const full = url.startsWith('http') ? url : API_ORIGIN + url
  let p = mediaCache.get(full)
  if (!p) {
    p = fetch(full, { headers: authHeaders() })
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then((b) => URL.createObjectURL(b))
      .catch(() => {
        mediaCache.delete(full)
        return ''
      })
    mediaCache.set(full, p)
  }
  return p
}

export function flattenDecks(nodes: DeckNode[], depth = 0): { node: DeckNode; depth: number }[] {
  return nodes.flatMap((n) => [{ node: n, depth }, ...flattenDecks(n.children ?? [], depth + 1)])
}
export function findDeck(nodes: DeckNode[], id: number): DeckNode | null {
  for (const n of nodes) {
    if (n.id === id) return n
    const r = findDeck(n.children ?? [], id)
    if (r) return r
  }
  return null
}
