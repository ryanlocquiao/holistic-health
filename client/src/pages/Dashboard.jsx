import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Bookmark, Pill, Leaf, Search, ArrowRight, Plus, X, CheckCircle, AlertCircle } from 'lucide-react'
import Nav from '../components/Nav.jsx'

const API_URL = import.meta.env.VITE_API_URL
const TOAST_TIMEOUT_MS = 3000
const MEDICATION_RESULT_LIMIT = 8
const RESET_SESSION_ERROR_CODES = new Set(['AUTH_TOKEN_MISSING', 'AUTH_USER_NOT_FOUND', 'TOKEN_INVALID'])

function getStoredToken() {
    return localStorage.getItem('token')
}

function clearStoredAuth() {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
}

/**
 * Reads the persisted auth user defensively.
 *
 * If localStorage contains malformed JSON, auth state is cleared so the app can
 * send the user back through login instead of repeatedly failing dashboard load.
 */
function readStoredUser() {
    const storedUser = localStorage.getItem('user')

    if (!storedUser) return null

    try {
        return JSON.parse(storedUser)
    } catch {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        return null
    }
}

async function parseJsonSafely(response) {
    try {
        return await response.json()
    } catch {
        return {}
    }
}

/**
 * Authenticated user dashboard.
 *
 * Responsibilities:
 * - Loads the current user from localStorage and redirects anonymous users.
 * - Shows saved remedies returned by the bookmarks API.
 * - Lets users maintain a saved medication list for interaction checks.
 *
 * Run/test:
 * - Start API with `cd server && npm start`.
 * - Start UI with `cd client && npm run dev`.
 * - Log in, open `/dashboard`, add/remove medications, and verify toasts.
 * - Use `/dashboard?admin=true` for a no-token visual smoke test.
 */
