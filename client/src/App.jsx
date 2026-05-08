import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import SearchResults from './pages/SearchResults'
import RemedyDetail from './pages/RemedyDetail'
import Register from './pages/Register'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

/**
 * App root
 *
 * Central route table for the SPA. Keep routes simple and declarative here
 * so higher-level layout or auth checks can be added later without changing
 * individual pages.
 */
function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/search" element={<SearchResults />} />
      <Route path="/remedy/:id" element={<RemedyDetail />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  )
}

export default App