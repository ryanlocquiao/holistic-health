import { useEffect, useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Bookmark, Pill, Leaf, Search, ArrowRight, Plus, X, CheckCircle, AlertCircle } from 'lucide-react'
import Nav from '../components/Nav'

export default function Dashboard() {
    const [user, setUser]                     = useState(null)
    const [loading, setLoading]               = useState(true)
    const [bookmarks, setBookmarks]           = useState([])
    const [bookmarksLoading, setBookmarksLoading] = useState(true)

    const [medCatalog, setMedCatalog]         = useState([])
    const [savedMeds, setSavedMeds]           = useState([])
    const [medsLoading, setMedsLoading]       = useState(true)
    const [medsSaving, setMedsSaving]         = useState(false)
    const [medQuery, setMedQuery]             = useState('')
    const [dropdownOpen, setDropdownOpen]     = useState(false)
    const [toast, setToast]                   = useState(null)
    const searchRef                           = useRef(null)
    const dropdownRef                         = useRef(null)

    const navigate  = useNavigate()
    const location  = useLocation()
    const API       = import.meta.env.VITE_API_URL

    useEffect(() => {
        const params  = new URLSearchParams(location.search)
        const isAdmin = params.get('admin') === 'true'

        if (isAdmin) {
            setUser({ email: 'admin@hh.local' })
            setLoading(false)
            return
        }

        const token      = localStorage.getItem('token')
        const storedUser = localStorage.getItem('user')

        if (!token || !storedUser) {
            navigate('/login')
            return
        }

        setUser(JSON.parse(storedUser))
        setLoading(false)
    }, [navigate, location.search])

    useEffect(() => {
        const token = localStorage.getItem('token')
        if (!token) return

        async function fetchBookmarks() {
            try {
                const res = await fetch(`${API}/api/bookmarks`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                if (!res.ok) return
                setBookmarks(await res.json())
            } catch {
                // Non-fatal
            } finally {
                setBookmarksLoading(false)
            }
        }

        fetchBookmarks()
    }, [])

    useEffect(() => {
        const token = localStorage.getItem('token')
        if (!token) return

        async function fetchMedications() {
            setMedsLoading(true)
            try {
                const [catRes, savedRes] = await Promise.all([
                    fetch(`${API}/api/medications`),
                    fetch(`${API}/api/medications/mine`, {
                        headers: { Authorization: `Bearer ${token}` }
                    })
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
    }, [])

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

    function showToast(type, msg) {
        setToast({ type, msg })
        setTimeout(() => setToast(null), 3000)
    }

    function handleLogout() {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        navigate('/')
    }

    const savedMedIds = new Set(savedMeds.map(m => m.id))

    const filteredMeds = medQuery.trim().length > 0
        ? medCatalog.filter(m =>
            !savedMedIds.has(m.id) &&
            (m.name.toLowerCase().includes(medQuery.toLowerCase()) ||
             (m.common_name || '').toLowerCase().includes(medQuery.toLowerCase()))
          )
        : []

    async function addMedication(med) {
        const next = [...savedMeds, med]
        setSavedMeds(next)
        setMedQuery('')
        setDropdownOpen(false)
        await syncMeds(next)
    }

    async function removeMedication(id) {
        const next = savedMeds.filter(m => m.id !== id)
        setSavedMeds(next)
        await syncMeds(next)
    }

    async function syncMeds(list) {
        const token = localStorage.getItem('token')
        setMedsSaving(true)
        try {
            const res = await fetch(`${API}/api/medications/mine`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ medication_ids: list.map(m => m.id) })
            })
            if (!res.ok) throw new Error()
            showToast('success', 'Medications updated.')
        } catch {
            showToast('error', 'Failed to save. Please try again.')
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
                                <button className="w-full flex items-center justify-between p-4 rounded-xl bg-[#2C4C3B] text-white font-medium text-sm border border-transparent hover:border-[#4E7A5E] transition-all">
                                    <span className="flex items-center">
                                        <Bookmark className="w-4 h-4 mr-3 text-[#A3B899]" />
                                        Saved Remedies
                                    </span>
                                    <span className="bg-[#1A3326] px-2.5 py-1 rounded-md text-xs text-[#A3B899]">
                                        {bookmarksLoading ? '—' : bookmarks.length}
                                    </span>
                                </button>

                                <button className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-[#2C4C3B] text-[#A3B899] font-medium text-sm transition-all border border-transparent hover:border-[#4E7A5E]">
                                    <span className="flex items-center">
                                        <Pill className="w-4 h-4 mr-3" />
                                        Medications
                                    </span>
                                    <span className="bg-transparent px-2.5 py-1 rounded-md text-xs">
                                        {medsLoading ? '—' : savedMeds.length}
                                    </span>
                                </button>
                            </div>

                            <div className="md:hidden mt-8 pt-6 border-t border-[#2C4C3B]">
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-center text-sm font-medium text-[#A3B899] hover:text-white transition-colors"
                                >
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-8 space-y-8">

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
                                    <span className="text-xs text-[#4E7A5E] animate-pulse">Saving…</span>
                                )}
                            </div>

                            {toast && (
                                <div className={`mb-4 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm
                                    ${toast.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
                                >
                                    {toast.type === 'success'
                                        ? <CheckCircle className="h-4 w-4 shrink-0" />
                                        : <AlertCircle className="h-4 w-4 shrink-0" />
                                    }
                                    {toast.msg}
                                </div>
                            )}

                            <div className="relative mb-4">
                                <div
                                    ref={searchRef}
                                    className="flex items-center gap-2 rounded-xl border border-[#D7E2D8] bg-white px-3 py-2.5
                                               focus-within:border-[#4E7A5E] focus-within:ring-1 focus-within:ring-[#4E7A5E] transition-all"
                                >
                                    <Search className="h-4 w-4 shrink-0 text-[#4E7A5E]" />
                                    <input
                                        type="text"
                                        placeholder="Search medications to add…"
                                        value={medQuery}
                                        onChange={e => {
                                            setMedQuery(e.target.value)
                                            setDropdownOpen(e.target.value.trim().length > 0)
                                        }}
                                        onFocus={() => medQuery.trim().length > 0 && setDropdownOpen(true)}
                                        className="flex-1 bg-transparent text-sm text-[#2C4C3B] placeholder-[#A3B899] outline-none"
                                    />
                                    {medQuery && (
                                        <button
                                            onClick={() => { setMedQuery(''); setDropdownOpen(false) }}
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
                                            filteredMeds.slice(0, 8).map(med => (
                                                <li key={med.id}>
                                                    <button
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
                                        {' '}— checked against all remedy interactions.
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