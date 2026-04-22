import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowRight, Leaf, Search } from 'lucide-react'
import Nav from '../components/Nav.jsx'

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
    const [searchInput, setSearchInput] = useState(query)

    const [sortBy, setSortBy] = useState('relevance')
    const sortedResults = [...results].sort((a, b) => {
        if (sortBy === 'tier') return a.evidence_tier - b.evidence_tier
        if (sortBy === 'alpha') return a.name.localeCompare(b.name)
        return (b.score || 0) - (a.score || 0)
    })

    function normalizeSearch(value) {
        return value.trim()
    }

    function handleSearchSubmit(event) {
        event.preventDefault()

        const normalizedQuery = normalizeSearch(searchInput)
        if (!normalizedQuery) {
            navigate('/search')
            return
        }

        navigate(`/search?q=${encodeURIComponent(normalizedQuery)}`)
    }

    useEffect(() => {
        setSearchInput(query)
    }, [query])

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
        <div className="min-h-screen overflow-x-hidden bg-[#F9F6F0] font-sans text-[#2C4C3B] selection:bg-[#4E7A5E] selection:text-white">
            <Nav />

            <main className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:py-16">
                <div className="mx-auto max-w-5xl">
                    <button
                        onClick={() => navigate('/')}
                        type="button"
                        className="mb-6 inline-flex items-center text-sm font-medium text-[#4E7A5E] transition-colors hover:text-[#1A3326]"
                    >
                        <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
                        Back to search
                    </button>

                    <section className="rounded-[3rem] border border-[#E9E4D8] bg-white p-8 shadow-xl sm:p-10">
                        <div className="mx-auto max-w-3xl text-center">
                            <h2 className="mt-6 text-4xl font-medium leading-tight text-[#1A3326] sm:text-5xl">
                                Results for <span className="italic text-[#4E7A5E]">{query || 'your search'}</span>
                            </h2>
                            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-[#3E5C4A]">
                                {loading ? 'Searching for evidence-based remedies...' : `${results.length} compounds found`}
                            </p>

                            <form
                                onSubmit={handleSearchSubmit}
                                className="mx-auto mt-8 flex max-w-2xl items-center rounded-full border border-[#E9E4D8] bg-[#F9F6F0] p-2 shadow-sm focus-within:ring-4 focus-within:ring-[#4E7A5E]/20"
                            >
                                <div className="pl-4 pr-3 text-[#4E7A5E]">
                                    <Search className="h-5 w-5" />
                                </div>
                                <input
                                    type="text"
                                    value={searchInput}
                                    onChange={(event) => setSearchInput(event.target.value)}
                                    placeholder="Search by symptom, herb, or compound..."
                                    aria-label="Run another search"
                                    className="flex-1 border-none bg-transparent py-2.5 text-base text-[#1A3326] outline-none placeholder:text-[#A3B899]"
                                />
                                <button
                                    type="submit"
                                    className="rounded-full bg-[#4E7A5E] px-6 py-2.5 text-sm font-medium text-[#F9F6F0] transition-colors hover:bg-[#3E5C4A]"
                                >
                                    Search
                                </button>
                            </form>

                            <div className="mt-8 flex flex-wrap justify-center gap-2">
                                {SORT_OPTIONS.map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => setSortBy(option)}
                                        aria-pressed={sortBy === option}
                                        className={`rounded-full border px-4 py-2 text-xs font-medium uppercase tracking-wide transition ${sortBy === option ? 'border-[#4E7A5E] bg-[#4E7A5E] text-[#F9F6F0]' : 'border-[#E9E4D8] bg-[#F9F6F0] text-[#3E5C4A] hover:border-[#A3B899]'}`}
                                    >
                                        {getSortLabel(option)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <div className="mx-auto mt-8 max-w-2xl rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        {!loading && results.length === 0 && !error && (
                            <div className="mx-auto mt-8 max-w-2xl rounded-3xl border border-[#E9E4D8] bg-[#F9F6F0] px-5 py-4 text-sm text-[#3E5C4A]">
                                No results found for "{query}". Try a different symptom.
                            </div>
                        )}

                        <div className="mt-10 grid gap-5">
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
                                    className="group cursor-pointer rounded-[2rem] border border-[#E9E4D8] bg-[#F9F6F0] p-6 text-[#2C4C3B] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white transition-colors group-hover:bg-[#EEF4EF]">
                                                <Leaf className="h-5 w-5 text-[#4E7A5E] transition-colors" />
                                            </div>
                                            <h3 className="text-2xl font-serif font-medium text-[#1A3326]">{compound.name}</h3>
                                            <p className="mt-2 text-sm text-[#3E5C4A]">{compound.category}</p>
                                        </div>

                                        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${TIER_COLOR[compound.evidence_tier] || TIER_COLOR[3]}`}>
                                            {TIER_LABEL[compound.evidence_tier] || 'Tier 3'}
                                        </span>
                                    </div>

                                    <p className="mt-5 max-w-3xl leading-relaxed text-[#3E5C4A] line-clamp-3">
                                        {compound.description}
                                    </p>

                                    <div className="mt-6 flex items-center text-sm font-medium text-[#4E7A5E] transition-colors group-hover:text-[#1A3326]">
                                        View details <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    )
}