import { AnimatePresence } from 'motion/react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useApp } from '@/lib/app-context'
import { Shell } from '@/components/shell'
import AuthPage from '@/pages/auth'
import HomePage from '@/pages/home'
import DeckPage from '@/pages/deck'
import NoteFormPage from '@/pages/note-form'
import StudyPage from '@/pages/study'
import StatsPage from '@/pages/stats'
import SettingsPage from '@/pages/settings'

export default function App() {
  const { authed } = useApp()
  const location = useLocation()

  if (!authed) return <AuthPage />

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname.startsWith('/study') ? 'study' : 'shell'}>
        <Route path="/study" element={<StudyPage />} />
        <Route path="/study/:deckId" element={<StudyPage />} />
        <Route element={<Shell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/deck/:id" element={<DeckPage />} />
          <Route path="/note/new" element={<NoteFormPage />} />
          <Route path="/note/:noteId" element={<NoteFormPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}
