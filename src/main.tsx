import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyTheme, initialColor, initialMode } from './store/themeStore'

// Apply the saved colour theme + mode before first paint to avoid a flash.
applyTheme(initialColor(), initialMode())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
