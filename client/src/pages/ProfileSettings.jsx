import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowRight, CheckCircle, Lock, Mail } from 'lucide-react'
import Nav from '../components/Nav.jsx'

const API_URL = import.meta.env.VITE_API_URL
const CURRENT_PASSWORD_INPUT_ID = 'profile-current-password'
const NEW_PASSWORD_INPUT_ID = 'profile-new-password'
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
 * Reads the authenticated user from localStorage.
 *
 * Malformed auth data is treated as logged out so the page does not render
 * account settings for an unknown user.
 */
function readStoredUser() {
    const storedUser = localStorage.getItem('user')

    if (!storedUser) return null

    try {
        return JSON.parse(storedUser)
    } catch {
        clearStoredAuth()
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
 * Profile settings page.
 *
 * Responsibilities:
 * - Requires an authenticated local session and redirects anonymous users.
 * - Displays the current user's email address.
 * - Lets the user change their password after confirming the current one.
 *
 * Run/test:
 * - Start API with `cd server && npm start`.
 * - Start UI with `cd client && npm run dev`.
 * - Log in, open the avatar menu, choose Profile Settings, and change password.
 */
export default function ProfileSettings() {
    const [user, setUser] = useState(() => readStoredUser())
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' })
    const [saving, setSaving] = useState(false)
    const [notice, setNotice] = useState(null)
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
     * Sends an authenticated request and retries once when the access token is
     * expired. This matches the dashboard medication flow so settings edits do
     * not fail just because the short-lived JWT aged out.
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

    useEffect(() => {
        if (!getStoredToken() || !user) {
            navigate('/login')
        }
    }, [navigate, user])

    async function handlePasswordChange(event) {
        event.preventDefault()
        setNotice(null)

        const { currentPassword, newPassword } = passwordForm

        if (!currentPassword.trim() || newPassword.length < 8) {
            setNotice({
                type: 'error',
                message: 'Enter your current password and a new password with at least 8 characters.'
            })
            return
        }

        setSaving(true)

        try {
            const res = await fetchWithAuthRetry(`${API_URL}/api/users/password`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword })
            })
            const data = await parseJsonSafely(res.clone())

            if (!res.ok) {
                setNotice({
                    type: 'error',
                    message: data.error || data.errors?.[0]?.msg || 'Failed to update password.'
                })
                return
            }

            setPasswordForm({ currentPassword: '', newPassword: '' })
            setNotice({ type: 'success', message: 'Password updated.' })
        } catch {
            setNotice({ type: 'error', message: 'Failed to update password.' })
        } finally {
            setSaving(false)
        }
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-[#F9F6F0] flex items-center justify-center selection:bg-[#4E7A5E] selection:text-white">
                <div className="w-8 h-8 border-2 border-[#4E7A5E] border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="relative min-h-screen bg-[#F9F6F0] font-sans text-[#2C4C3B] selection:bg-[#4E7A5E] selection:text-white">
            <Nav />

            <main className="mx-auto w-full max-w-4xl px-6 py-12 sm:px-8 lg:py-16">
                <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="mb-6 inline-flex items-center text-sm font-medium text-[#4E7A5E] transition-colors hover:text-[#1A3326]"
                >
                    <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
                    Back to dashboard
                </button>

                <section className="rounded-[3rem] border border-[#E9E4D8] bg-white p-8 shadow-xl sm:p-10">
                    <div className="border-b border-[#E9E4D8] pb-6">
                        <h1 className="font-serif text-4xl font-medium text-[#1A3326] sm:text-5xl">
                            Profile Settings
                        </h1>
                        <div className="mt-5 flex min-w-0 items-center gap-3 rounded-2xl border border-[#E9E4D8] bg-[#F9F6F0] px-4 py-3 text-sm text-[#3E5C4A]">
                            <Mail className="h-4 w-4 shrink-0 text-[#4E7A5E]" />
                            <span className="truncate">{user?.email}</span>
                        </div>
                    </div>

                    <div className="mt-8">
                        <h2 className="flex items-center font-serif text-2xl font-medium text-[#1A3326]">
                            <Lock className="mr-3 h-5 w-5 text-[#4E7A5E]" />
                            Change Password
                        </h2>

                        {notice && (
                            <div className={`mt-5 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm
                                ${notice.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}
                            >
                                {notice.type === 'success'
                                    ? <CheckCircle className="h-4 w-4 shrink-0" />
                                    : <AlertCircle className="h-4 w-4 shrink-0" />
                                }
                                {notice.message}
                            </div>
                        )}

                        <form onSubmit={handlePasswordChange} className="mt-6 space-y-5">
                            <div className="space-y-2">
                                <label htmlFor={CURRENT_PASSWORD_INPUT_ID} className="ml-1 text-sm font-medium text-[#1A3326]">
                                    Current Password
                                </label>
                                <input
                                    id={CURRENT_PASSWORD_INPUT_ID}
                                    type="password"
                                    value={passwordForm.currentPassword}
                                    onChange={(event) => setPasswordForm((current) => ({
                                        ...current,
                                        currentPassword: event.target.value
                                    }))}
                                    autoComplete="current-password"
                                    required
                                    className="w-full rounded-2xl border border-[#E9E4D8] bg-[#F9F6F0] px-5 py-4 text-[#1A3326] transition-all placeholder:text-[#A3B899] focus:border-[#4E7A5E] focus:outline-none focus:ring-4 focus:ring-[#4E7A5E]/20"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor={NEW_PASSWORD_INPUT_ID} className="ml-1 text-sm font-medium text-[#1A3326]">
                                    New Password
                                </label>
                                <input
                                    id={NEW_PASSWORD_INPUT_ID}
                                    type="password"
                                    value={passwordForm.newPassword}
                                    onChange={(event) => setPasswordForm((current) => ({
                                        ...current,
                                        newPassword: event.target.value
                                    }))}
                                    autoComplete="new-password"
                                    minLength={8}
                                    required
                                    placeholder="Minimum 8 characters"
                                    className="w-full rounded-2xl border border-[#E9E4D8] bg-[#F9F6F0] px-5 py-4 text-[#1A3326] transition-all placeholder:text-[#A3B899] focus:border-[#4E7A5E] focus:outline-none focus:ring-4 focus:ring-[#4E7A5E]/20"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="inline-flex w-full items-center justify-center rounded-2xl bg-[#1A3326] px-6 py-4 text-sm font-medium text-[#F9F6F0] transition-colors hover:bg-[#2C4C3B] disabled:opacity-70 sm:w-auto"
                            >
                                {saving ? 'Updating...' : 'Update Password'}
                            </button>
                        </form>
                    </div>
                </section>
            </main>
        </div>
    )
}
