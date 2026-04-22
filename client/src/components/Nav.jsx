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
        <nav className="w-full px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between">
            <button
                onClick={() => navigate('/')}
                type="button"
                className="text-teal-700 font-semibold text-lg tracking-tight"
            >
                Holistic Health
            </button>
            <div className="flex items-center gap-3 text-sm text-gray-500">
                <span className="hidden sm:inline">Evidence-based remedy search</span>
                <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600">Auth coming soon</span>
            </div>
        </nav>
    )
}