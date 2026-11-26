import { motion, AnimatePresence } from 'motion/react'
import { Home, BarChart3, Settings, Plus, Zap, Moon, Sun } from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useApp } from '@/lib/app-context'
import { cn } from '@/lib/utils'

const items = [
  { to: '/', label: 'Baralhos', icon: Home, end: true },
  { to: '/stats', label: 'Estatísticas', icon: BarChart3 },
  { to: '/settings', label: 'Conta', icon: Settings },
]

function NavItem({ to, label, icon: Icon, end }: (typeof items)[number]) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'relative flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-semibold transition-colors md:flex-none md:flex-row md:justify-start md:gap-3 md:px-4 md:py-3 md:text-sm',
          isActive ? 'text-ink' : 'text-ink-muted hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="nav-pill"
              className="absolute inset-0 -z-0 rounded-xl bg-brand-soft"
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            />
          )}
          <Icon className="relative size-5" aria-hidden />
          <span className="relative">{label}</span>
        </>
      )}
    </NavLink>
  )
}

export function Shell() {
  const { dark, toggleTheme } = useApp()
  const nav = useNavigate()
  const loc = useLocation()
  const params = useParams()
  const deckQuery = loc.pathname.startsWith('/deck/') ? `?deck=${params.id ?? loc.pathname.split('/')[2]}` : ''

  return (
    <div className="aura relative min-h-dvh">
      {/* Rail (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-2 border-r border-line bg-surface/80 p-4 backdrop-blur-xl md:flex">
        <button onClick={() => nav('/')} className="mb-4 flex items-center gap-2 px-2 py-2 text-lg font-extrabold tracking-tight">
          <span className="grid size-9 place-items-center rounded-xl bg-brand text-on-brand">
            <Zap className="size-5" fill="currentColor" />
          </span>
          Flashcards
        </button>
        <button
          onClick={() => nav('/note/new' + deckQuery)}
          className="mb-2 flex items-center gap-3 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-on-brand shadow-soft transition hover:-translate-y-0.5 hover:bg-brand-strong active:translate-y-0 active:scale-[.98]"
        >
          <Plus className="size-5" /> Nova nota
        </button>
        {items.map((i) => (
          <NavItem key={i.to} {...i} />
        ))}
        <button
          onClick={toggleTheme}
          className="mt-auto flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-ink-muted transition-colors hover:bg-brand-soft hover:text-ink"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={dark ? 'd' : 'l'} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
              {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </motion.span>
          </AnimatePresence>
          {dark ? 'Tema claro' : 'Tema escuro'}
        </button>
      </aside>

      <main className="mx-auto w-full max-w-3xl px-4 md:w-[calc(100%-16rem)] pb-32 pt-[max(1rem,env(safe-area-inset-top))] md:ml-64 md:max-w-none md:px-10 md:pb-16 md:pt-10">
        <div className="mx-auto max-w-3xl">
          <PageTransition />
        </div>
      </main>

      {/* Barra inferior (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-md items-center gap-1 px-3 py-2">
          <NavItem {...items[0]} />
          <button
            onClick={() => nav('/note/new' + deckQuery)}
            aria-label="Nova nota"
            className="-mt-7 grid size-14 shrink-0 place-items-center rounded-2xl bg-brand text-on-brand shadow-lift transition active:scale-90"
          >
            <motion.span whileTap={{ rotate: 90 }}>
              <Plus className="size-7" />
            </motion.span>
          </button>
          <NavItem {...items[1]} />
          <NavItem {...items[2]} />
        </div>
      </nav>
    </div>
  )
}

function PageTransition() {
  const loc = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={loc.pathname}
        initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  )
}
