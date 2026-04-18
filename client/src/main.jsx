import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

/**
 * Application bootstrap entry.
 *
 * Responsibilities:
 * - Mount React into the root DOM node.
 * - Enable StrictMode diagnostics in development.
 * - Wrap app routes with BrowserRouter.
 *
 * Manual test:
 * - Run `npm run dev` and ensure the app loads without console errors.
 */
const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element with id "root" was not found in index.html.')
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
