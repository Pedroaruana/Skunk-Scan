import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { loadAnalytics } from './lib/analytics'
import './index.css'

loadAnalytics(import.meta.env.VITE_CF_BEACON_TOKEN)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
