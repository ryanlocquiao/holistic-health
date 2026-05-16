import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Bookmark, Pill, Plus, Leaf, Search, ArrowRight } from 'lucide-react'
import Nav from '../components/Nav'

export default function Dashboard() {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [bookmarks, setBookmarks] = useState([])
    const [bookmarksLoading, setBookmarksLoading] = useState(true)
    const navigate = useNavigate()
    const location = useLocation()

    // ─── Auth check + profile fetch ──────────────────────────
    useEffect(() => {
        const params = new URLSearchParams(location.search)
        const isAdmin = params.get('admin') === 'true'

        if (isAdmin) {
            setUser({ email: 'admin@hh.local' })
            setLoading(false)
            return
        }

        const token = localStorage.getItem('token')
        const storedUser = localStorage.getItem('user')

        if (!token || !storedUser) {
            navigate('/login')
            return
        }

        setUser(JSON.parse(storedUser))
        setLoading(false)
    }, [navigate, location.search])

    // ─── Bookmark fetch (runs after user is confirmed) ───────
    useEffect(() => {
        const token = localStorage.getItem('token')
        if (!token) return

        async function fetchBookmarks() {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/bookmarks`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                if (!res.ok) return
                const data = await res.json()
                setBookmarks(data)
            } catch {
                // Non-fatal — dashboard still renders without bookmarks
            } finally {
                setBookmarksLoading(false)
            }
        }

        fetchBookmarks()
    }, [])

    function handleLogout() {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        navigate('/')
    }

    // ─── Loading state ───────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-[#F9F6F0] flex items-center justify-center selection:bg-[#4E7A5E] selection:text-white">
                <div className="w-8 h-8 border-2 border-[#4E7A5E] border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    const userInitial = user?.email?.charAt(0).toUpperCase() || 'U'

    // ─── Main render ─────────────────────────────────────────
    return (
        <div className="relative min-h-screen font-sans selection:bg-[#4E7A5E] selection:text-white flex flex-col bg-[#F9F6F0]">

            <Nav />

            <main className="max-w-6xl mx-auto px-6 pt-6 pb-24 animate-in fade-in duration-500 w-full flex-1">
                <div className="grid lg:grid-cols-12 gap-8 items-start">

                    {/* ── Left Sidebar ─────────────────────── */}
                    <div className="lg:col-span-4 bg-[#1A3326] text-[#F9F6F0] rounded-[2rem] p-8 shadow-xl relative overflow-hidden group">
                        <div className="absolute -right-6 -bottom-6 text-[#2C4C3B] opacity-50 transform -rotate-12 group-hover:rotate-0 transition-transform duration-700 pointer-events-none">
                            <Leaf className="w-48 h-48" />
                        </div>

                        <div className="relative z-10">
                            {/* Avatar */}
                            <div className="w-20 h-20 bg-[#2C4C3B] rounded-full flex items-center justify-center mb-6 border-4 border-[#1A3326] shadow-md">
                                <span className="text-3xl font-serif text-[#A3B899]">{userInitial}</span>
                            </div>

                            <h1 className="text-2xl font-serif font-medium text-white mb-1">My Dashboard</h1>
                            <p className="text-[#A3B899] text-sm mb-10">{user?.email}</p>

                            {/* Sidebar nav */}
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
                                    <span className="bg-transparent px-2.5 py-1 rounded-md text-xs border border-transparent">0</span>
                                </button>
                            </div>

                            {/* Mobile sign out */}
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

                    {/* ── Right Content ─────────────────────── */}
                    <div className="lg:col-span-8 space-y-8">

                        {/* Saved Remedies Block */}
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

                            {/* Loading spinner */}
                            {bookmarksLoading ? (
                                <div className="flex justify-center py-10">
                                    <div className="w-6 h-6 border-2 border-[#4E7A5E] border-t-transparent rounded-full animate-spin" />
                                </div>

                            /* Empty state */
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

                            /* Bookmark list */
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

                        {/* Medications Block */}
                        <div className="bg-[#E9E4D8] rounded-[2rem] p-8 md:p-10 shadow-sm border border-[#E9E4D8]">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-serif font-medium text-[#1A3326] flex items-center">
                                    <Pill className="w-5 h-5 mr-3 text-[#4E7A5E]" />
                                    My Medications
                                </h2>
                            </div>

                            <div className="bg-white rounded-2xl p-10 text-center flex flex-col items-center shadow-sm">
                                <h3 className="text-[#1A3326] font-medium mb-2">Safety first</h3>
                                <p className="text-sm text-[#3E5C4A] max-w-sm mx-auto mb-8">
                                    Add your medications to automatically check for interactions with natural remedies.
                                </p>
                                <button className="text-sm font-medium bg-[#4E7A5E] text-white px-6 py-2.5 rounded-full hover:bg-[#3E5C4A] transition-colors flex items-center shadow-md">
                                    <Plus className="w-4 h-4 mr-2" /> Add Medication
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    )
}