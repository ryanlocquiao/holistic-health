import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import SearchResults from './pages/SearchResults'
import RemedyDetail from './pages/RemedyDetail'

function App() {
  return (
    <Routes>
      <Route path='/' element={<Landing />} />
      <Route path='/search' element={<SearchResults />} />
      <Route path='/remedy/:id' element={<RemedyDetail />} />
    </Routes>
  )
}

export default App