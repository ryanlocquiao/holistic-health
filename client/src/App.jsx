import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import SearchResults from './pages/SearchResults'
import RemedyDetail from './pages/RemedyDetail'

/**
 * Root route configuration for the single-page application.
 *
 * Route map:
 * - /            -> Landing search page
 * - /search      -> Search results page (expects query param `q`)
 * - /remedy/:id  -> Compound detail page
 *
 * Manual test:
 * - Navigate each route directly in browser to validate route rendering.
 * - Verify browser back/forward behavior remains correct.
 */
function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/search" element={<SearchResults />} />
      <Route path="/remedy/:id" element={<RemedyDetail />} />
    </Routes>
  )
}

export default App