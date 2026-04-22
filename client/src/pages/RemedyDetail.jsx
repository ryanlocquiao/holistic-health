import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Nav from '../components/Nav'

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
            <div className="min-h-screen bg-gray-50">
                <Nav />
                <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        <p className="text-gray-500 text-sm">Searching compounds...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-red-500">{error}</p>
            </div>
        )
    }

    if (!compound) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-500">No compound data available.</p>
            </div>
        )
    }

    const evidenceTier = getEvidenceTier(compound)

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-10">
            <Nav />
            <div className="max-w-2xl mx-auto">
                <button
                    onClick={() => navigate(-1)}
                    type="button"
                    className="text-teal-600 text-sm mb-6 hover:underline"
                >
                    ← Back to results
                </button>

                <div className="bg-white rounded-2xl border border-gray-200 p-8">

                    <div className="flex items-start justify-between mb-4">
                        <h1 className="text-3xl font-bold text-gray-900">
                            {compound.name}
                        </h1>
                        <span className={'text-xs font-medium px-3 py-1 rounded-full ' + (TIER_COLOR[evidenceTier] || TIER_COLOR[3])}>
                            Tier {evidenceTier}
                        </span>
                    </div>

                    <p className="text-sm text-teal-600 font-medium mb-6">
                        {compound.category}
                    </p>

                    <div className="mb-6">
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            About
                        </h2>
                        <p className="text-gray-700 leading-relaxed">
                            {compound.description}
                        </p>
                    </div>

                    {compound.ailments && compound.ailments.length > 0 && (
                        <div className="mb-6">
                            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                Addresses
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                {compound.ailments.map((ailment) => (
                                    <span key={ailment.id} className="text-xs bg-teal-50 text-teal-700 px-3 py-1 rounded-full border border-teal-200">
                                        {ailment.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mb-6">
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            Evidence level
                        </h2>
                        <p className="text-gray-700 text-sm">
                            {TIER_DESC[evidenceTier]}
                        </p>
                    </div>

                    <div className="mb-6">
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            Source
                        </h2>
                        <p className="text-gray-700 text-sm">
                            {compound.source_url}
                        </p>
                    </div>

                    <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <p className="text-xs text-gray-500">
                            Contraindication check available after login — coming soon.
                        </p>
                    </div>

                </div>
            </div>
        </div>
    )
}