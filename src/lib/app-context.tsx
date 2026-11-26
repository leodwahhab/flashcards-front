import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getToken, setToken, UNAUTHORIZED_EVENT } from '@/lib/api'

interface Ctx {
  authed: boolean
  login: (token: string) => void
  logout: (reason?: string) => void
  logoutReason: string | null
  dark: boolean
  toggleTheme: () => void
}
const AppCtx = createContext<Ctx | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [authed, setAuthed] = useState(!!getToken())
  const [logoutReason, setReason] = useState<string | null>(null)
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  const logout = useCallback(
    (reason?: string) => {
      setToken(null)
      qc.clear()
      setReason(reason ?? null)
      setAuthed(false)
    },
    [qc],
  )
  const login = useCallback((t: string) => {
    setToken(t)
    setReason(null)
    setAuthed(true)
  }, [])

  useEffect(() => {
    const h = () => logout('Sessão expirada. Entre novamente.')
    window.addEventListener(UNAUTHORIZED_EVENT, h)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, h)
  }, [logout])

  const toggleTheme = useCallback(() => {
    setDark((d) => {
      const next = !d
      document.documentElement.classList.toggle('dark', next)
      localStorage.setItem('theme', next ? 'dark' : 'light')
      document.querySelector('meta[name=theme-color]')?.setAttribute('content', next ? '#111111' : '#ffffff')
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ authed, login, logout, logoutReason, dark, toggleTheme }),
    [authed, login, logout, logoutReason, dark, toggleTheme],
  )
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useApp() {
  const c = useContext(AppCtx)
  if (!c) throw new Error('useApp fora do provider')
  return c
}
