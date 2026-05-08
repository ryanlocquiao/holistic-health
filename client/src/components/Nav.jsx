import { Sprout } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

/**
 * Global top navigation for the app shell.
 *
 * Responsibilities:
 * - Provide a consistent brand/header anchor.
 * - Return users to the landing/search page.
 *
 * Accessibility:
 * - Brand button uses `aria-label` so screen readers have a clear target.
 *
 * Tests:
 * - Clicking the brand should navigate to `/`.
 */
export default function Nav() {
    const navigate = useNavigate()

    // Check auth state
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    const user = userStr ? JSON.parse(userStr) : null

    const userInitial = user?.email?.charAt(0).toUpperCase() || 'U'

    function handleLogout() {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        navigate('/')
    }

    return (
        <header className="w-full relative z-40 bg-transparent">
            <nav className="flex items-center justify-between px-6 md:px-8 py-6 w-full max-w-7xl mx-auto">
                <Link to="/" className="flex items-center space-x-2 text-2xl font-serif font-bold text-[#1A3326] transition-opacity hover:opacity-80">
                    <Sprout className="w-8 h-8 text-[#4E7A5E]" />
                    <span>Holistic Health</span>
                </Link>

                <div className="hidden md:flex items-center space-x-8 text-sm font-medium tracking-wide text-[#1A3326]">
                    <Link to="/" className="hover:text-[#4E7A5E] transition-colors">Home</Link>
                    <Link to="/search" className="hover:text-[#4E7A5E] transition-colors">Remedies</Link>
                    {token ? (
                        <Link to="/dashboard" className="hover:text-[#4E7A5E] transition-colors">My Dashboard</Link>
                    ) : (
                        <Link to="/about" className="hover:text-[#4E7A5E] transition-colors">About Us</Link>
                    )}
                </div>

                <div className="hidden md:block">
                    {token ? (
                        <button 
                            onClick={handleLogout} 
                            title="Sign out" 
                            className="flex items-center space-x-3 cursor-pointer group p-1.5 rounded-full hover:bg-white transition-colors border border-transparent hover:border-[#E9E4D8]"
                        >
                            <div className="w-9 h-9 rounded-full bg-[#E9E4D8] text-[#4E7A5E] flex items-center justify-center font-bold text-sm shadow-sm group-hover:bg-[#4E7A5E] group-hover:text-white transition-colors">
                                {userInitial}
                            </div>
                        </button>
                    ) : (
                        <Link 
                            to="/login"
                            className="inline-block bg-[#2C4C3B] text-[#F9F6F0] px-6 py-2.5 rounded-full text-sm font-medium hover:bg-[#1A3326] transition-all"
                        >
                            Login
                        </Link>
                    )}
                </div>
            </nav>
        </header>
    )
}
