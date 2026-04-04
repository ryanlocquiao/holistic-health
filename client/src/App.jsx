import { useEffect, useState } from 'react'

function App() {
  const [status, setStatus] = useState('loading...')

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/health`).then(res => res.json()).then(data => setStatus(data.status)).catch(() => setStatus('error'))
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-3x1 font-bold text-gray-800">Holistic Health</h1>
        <p className="mt-2 text-gray-500">API Status: <span className="font-mono text-green-600">{status}</span></p>
      </div>
    </div>
  )
}

export default App