export default function Dashboard() {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [bookmarks, setBookmarks] = useState([])
    const [bookmarksLoading, setBookmarksLoading] = useState(true)

    const [medCatalog, setMedCatalog] = useState([])
    const [savedMeds, setSavedMeds] = useState([])
    const [medsLoading, setMedsLoading] = useState(true)
    const [medsSaving, setMedsSaving] = useState(false)
    const [medQuery, setMedQuery] = useState('')
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [toast, setToast] = useState(null)
    const searchRef = useRef(null)
    const dropdownRef = useRef(null)

    const navigate = useNavigate()
    const location = useLocation()

    const showToast = useCallback((type, msg) => {
        setToast({ type, msg })
        window.setTimeout(() => setToast(null), TOAST_TIMEOUT_MS)
    }, [])

    /**
     * Exchanges a persisted refresh token for a new short-lived access token.
     *
     * This keeps medication saves working after the access token expires. The
     * server rotates refresh tokens, so the replacement refresh token must be
     * stored immediately when one is returned.
     */
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
            if (data.user) {
                localStorage.setItem('user', JSON.stringify(data.user))
                setUser(data.user)
            }

            return nextAccessToken
        } catch {
            return null
        }
    }, [])

    /**
     * Performs an authenticated request and retries once for TOKEN_EXPIRED.
     *
     * Run/test:
     * - Log in, force an expired access token in localStorage, keep a valid
     *   refresh token, then add a medication from the dashboard.
     * - The request should refresh once and save without showing an error.
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
        if (!nextAccessToken) {
            clearStoredAuth()
            navigate('/login')
            return res
        }

        return fetch(url, {
            ...options,
            headers: {
                ...(options.headers || {}),
                Authorization: `Bearer ${nextAccessToken}`
            }
        })
    }, [navigate, refreshAccessToken])

    useEffect(() => {
        const params  = new URLSearchParams(location.search)
        const isAdmin = params.get('admin') === 'true'

        if (isAdmin) {
            setUser({ email: 'admin@hh.local' })
            setLoading(false)
            return
        }

        const token = getStoredToken()
        const storedUser = readStoredUser()

        if (!token || !storedUser) {
            navigate('/login')
            return
        }

        setUser(storedUser)
        setLoading(false)
    }, [navigate, location.search])

    useEffect(() => {
        const token = getStoredToken()
        if (!token) {
            setBookmarks([])
            setBookmarksLoading(false)
            return
        }

        async function fetchBookmarks() {
            try {
                const res = await fetchWithAuthRetry(`${API_URL}/api/bookmarks`)
                if (!res.ok) return
                setBookmarks(await res.json())
            } catch {
                // Non-fatal
            } finally {
                setBookmarksLoading(false)
            }
        }

        fetchBookmarks()
    }, [fetchWithAuthRetry])

    useEffect(() => {
        const token = getStoredToken()
        if (!token) {
            setMedCatalog([])
            setSavedMeds([])
            setMedsLoading(false)
            return
        }

        async function fetchMedications() {
            setMedsLoading(true)
            try {
                const [catRes, savedRes] = await Promise.all([
                    fetch(`${API_URL}/api/medications`),
                    fetchWithAuthRetry(`${API_URL}/api/medications/mine`)
                ])
                if (catRes.ok)   setMedCatalog(await catRes.json())
                if (savedRes.ok) setSavedMeds(await savedRes.json())
            } catch {
                showToast('error', 'Failed to load medications.')
            } finally {
                setMedsLoading(false)
            }
        }

        fetchMedications()
    }, [fetchWithAuthRetry, showToast])

    useEffect(() => {
        function handleClick(e) {
            if (
                dropdownRef.current && !dropdownRef.current.contains(e.target) &&
                searchRef.current   && !searchRef.current.contains(e.target)
            ) setDropdownOpen(false)
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    function handleLogout() {
        clearStoredAuth()
        navigate('/')
    }

    const savedMedIds = useMemo(
        () => new Set(savedMeds.map((medication) => medication.id)),
        [savedMeds]
    )

    const normalizedMedQuery = medQuery.trim().toLowerCase()
    const filteredMeds = useMemo(() => {
        if (!normalizedMedQuery) return []

        return medCatalog.filter((medication) => (
            !savedMedIds.has(medication.id) &&
            (
                medication.name.toLowerCase().includes(normalizedMedQuery) ||
                (medication.common_name || '').toLowerCase().includes(normalizedMedQuery)
            )
        ))
    }, [medCatalog, normalizedMedQuery, savedMedIds])

    async function addMedication(medication) {
        if (savedMedIds.has(medication.id)) {
            setMedQuery('')
            setDropdownOpen(false)
            return
        }

        const previous = savedMeds
        const next = [...savedMeds, medication]
        setSavedMeds(next)
        setMedQuery('')
        setDropdownOpen(false)

        const saved = await syncMeds(next)
        if (!saved) setSavedMeds(previous)
    }

    async function removeMedication(id) {
        const previous = savedMeds
        const next = savedMeds.filter(m => m.id !== id)
        setSavedMeds(next)

        const saved = await syncMeds(next)
        if (!saved) setSavedMeds(previous)
    }

    /**
     * Persists the full selected medication list.
     *
     * Returns a boolean so optimistic UI updates can roll back immediately if
     * the server rejects the save. This fixes the stale "saved until reload"
     * behavior described in FIXES.md.
     */
    async function syncMeds(list) {
        const token = getStoredToken()
        if (!token) {
            navigate('/login')
            return false
        }

        setMedsSaving(true)
        try {
            const res = await fetchWithAuthRetry(`${API_URL}/api/medications/mine`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ medication_ids: list.map(m => m.id) })
            })
            if (!res.ok) throw new Error()
            showToast('success', 'Medications updated.')
            return true
        } catch {
            showToast('error', 'Failed to save. Please try again.')
            return false
        } finally {
            setMedsSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F9F6F0] flex items-center justify-center selection:bg-[#4E7A5E] selection:text-white">
                <div className="w-8 h-8 border-2 border-[#4E7A5E] border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    const userInitial = user?.email?.charAt(0).toUpperCase() || 'U'

    return (
        <div className="relative min-h-screen font-sans selection:bg-[#4E7A5E] selection:text-white flex flex-col bg-[#F9F6F0]">
            <Nav />

            <main className="max-w-6xl mx-auto px-6 pt-6 pb-24 animate-in fade-in duration-500 w-full flex-1">
                <div className="grid lg:grid-cols-12 gap-8 items-start">

                    <div className="lg:col-span-4 bg-[#1A3326] text-[#F9F6F0] rounded-[2rem] p-8 shadow-xl relative overflow-hidden group">
                        <div className="absolute -right-6 -bottom-6 text-[#2C4C3B] opacity-50 transform -rotate-12 group-hover:rotate-0 transition-transform duration-700 pointer-events-none">
                            <Leaf className="w-48 h-48" />
                        </div>

                        <div className="relative z-10">
                            <div className="w-20 h-20 bg-[#2C4C3B] rounded-full flex items-center justify-center mb-6 border-4 border-[#1A3326] shadow-md">
                                <span className="text-3xl font-serif text-[#A3B899]">{userInitial}</span>
                            </div>

                            <h1 className="text-2xl font-serif font-medium text-white mb-1">My Dashboard</h1>
                            <p className="text-[#A3B899] text-sm mb-10">{user?.email}</p>

                            <div className="space-y-3">
                                <button
                                    type="button"
                                    className="w-full flex items-center justify-between p-4 rounded-xl bg-[#2C4C3B] text-white font-medium text-sm border border-transparent hover:border-[#4E7A5E] transition-all"
                                >
                                    <span className="flex items-center">
                                        <Bookmark className="w-4 h-4 mr-3 text-[#A3B899]" />
                                        Saved Remedies
                                    </span>
                                    <span className="bg-[#1A3326] px-2.5 py-1 rounded-md text-xs text-[#A3B899]">
                                        {bookmarksLoading ? '-' : bookmarks.length}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-[#2C4C3B] text-[#A3B899] font-medium text-sm transition-all border border-transparent hover:border-[#4E7A5E]"
                                >
                                    <span className="flex items-center">
                                        <Pill className="w-4 h-4 mr-3" />
                                        Medications
                                    </span>
                                    <span className="bg-transparent px-2.5 py-1 rounded-md text-xs">
                                        {medsLoading ? '-' : savedMeds.length}
                                    </span>
                                </button>
                            </div>

                            <div className="md:hidden mt-8 pt-6 border-t border-[#2C4C3B]">
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="w-full text-center text-sm font-medium text-[#A3B899] hover:text-white transition-colors"
                                >
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-8 space-y-8">

                        {toast && (
                            <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm shadow-sm
                                ${toast.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}
                            >
                                {toast.type === 'success'
                                    ? <CheckCircle className="h-4 w-4 shrink-0" />
                                    : <AlertCircle className="h-4 w-4 shrink-0" />
                                }
                                {toast.msg}
                            </div>
                        )}

                        <div className="bg-[#E9E4D8] rounded-[2rem] p-8 md:p-10 shadow-sm border border-[#E9E4D8]">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-serif font-medium text-[#1A3326] flex items-center">
                                    <Bookmark className="w-5 h-5 mr-3 text-[#4E7A5E]" />
                                    Saved Remedies
                                </h2>
                                {!bookmarksLoading && bookmarks.length > 0 && (
                                    <span className="text-sm text-[#3E5C4A] font-medium">
                                        {bookmarks.length} saved
                                    </span>
                                )}
                            </div>

                            {bookmarksLoading ? (
                                <div className="flex justify-center py-10">
                                    <div className="w-6 h-6 border-2 border-[#4E7A5E] border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : bookmarks.length === 0 ? (
                                <div className="bg-white rounded-2xl p-10 text-center flex flex-col items-center shadow-sm">
                                    <h3 className="text-[#1A3326] font-medium mb-2">No remedies saved yet</h3>
                                    <p className="text-sm text-[#3E5C4A] max-w-sm mx-auto mb-8">
                                        Discover natural alternatives and bookmark them to build your personal holistic library.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/')}
                                        className="text-sm font-medium bg-[#4E7A5E] text-white px-6 py-2.5 rounded-full hover:bg-[#3E5C4A] transition-colors flex items-center shadow-md"
                                    >
                                        <Search className="w-4 h-4 mr-2" /> Browse Directory
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {bookmarks.map(b => (
                                        <button
                                            key={b.id}
                                            type="button"
                                            onClick={() => navigate(`/remedy/${b.id}`)}
                                            className="w-full flex items-center justify-between p-4 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all text-left group"
                                        >
                                            <div>
                                                <p className="font-medium text-[#1A3326] group-hover:text-[#4E7A5E] transition-colors">
                                                    {b.name}
                                                </p>
                                                <p className="text-xs text-[#3E5C4A] mt-0.5">{b.category}</p>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-[#4E7A5E] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="bg-[#E9E4D8] rounded-[2rem] p-8 md:p-10 shadow-sm border border-[#E9E4D8]">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-serif font-medium text-[#1A3326] flex items-center">
                                    <Pill className="w-5 h-5 mr-3 text-[#4E7A5E]" />
                                    My Medications
                                </h2>
                                {medsSaving && (
                                    <span className="text-xs text-[#4E7A5E] animate-pulse">Saving...</span>
                                )}
                            </div>

                            <div className="relative mb-4">
                                <div
                                    ref={searchRef}
                                    className="flex min-w-0 items-center gap-2 rounded-xl border border-[#D7E2D8] bg-white px-3 py-2.5
                                               focus-within:border-[#4E7A5E] focus-within:ring-1 focus-within:ring-[#4E7A5E] transition-all"
                                >
                                    <Search className="h-4 w-4 shrink-0 text-[#4E7A5E]" />
                                    <input
                                        type="text"
                                        placeholder="Search medications to add..."
                                        value={medQuery}
                                        onChange={(event) => {
                                            setMedQuery(event.target.value)
                                            setDropdownOpen(event.target.value.trim().length > 0)
                                        }}
                                        onFocus={() => medQuery.trim().length > 0 && setDropdownOpen(true)}
                                        className="min-w-0 flex-1 bg-transparent text-sm text-[#2C4C3B] placeholder-[#A3B899] outline-none"
                                    />
                                    {medQuery && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setMedQuery('')
                                                setDropdownOpen(false)
                                            }}
                                            className="text-[#A3B899] hover:text-[#4E7A5E] transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>

                                {dropdownOpen && (
                                    <ul
                                        ref={dropdownRef}
                                        className="absolute z-10 mt-1 w-full rounded-xl border border-[#E9E4D8] bg-white shadow-lg overflow-hidden"
                                    >
                                        {filteredMeds.length === 0 ? (
                                            <li className="px-4 py-3 text-sm text-[#4E7A5E]">
                                                No results for "{medQuery}"
                                            </li>
                                        ) : (
                                            filteredMeds.slice(0, MEDICATION_RESULT_LIMIT).map(med => (
                                                <li key={med.id}>
                                                    <button
                                                        type="button"
                                                        onClick={() => addMedication(med)}
                                                        className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-[#F9F6F0] transition-colors group"
                                                    >
                                                        <div>
                                                            <p className="text-sm font-medium text-[#1A3326]">{med.name}</p>
                                                            {med.common_name && (
                                                                <p className="text-xs text-[#4E7A5E]">{med.common_name}</p>
                                                            )}
                                                        </div>
                                                        <Plus className="h-4 w-4 text-[#A3B899] group-hover:text-[#4E7A5E] transition-colors shrink-0" />
                                                    </button>
                                                </li>
                                            ))
                                        )}
                                    </ul>
                                )}
                            </div>

                            {medsLoading ? (
                                <div className="flex justify-center py-10">
                                    <div className="w-6 h-6 border-2 border-[#4E7A5E] border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : savedMeds.length === 0 ? (
                                <div className="bg-white rounded-2xl p-10 text-center flex flex-col items-center shadow-sm">
                                    <h3 className="text-[#1A3326] font-medium mb-2">Safety first</h3>
                                    <p className="text-sm text-[#3E5C4A] max-w-sm mx-auto">
                                        Add your medications above to automatically check for interactions with natural remedies.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {savedMeds.map(med => (
                                        <div
                                            key={med.id}
                                            className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm group"
                                        >
                                            <div>
                                                <p className="text-sm font-medium text-[#1A3326]">{med.name}</p>
                                                {med.common_name && (
                                                    <p className="text-xs text-[#4E7A5E]">{med.common_name}</p>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeMedication(med.id)}
                                                title="Remove"
                                                className="ml-3 rounded-full p-1.5 text-[#A3B899] hover:bg-red-50 hover:text-red-500 transition-colors shrink-0"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                    <p className="pt-1 text-xs text-[#A3B899]">
                                        {savedMeds.length} medication{savedMeds.length !== 1 ? 's' : ''} saved
                                        {' '}- checked against all remedy interactions.
                                    </p>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </main>
        </div>
    )
}
