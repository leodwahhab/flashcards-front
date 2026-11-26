import { useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Zap, AlertCircle } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import { useApp } from '@/lib/app-context'
import { LabelInput } from '@/components/label-input'
import { PopButton } from '@/components/pop-button'
import { WordsStagger } from '@/components/words-stagger'
import { cn } from '@/lib/utils'

export default function AuthPage() {
  const { login, logoutReason } = useApp()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(logoutReason)

  const submit = useMutation({
    mutationFn: () => api<{ token: string }>('POST', mode === 'login' ? '/auth/login' : '/auth/register', { email: email.trim(), password }),
    onSuccess: (r) => login(r.token),
    onError: (e: ApiError) => {
      if (mode === 'login' && e.status === 401) setError('Email ou senha inválidos')
      else if (mode === 'register' && e.status === 409) setError('Esse email já está cadastrado')
      else setError(e.message)
    },
  })

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault()
    setError(null)
    if (mode === 'register' && (password.length < 6 || password.length > 72 || new Blob([password]).size > 72))
      return setError('A senha deve ter de 6 a 72 caracteres')
    submit.mutate()
  }

  return (
    <div className="aura relative grid min-h-dvh place-items-center px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
            whileHover={{ rotate: [0, -8, 8, 0], transition: { duration: 0.5 } }}
            className="mb-5 grid size-16 place-items-center rounded-3xl bg-brand text-on-brand shadow-lift"
          >
            <Zap className="size-8" fill="currentColor" />
          </motion.div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            <WordsStagger delay={0.2}>{mode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}</WordsStagger>
          </h1>
          <p className="mt-2 text-ink-muted">Repetição espaçada, sem pressa e sem ruído.</p>
        </div>

        <div className="relative mb-6 grid grid-cols-2 rounded-2xl bg-surface-soft p-1">
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m)
                setError(null)
              }}
              className={cn('relative z-10 h-10 rounded-xl text-sm font-semibold transition-colors', mode === m ? 'text-ink' : 'text-ink-muted')}
            >
              {mode === m && (
                <motion.span layoutId="auth-tab" className="absolute inset-0 -z-10 rounded-xl bg-surface-raised shadow-soft" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
              )}
              {m === 'login' ? 'Entrar' : 'Cadastrar'}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate={mode === 'register'}>
          <LabelInput label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder=" " autoComplete="email" required className="[&_input]:h-12 [&_input]:rounded-xl" />
          <LabelInput
            label={mode === 'register' ? 'Senha (6 a 72 caracteres)' : 'Senha'}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder=" "
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            className="[&_input]:h-12 [&_input]:rounded-xl"
          />
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0, x: 0 }}
                animate={{ opacity: 1, height: 'auto', x: [0, -6, 6, -4, 4, 0] }}
                exit={{ opacity: 0, height: 0 }}
                role="alert"
                className="flex items-start gap-2 overflow-hidden rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger-ink"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
              </motion.p>
            )}
          </AnimatePresence>
          <PopButton
            type="submit"
            size="lg"
            disabled={submit.isPending}
            className="w-full border-brand-strong bg-brand text-on-brand hover:bg-brand-strong dark:border-neutral-400 dark:bg-brand dark:text-on-brand dark:hover:bg-brand-strong"
          >
            {submit.isPending ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </PopButton>
        </form>
      </motion.div>
    </div>
  )
}
