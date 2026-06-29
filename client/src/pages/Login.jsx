import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Leaf, AlertCircle, Sprout } from 'lucide-react'

const EMAIL_INPUT_ID = 'login-email'
const PASSWORD_INPUT_ID = 'login-password'

async function parseJsonResponse(response) {
    try {
        return await response.json()
    } catch {
        return {}
    }
}

/**
 * Login page.
 *
 * Responsibilities:
 * - Authenticates a user against the server and stores returned token/user.
 * - Provides concise UX feedback for errors and loading state.
 *
 * Run/test:
 * - Start the API with `cd server && npm start`.
 * - Start the UI with `cd client && npm run dev`.
 * - Submit valid credentials and verify redirect to `/dashboard`.
 * - Submit invalid credentials and verify the inline error appears.
 */
export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    async function handleLogin(event) {
        event.preventDefault()
        setError(null)
        setLoading(true)

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            })

            const data = await parseJsonResponse(res)

            if (!res.ok) {
                setError(data.error || 'Invalid email or password')
                return
            }

            localStorage.setItem('token', data.accessToken || data.token)
            if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken)
            localStorage.setItem('user', JSON.stringify(data.user))
            navigate('/dashboard')
        } catch {
            setError('Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen flex-col overflow-x-hidden bg-white font-sans selection:bg-[#4E7A5E] selection:text-white md:flex-row">
            <div className="absolute left-6 top-6 z-30 text-[#1A3326] md:text-[#F9F6F0]">
                <Link to="/" className="flex items-center space-x-2 font-serif text-2xl font-bold">
                    <Sprout className="h-8 w-8 text-[#4E7A5E]" />
                    <span>Holistic Health</span>
                </Link>
            </div>

            {/* Left side: Image and brand messaging. */}
            <div className="relative hidden w-1/2 bg-[#1A3326] md:block">
                <img
                    src="https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=1200&auto=format&fit=crop"
                    alt="Mortar and pestle"
                    className="absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-overlay"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A3326] via-[#1A3326]/50 to-transparent" />
                <div className="absolute bottom-16 left-16 max-w-md pr-8 text-[#F9F6F0]">
                    <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#2C4C3B]">
                        <Leaf className="h-6 w-6 text-[#A3B899]" />
                    </div>
                    <h2 className="mb-4 font-serif text-4xl font-medium leading-tight">
                        Return to<br />Nature's Pharmacy.
                    </h2>
                    <p className="text-lg leading-relaxed text-[#A3B899]">
                        Join thousands discovering the power of traditional, nature-backed medicine.
                    </p>
                </div>
            </div>

            {/* Right side: Form. */}
            <div className="relative flex w-full items-center justify-center bg-[#F9F6F0] p-8 md:w-1/2 md:p-24">
                <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="absolute right-8 top-8 hidden text-sm font-medium text-[#3E5C4A] transition-colors hover:text-[#1A3326] md:block"
                >
                    &larr; Back to Home
                </button>

                <div className="mt-12 w-full max-w-md md:mt-0">
                    <h1 className="mb-2 font-serif text-4xl font-medium text-[#1A3326]">Sign In</h1>
                    <p className="mb-10 text-[#3E5C4A]">Access your personalized remedies and saved routines.</p>

                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="flex animate-in items-center gap-2 rounded-xl border border-red-200 bg-red-50/50 px-4 py-3 text-sm text-red-600 slide-in-from-top-2">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label htmlFor={EMAIL_INPUT_ID} className="ml-1 text-sm font-medium text-[#1A3326]">
                                Email Address
                            </label>
                            <input
                                id={EMAIL_INPUT_ID}
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                placeholder="you@example.com"
                                required
                                className="w-full rounded-2xl border border-[#E9E4D8] bg-white px-5 py-4 text-[#1A3326] transition-all placeholder:text-[#A3B899] focus:border-[#4E7A5E] focus:outline-none focus:ring-4 focus:ring-[#4E7A5E]/20"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="ml-1 flex items-center justify-between">
                                <label htmlFor={PASSWORD_INPUT_ID} className="text-sm font-medium text-[#1A3326]">
                                    Password
                                </label>
                                <button
                                    type="button"
                                    className="text-sm font-medium text-[#4E7A5E] transition-colors hover:text-[#1A3326]"
                                >
                                    Forgot?
                                </button>
                            </div>
                            <input
                                id={PASSWORD_INPUT_ID}
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                placeholder="********"
                                required
                                className="w-full rounded-2xl border border-[#E9E4D8] bg-white px-5 py-4 text-[#1A3326] transition-all placeholder:text-[#A3B899] focus:border-[#4E7A5E] focus:outline-none focus:ring-4 focus:ring-[#4E7A5E]/20"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-4 flex w-full items-center justify-center rounded-2xl bg-[#1A3326] py-4 font-medium text-[#F9F6F0] transition-all hover:bg-[#2C4C3B] disabled:opacity-70"
                        >
                            {loading ? (
                                <span className="flex items-center space-x-2">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                                    <span>Signing in...</span>
                                </span>
                            ) : 'Sign in to your account'}
                        </button>
                    </form>

                    <div className="mt-10 border-t border-[#E9E4D8] pt-8 text-center">
                        <p className="text-[#3E5C4A]">
                            New to Holistic Health?{' '}
                            <button
                                type="button"
                                onClick={() => navigate('/register')}
                                className="border-b-2 border-transparent font-bold text-[#4E7A5E] transition-colors hover:border-[#1A3326] hover:text-[#1A3326]"
                            >
                                Create an account
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
