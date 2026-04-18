import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

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

export default function RemedyDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [compound, setCompound] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetch(import.meta.env.VITE_API_URL + '/api/compounds/' + id)
            .then(function(res) {
                if (!res.ok) throw new Error('Not found')
                return res.json()
            })
            .then(function(data) {
                setCompound(data)
                setLoading(false)
            })
            .catch(function() {
                setError('Compound not found.')
                setLoading(false)
            })
    }, [id])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-500">Loading...</p>
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

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-10">
            <div className="max-w-2xl mx-auto">
                <button
                    onClick={function() { navigate(-1) }}
                    className="text-teal-600 text-sm mb-6 hover:underline"
                >
                    Back to results
                </button>

                <div className="bg-white rounded-2xl border border-gray-200 p-8">

                    <div className="flex items-start justify-between mb-4">
                        <h1 className="text-3xl font-bold text-gray-900">
                            {compound.name}
                        </h1>
                        <span className={'text-xs font-medium px-3 py-1 rounded-full ' + (TIER_COLOR[compound.evidence_tier] || TIER_COLOR[3])}>
                            Tier {compound.evidence_tier}
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
                                {compound.ailments.map(function(a) {
                                    return (
                                        <span key={a.id} className="text-xs bg-teal-50 text-teal-700 px-3 py-1 rounded-full border border-teal-200">
                                            {a.name}
                                        </span>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    <div className="mb-6">
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            Evidence level
                        </h2>
                        <p className="text-gray-700 text-sm">
                            {TIER_DESC[compound.evidence_tier]}
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