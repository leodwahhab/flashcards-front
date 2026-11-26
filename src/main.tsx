import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppProvider } from '@/lib/app-context'
import App from '@/App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <TooltipProvider delayDuration={200}>
          <HashRouter>
            <App />
          </HashRouter>
          <Toaster position="top-center" toastOptions={{ className: 'font-sans' }} />
        </TooltipProvider>
      </AppProvider>
    </QueryClientProvider>
  </StrictMode>,
)
