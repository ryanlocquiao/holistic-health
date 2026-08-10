import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Bot, Sparkles } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL
const RESET_SESSION_ERROR_CODES = new Set(['AUTH_TOKEN_MISSING', 'AUTH_USER_NOT_FOUND', 'TOKEN_INVALID'])

function getStoredToken() {
    return localStorage.getItem('token')
}

function clearStoredAuth() {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
}

async function parseJsonSafely(response) {
    try {
        return await response.json()
    } catch {
        return {}
    }
}

/**
 * AI recommendation card for the dashboard.
 *
 * Responsibilities:
 * - Requests profile-based recommendations from the protected chatbot API.
 * - Refreshes an expired access token once before surfacing an auth error.
 * - Renders loading, error, empty, and recommendation states.
 *
 * Run/test:
 * - Start the API with `cd server && npm start`.
 * - Start the UI with `cd client && npm run dev`.
 * - Log in, open `/dashboard`, and click "Get Recommendations".
 */
export default function Chatbot() {
    const [recommendations, setRecommendations] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const navigate = useNavigate()

    const refreshAccessToken = useCallback(async () => {
        const refreshToken = localStorage.getItem('refreshToken')
        if (!refreshToken) return null

        try {
            const res = await fetch(`${API_URL}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            })

            if (!res.ok) return null

            const data = await parseJsonSafely(res)
            const nextAccessToken = data.accessToken || data.token

            if (!nextAccessToken) return null

            localStorage.setItem('token', nextAccessToken)
            if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken)
            if (data.user) localStorage.setItem('user', JSON.stringify(data.user))

            return nextAccessToken
        } catch {
            return null
        }
    }, [])

    /**
     * Performs a protected request and retries once when the access JWT has
     * expired. Auth codes that require a fresh login clear local auth state.
     */
    const fetchWithAuthRetry = useCallback(async (url, options = {}) => {
        const token = getStoredToken()
        const headers = {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`
        }

        const res = await fetch(url, { ...options, headers })

        if (res.status !== 401) return res

        const authError = await parseJsonSafely(res.clone())
        if (RESET_SESSION_ERROR_CODES.has(authError.code)) {
            clearStoredAuth()
            navigate('/login')
            return res
        }

        if (authError.code !== 'TOKEN_EXPIRED') return res

        const nextAccessToken = await refreshAccessToken()
        if (!nextAccessToken) return res

        return fetch(url, {
            ...options,
            headers: {
                ...(options.headers || {}),
                Authorization: `Bearer ${nextAccessToken}`
            }
        })
    }, [navigate, refreshAccessToken])

    async function fetchRecommendations() {
        if (!getStoredToken()) {
            navigate('/login')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const res = await fetchWithAuthRetry(`${API_URL}/api/chatbot/recommend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
            const data = await parseJsonSafely(res.clone())

            if (!res.ok) {
                throw new Error(data.error || 'Failed to fetch recommendations.')
            }

            const nextRecommendations = Array.isArray(data.recommendations)
                ? data.recommendations
                : []

            if (nextRecommendations.length === 0) {
                throw new Error('No recommendations returned. Please try again.')
            }

            setRecommendations(nextRecommendations)
        } catch (err) {
            setError(err.message || 'Something went wrong. Please try again later.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className="rounded-[2rem] border border-[#142d20] bg-[#1A3A2A] p-8 text-white shadow-md" aria-label="Holistic assistant">
            <div className="mb-6 flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EAE4D9] text-[#1A3A2A]">
                    <Bot className="h-5 w-5" />
                </div>
                <h2 className="font-serif text-2xl text-[#EAE4D9]">Holistic Assistant</h2>
            </div>

            <div className="mb-6 space-y-4 text-sm text-gray-200" aria-live="polite">
                {recommendations.length === 0 && !loading && !error && (
                    <div className="rounded-xl border border-[#1f422f] bg-[#12281D] p-4">
                        <p className="italic opacity-90">
                            "Curious about what else nature has to offer? I can suggest new remedies tailored specifically for you."
                        </p>
                    </div>
                )}

                {loading && (
                    <div className="flex justify-center py-6">
                        <div className="flex animate-pulse space-x-2">
                            <div className="h-2.5 w-2.5 rounded-full bg-[#EAE4D9]" />
                            <div className="h-2.5 w-2.5 rounded-full bg-[#EAE4D9]" />
                            <div className="h-2.5 w-2.5 rounded-full bg-[#EAE4D9]" />
                        </div>
                    </div>
                )}

                {error && (
                    <div className="flex gap-2 rounded-xl border border-red-400/30 bg-red-950/30 p-4 text-red-100">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                {recommendations.length > 0 && (
                    <div className="scrollbar-hidden max-h-64 space-y-3 overflow-y-auto pr-2">
                        {recommendations.map((rec, index) => (
                            <div key={`${rec.remedy}-${index}`} className="rounded-xl border border-[#1f422f] bg-[#12281D] p-4">
                                <h3 className="mb-1 text-base font-bold text-[#EAE4D9]">{rec.remedy}</h3>
                                <p className="mb-2 text-xs opacity-90">
                                    <span className="font-semibold text-[#EAE4D9]">Why:</span> {rec.reason}
                                </p>
                                <p className="text-xs text-yellow-100 opacity-80">
                                    <span className="font-semibold">Precaution:</span> {rec.precautions}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <button
                type="button"
                className="flex w-full items-center justify-center rounded-lg bg-[#2a4a3a] py-3 font-semibold text-white transition-colors duration-200 hover:bg-[#345c48] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={fetchRecommendations}
                disabled={loading}
            >
                <Sparkles className="mr-2 h-4 w-4" />
                {loading ? 'Analyzing Profile...' : 'Get Recommendations'}
            </button>
        </section>
    )
}
