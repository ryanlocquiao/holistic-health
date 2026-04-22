import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Nav from '../components/Nav'

/**
 * Search results page.
 *
 * Responsibilities:
 * - Read `q` from URL query params.
 * - Request ranked compound results from the API.
 * - Render loading, empty, error, and success states.
 *
 * Run locally:
 * - API: cd server && npm start
 * - UI:  cd client && npm run dev
 *
 * Manual test:
 * - Open /search?q=insomnia and verify non-empty results.
 * - Open /search?q=zzzz and verify empty state message.
 * - Stop API and reload to verify error message handling.
 */

const TIER_LABEL = { 1: 'Tier 1', 2: 'Tier 2', 3: 'Tier 3' }
const TIER_COLOR = {
    1: 'bg-green-100 text-green-800',
    2: 'bg-yellow-100 text-yellow-800',
    3: 'bg-gray-100 text-gray-600'
}
const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again.'
const SORT_OPTIONS = ['relevance', 'tier', 'alpha']

function getSortLabel(sortOption) {
    if (sortOption === 'tier') return 'Evidence tier'
    if (sortOption === 'alpha') return 'A-Z'
    return 'Relevance'
}

export default function SearchResults() {
    const [searchParams] = useSearchParams()
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const navigate = useNavigate()
    const query = (searchParams.get('q') || '').trim()

    const [sortBy, setSortBy] = useState('relevance')
    const sortedResults = [...results].sort((a, b) => {
        if (sortBy === 'tier') return a.evidence_tier - b.evidence_tier
        if (sortBy === 'alpha') return a.name.localeCompare(b.name)
        return (b.score || 0) - (a.score || 0)
    })

    useEffect(() => {
        setError(null)
        setSortBy('relevance')

        if (!query) {
            setResults([])
            setLoading(false)
            return
        }

        const abortController = new AbortController()

        async function runSearch() {
            try {
                const res = await fetch(
                    `${import.meta.env.VITE_API_URL}/api/search?q=${encodeURIComponent(query)}`,
                    { signal: abortController.signal }
                )

                if (!res.ok) {
                    throw new Error(`Search request failed with status ${res.status}`)
                }

                const data = await res.json()
                setResults(Array.isArray(data) ? data : [])
                setLoading(false)
            } catch (err) {
                if (err.name === 'AbortError') return
                setError(DEFAULT_ERROR_MESSAGE)
                setLoading(false)
            }
        }

        setLoading(true)
        runSearch()

        return () => {
            abortController.abort()
        }
    }, [query])

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-10">
            <Nav />
            <div className="max-w-2xl mx-auto">
                <button
                    onClick={() => navigate('/')}
                    type="button"
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

                <div className="flex gap-2 mb-6">
                    {SORT_OPTIONS.map((option) => (
                        <button
                            key={option}
                            type="button"
                            onClick={() => setSortBy(option)}
                            aria-pressed={sortBy === option}
                            className={`text-xs px-3 py-1.5 rounded-full border transition ${sortBy === option ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400'}`}
                        >
                            {getSortLabel(option)}
                        </button>
                    ))}
                </div>

                {error && <p className="text-red-500">{error}</p>}

                {!loading && results.length === 0 && !error && (
                    <p className="text-gray-500">No results found for "{query}". Try a different symptom.</p>
                )}

                <div className="flex flex-col gap-4">
                    {sortedResults.map((compound) => (
                        <div
                            key={compound.id}
                            onClick={() => navigate(`/remedy/${compound.id}`)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    navigate(`/remedy/${compound.id}`)
                                }
                            }}
                            aria-label={`Open details for ${compound.name}`}
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