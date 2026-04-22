import { Menu, Sprout } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

/**
 * Global top navigation for the app shell.
 *
 * Responsibilities:
 * - Provide a consistent brand/header anchor.
 * - Return users to the landing search page.
 *
 * Run/test notes:
 * - This component is rendered on search and detail views.
 * - Verify the brand button returns to "/".
 * - Verify the header remains visually stable on narrow screens.
 */
export default function Nav() {
    const navigate = useNavigate()

    return (
        <nav className="relative z-30 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 sm:px-8">
            <button
                onClick={() => navigate('/')}
                type="button"
                className="flex items-center gap-2 text-2xl font-serif font-bold text-[#1A3326] transition-opacity hover:opacity-80"
                aria-label="Holistic Health home"
            >
                <Sprout className="h-8 w-8 text-[#4E7A5E]" />
                <span>Holistic Health</span>
            </button>

            <div className="absolute left-1/2 hidden -translate-x-1/2 items-center space-x-8 text-sm font-medium tracking-wide text-[#1A3326] md:flex">
                <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="transition-colors hover:text-[#4E7A5E]"
                >
                    Home
                </button>
                <button
                    type="button"
                    onClick={() => navigate('/search')}
                    className="transition-colors hover:text-[#4E7A5E]"
                >
                    Remedies
                </button>
                <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="transition-colors hover:text-[#4E7A5E]"
                >
                    About Us
                </button>
            </div>

            <div className="hidden md:block">
                <button
                    type="button"
                    className="rounded-full bg-[#2C4C3B] px-6 py-2.5 text-sm font-medium text-[#F9F6F0] transition-all hover:bg-[#1A3326]"
                >
                    Login
                </button>
            </div>

            <button
                type="button"
                onClick={() => navigate('/search')}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[#1A3326] transition-colors hover:bg-[#EEF4EF] md:hidden"
                aria-label="Open navigation"
            >
                <Menu className="h-6 w-6" />
            </button>
        </nav>
    )
}
