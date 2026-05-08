import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Sprout, Bookmark, Pill, Plus, Leaf, Search } from 'lucide-react'

/**
 * User dashboard page
 *
 * Responsibilities:
 * - Protect the view by checking for a stored `token` and `user` in localStorage.
 * - Provide a simple dashboard UX for saved remedies and medications.
 *
 * Notes:
 * - For local/admin preview, append `?admin=true` to the URL.
 */
export default function Dashboard() {
    const [authState] = useState(() => {
        const params = new URLSearchParams(window.location.search)

        if (params.get('admin') === 'true') {
            return { user: { email: 'admin@local' }, redirectToLogin: false }
        }

        const token = localStorage.getItem('token')
        const storedUser = localStorage.getItem('user')

        if (!token || !storedUser) {
            return { user: null, redirectToLogin: true }
        }

        try {
            return { user: JSON.parse(storedUser), redirectToLogin: false }
        } catch {
            console.warn('Failed to parse stored user, clearing localStorage')
            localStorage.removeItem('user')
            localStorage.removeItem('token')
            return { user: null, redirectToLogin: true }
        }
    })
    const { user, redirectToLogin } = authState
    const navigate = useNavigate()

    useEffect(() => {
        if (redirectToLogin) {
            navigate('/login')
        }
    }, [navigate, redirectToLogin])

    function handleLogout() {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        navigate('/')
    }

    if (redirectToLogin) {
        return (
            <div className="min-h-screen bg-[#F9F6F0] flex items-center justify-center selection:bg-[#4E7A5E] selection:text-white">
                <div className="w-8 h-8 border-2 border-[#4E7A5E] border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-[#F9F6F0] flex items-center justify-center selection:bg-[#4E7A5E] selection:text-white">
                <div className="w-8 h-8 border-2 border-[#4E7A5E] border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    // Extract first letter of email for avatars
    const userInitial = user?.email?.charAt(0).toUpperCase() || 'U'

    return (
        <div className="relative min-h-screen font-sans selection:bg-[#4E7A5E] selection:text-white overflow-x-hidden bg-[#F9F6F0]">
            
            {/* Dashboard Navigation */}
            <nav className="flex items-center justify-between px-8 py-6 w-full relative z-30 max-w-7xl mx-auto">
                <Link to="/" className="flex items-center space-x-2 text-2xl font-serif font-bold text-[#1A3326] transition-opacity hover:opacity-80">
                    <Sprout className="w-8 h-8 text-[#4E7A5E]" />
                    <span>Holistic Health</span>
                </Link>
                
                <div className="hidden md:flex space-x-8 text-sm font-medium tracking-wide text-[#1A3326]">
                    <Link to="/" className="hover:text-[#4E7A5E] transition-colors">Remedies</Link>
                    <Link to="/" className="hover:text-[#4E7A5E] transition-colors">Ailments</Link>
                    <span className="text-[#4E7A5E] border-b-2 border-[#4E7A5E] pb-1 cursor-default">My Dashboard</span>
                </div>
                
                {/* User Avatar - Acts as Sign Out */}
                <button 
                    onClick={handleLogout}
                    title="Sign out"
                    className="hidden md:flex items-center space-x-3 cursor-pointer group p-1.5 rounded-full hover:bg-white transition-colors border border-transparent hover:border-[#E9E4D8]"
                >
                    <div className="w-9 h-9 rounded-full bg-[#E9E4D8] text-[#4E7A5E] flex items-center justify-center font-bold text-sm shadow-sm group-hover:bg-[#4E7A5E] group-hover:text-white transition-colors">
                        {userInitial}
                    </div>
                </button>
            </nav>

            <main className="max-w-6xl mx-auto px-6 pt-6 pb-24 animate-in fade-in duration-500">
                <div className="grid lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Left Sidebar Profile */}
                    <div className="lg:col-span-4 bg-[#1A3326] text-[#F9F6F0] rounded-[2rem] p-8 shadow-xl relative overflow-hidden group">
                        {/* Subtle background leaf graphic */}
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
                                    <span className="flex items-center"><Bookmark className="w-4 h-4 mr-3 text-[#A3B899]" /> Saved Remedies</span>
                                    <span className="bg-[#1A3326] px-2.5 py-1 rounded-md text-xs text-[#A3B899]">0</span>
                                </button>
                                <button className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-[#2C4C3B] text-[#A3B899] font-medium text-sm transition-all border border-transparent hover:border-[#4E7A5E]">
                                    <span className="flex items-center"><Pill className="w-4 h-4 mr-3" /> Medications</span>
                                    <span className="bg-transparent px-2.5 py-1 rounded-md text-xs border border-transparent">0</span>
                                </button>
                            </div>
                            
                            {/* Mobile-only sign out */}
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

                    {/* Right Main Content */}
                    <div className="lg:col-span-8 space-y-8">
                        
                        {/* Remedies Block */}
                        <div className="bg-[#E9E4D8] rounded-[2rem] p-8 md:p-10 shadow-sm border border-[#E9E4D8]">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-serif font-medium text-[#1A3326] flex items-center">
                                    <Bookmark className="w-5 h-5 mr-3 text-[#4E7A5E]" />
                                    Saved Remedies
                                </h2>
                            </div>
                            
                            {/* Empty State */}
                            <div className="bg-white rounded-2xl p-10 text-center flex flex-col items-center shadow-sm">
                                <h3 className="text-[#1A3326] font-medium mb-2">No remedies saved yet</h3>
                                <p className="text-sm text-[#3E5C4A] max-w-sm mx-auto mb-8">Discover natural alternatives and bookmark them to build your personal holistic library.</p>
                                
                                <button 
                                    onClick={() => navigate('/')}
                                    className="text-sm font-medium bg-[#4E7A5E] text-white px-6 py-2.5 rounded-full hover:bg-[#3E5C4A] transition-colors flex items-center shadow-md"
                                >
                                    <Search className="w-4 h-4 mr-2" /> Browse Directory
                                </button>
                            </div>
                        </div>

                        {/* Medications Block */}
                        <div className="bg-[#E9E4D8] rounded-[2rem] p-8 md:p-10 shadow-sm border border-[#E9E4D8]">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-serif font-medium text-[#1A3326] flex items-center">
                                    <Pill className="w-5 h-5 mr-3 text-[#4E7A5E]" />
                                    My Medications
                                </h2>
                            </div>
                            
                            {/* Empty State */}
                            <div className="bg-white rounded-2xl p-10 text-center flex flex-col items-center shadow-sm">
                                <h3 className="text-[#1A3326] font-medium mb-2">Safety first</h3>
                                <p className="text-sm text-[#3E5C4A] max-w-sm mx-auto mb-8">Add your medications to automatically check for interactions with natural remedies.</p>
                                
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