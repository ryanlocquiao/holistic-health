import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, Leaf } from 'lucide-react'
import Nav from '../components/Nav.jsx'

/**
 * Compound detail page.
 *
 * Responsibilities:
 * - Read route param `id`.
 * - Request a single compound by ID.
 * - Render full detail content and associated ailments.
 *
 * Run locally:
 * - API: cd server && npm start
 * - UI:  cd client && npm run dev
 *
 * Manual test:
 * - Visit /remedy/32 and verify content renders.
 * - Visit /remedy/abc and verify user-friendly error messaging.
 */

const TIER_COLOR = {
    1: 'bg-green-100 text-green-800',
    2: 'bg-yellow-100 text-yellow-800',
    3: 'bg-gray-100 text-gray-600'
}

const TIER_DESC = {
    1: 'Peer-reviewed study',
    2: 'Institutional recommendation',
    3: 'Anecdotal / community data'
}

const DEFAULT_NOT_FOUND_MESSAGE = 'Compound not found.'

function getEvidenceTier(compound) {
    return compound?.evidence_tier ?? 3
}

export default function RemedyDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [compound, setCompound] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const abortController = new AbortController()

        async function fetchCompound() {
            try {
                setError(null)
                setLoading(true)

                const res = await fetch(
                    `${import.meta.env.VITE_API_URL}/api/compounds/${id}`,
                    { signal: abortController.signal }
                )

                if (!res.ok) {
                    throw new Error(`Compound fetch failed with status ${res.status}`)
                }

                const data = await res.json()
                setCompound(data)
                setLoading(false)
            } catch (err) {
                if (err.name === 'AbortError') return
                setError(DEFAULT_NOT_FOUND_MESSAGE)
                setLoading(false)
            }
        }

        fetchCompound()

        return () => {
            abortController.abort()
        }
    }, [id])

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F9F6F0] font-sans text-[#2C4C3B]">
                <Nav />
                <div className="flex h-[70vh] items-center justify-center px-6">
                    <div className="max-w-md rounded-[2.5rem] border border-[#E9E4D8] bg-white p-10 text-center shadow-xl">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#1A3326]">
                            <Leaf className="h-6 w-6 text-[#A3B899]" />
                        </div>
                        <p className="text-sm font-medium uppercase tracking-wide text-[#4E7A5E]">Loading remedy details</p>
                        <p className="mt-2 text-[#3E5C4A]">Searching compounds...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#F9F6F0] font-sans text-[#2C4C3B]">
                <Nav />
                <div className="flex h-[70vh] items-center justify-center px-6">
                    <div className="max-w-md rounded-[2.5rem] border border-red-200 bg-red-50 p-10 text-center">
                        <p className="text-sm font-medium uppercase tracking-wide text-red-700">Unable to load</p>
                        <p className="mt-3 text-red-700">{error}</p>
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="mt-6 inline-flex items-center rounded-full bg-[#4E7A5E] px-5 py-2.5 text-sm font-medium text-[#F9F6F0] transition-colors hover:bg-[#3E5C4A]"
                        >
                            <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
                            Back to results
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (!compound) {
        return (
            <div className="min-h-screen bg-[#F9F6F0] font-sans text-[#2C4C3B]">
                <Nav />
                <div className="flex h-[70vh] items-center justify-center px-6">
                    <div className="max-w-md rounded-[2.5rem] border border-[#E9E4D8] bg-white p-10 text-center shadow-xl">
                        <p className="text-sm font-medium uppercase tracking-wide text-[#4E7A5E]">No compound data</p>
                        <p className="mt-3 text-[#3E5C4A]">No compound data available.</p>
                    </div>
                </div>
            </div>
        )
    }

    const evidenceTier = getEvidenceTier(compound)

    return (
        <div className="min-h-screen overflow-x-hidden bg-[#F9F6F0] font-sans text-[#2C4C3B] selection:bg-[#4E7A5E] selection:text-white">
            <Nav />

            <main className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:py-16">
                <div className="mx-auto max-w-5xl">
                <button
                    onClick={() => navigate(-1)}
                    type="button"
                    className="mb-6 inline-flex items-center text-sm font-medium text-[#4E7A5E] transition-colors hover:text-[#1A3326]"
                >
                    <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
                    Back to results
                </button>

                <div className="rounded-[3rem] border border-[#E9E4D8] bg-white p-8 shadow-xl sm:p-10">
                    <div className="mx-auto max-w-3xl">
                        <div className="inline-flex items-center space-x-2 rounded-full border border-[#E9E4D8] bg-[#F9F6F0] px-5 py-2 text-sm font-medium text-[#4E7A5E] shadow-sm">
                            <Leaf className="h-4 w-4" />
                            <span>Remedy details</span>
                        </div>

                        <div className="mt-6 flex flex-col gap-4 border-b border-[#E9E4D8] pb-6 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h1 className="text-4xl font-medium leading-tight text-[#1A3326] sm:text-5xl">
                                    {compound.name}
                                </h1>
                                <p className="mt-3 text-sm font-medium uppercase tracking-wide text-[#4E7A5E]">
                                    {compound.category}
                                </p>
                            </div>
                            <span className={'inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ' + (TIER_COLOR[evidenceTier] || TIER_COLOR[3])}>
                                Tier {evidenceTier}
                            </span>
                        </div>

                        <div className="mt-8 grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
                            <div className="space-y-6">
                                <section className="rounded-[2rem] border border-[#E9E4D8] bg-[#F9F6F0] p-6">
                                    <h2 className="text-sm font-medium uppercase tracking-wide text-[#4E7A5E] mb-3">
                                        About
                                    </h2>
                                    <p className="leading-relaxed text-[#3E5C4A]">
                                        {compound.description}
                                    </p>
                                </section>

                                {compound.ailments && compound.ailments.length > 0 && (
                                    <section className="rounded-[2rem] border border-[#E9E4D8] bg-[#F9F6F0] p-6">
                                        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[#4E7A5E]">
                                            Addresses
                                        </h2>
                                        <div className="flex flex-wrap gap-2">
                                            {compound.ailments.map((ailment) => (
                                                <span key={ailment.id} className="rounded-full border border-[#D7E2D8] bg-white px-3 py-1 text-xs text-[#2C4C3B]">
                                                    {ailment.name}
                                                </span>
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </div>

                            <aside className="space-y-4">
                                <section className="rounded-[2rem] border border-[#E9E4D8] bg-white p-6 shadow-sm">
                                    <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-[#4E7A5E]">
                                        Evidence level
                                    </h2>
                                    <p className="text-[#3E5C4A]">
                                        {TIER_DESC[evidenceTier]}
                                    </p>
                                </section>

                                <section className="rounded-[2rem] border border-[#E9E4D8] bg-white p-6 shadow-sm">
                                    <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-[#4E7A5E]">
                                        Source
                                    </h2>
                                    <p className="break-all text-sm text-[#3E5C4A]">
                                        {compound.source_url}
                                    </p>
                                </section>
                            </aside>
                        </div>

                        <div className="mt-8 rounded-[2rem] border border-[#E9E4D8] bg-[#F9F6F0] p-4 text-sm text-[#3E5C4A]">
                            <p className="text-xs text-[#4E7A5E]">
                                Contraindication check available after login — coming soon.
                            </p>
                        </div>
                    </div>
                </div>
                </div>
            </main>
        </div>
    )
}