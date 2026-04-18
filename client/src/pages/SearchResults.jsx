import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

const TIER_LABEL = { 1: 'Tier 1', 2: 'Tier 2', 3: 'Tier 3' }
const TIER_COLOR = {
    1: 'bg-green-100 text-green-800',
    2: 'bg-yellow-100 text-yellow-800',
    3: 'bg-gray-100 text-gray-600'
}

export default function SearchResults() {
    const [searchParams] = useSearchParams()
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const navigate = useNavigate()
    const query = searchParams.get('q') || ''

    useEffect(() => {
        if (!query) {
            setLoading(false)
            return
        }

        let cancelled = false

        async function runSearch() {
            try {
                const res = await fetch(
                    `${import.meta.env.VITE_API_URL}/api/search?q=${encodeURIComponent(query)}`
                )
                const data = await res.json()
                if (!cancelled) {
                    setResults(Array.isArray(data) ? data : [])
                    setLoading(false)
                }
            } catch {
                if (!cancelled) {
                    setError('Something went wrong. Please try again.')
                    setLoading(false)
                }
            }
        }

        runSearch()
        return () => { cancelled = true }
    }, [query])

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-10">
            <div className="max-w-2xl mx-auto">
                <button
                    onClick={() => navigate('/')}
                    className="text-teal-600 text-sm mb-6 hover:underline"
                >
                    ← Back to search
                </button>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    Results for "{query}"
                </h2>
                <p className="text-gray-500 text-sm mb-8">
                    {loading ? 'Searching...' : `${results.length} compounds found`}
                </p>

                {error && <p className="text-red-500">{error}</p>}

                {!loading && results.length === 0 && !error && (
                    <p className="text-gray-500">No results found for "{query}". Try a different symptom.</p>
                )}

                <div className="flex flex-col gap-4">
                    {results.map(compound => (
                        <div
                            key={compound.id}
                            onClick={() => navigate(`/remedy/${compound.id}`)}
                            className="bg-white rounded-xl border border-gray-200 p-5 cursor-pointer hover:border-teal-400 hover:shadow-sm transition"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">{compound.name}</h3>
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${TIER_COLOR[compound.evidence_tier] || TIER_COLOR[3]}`}>
                                    {TIER_LABEL[compound.evidence_tier] || 'Tier 3'}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 mb-2">{compound.category}</p>
                            <p className="text-sm text-gray-700 line-clamp-2">{compound.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}