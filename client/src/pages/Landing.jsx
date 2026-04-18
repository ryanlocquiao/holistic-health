import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Landing() {
    const [query, setQuery] = useState('')
    const navigate = useNavigate()

    function handleSearch(e) {
        e.preventDefault()
        if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`)
    }

    return(
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
            <h1 className="text-5xl font-bold text-gray-900 mb-3">Remedia</h1>
            <p className="text-gray-500 text-lg mb-10">
                Discover evidence-based natural remedies
            </p>
            <form onSubmit={handleSearch} className="w-full max-w-xl flex gap-3">
                <input 
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search by symptom - e.g. insomnia, anxiety, inflammation"
                    className="flex-1 px-5 py-3 rounded-xl border border-gray-300 text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button 
                    type="submit"
                    className="px-6 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition"
                >
                    Search
                </button>
            </form>
        </div>
    );
}