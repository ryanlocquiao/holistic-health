import { AlertTriangle, ArrowRight, Heart, Leaf, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Nav from '../components/Nav.jsx'

const API_URL = import.meta.env.VITE_API_URL
const ANONYMOUS_DISCLAIMER_STORAGE_KEY = 'holisticHealthAnonymousDisclaimerAcceptedAt'
const AUTHENTICATED_DISCLAIMER_STORAGE_PREFIX = 'holisticHealthDisclaimerAccepted'
const DISCLAIMER_INTERVAL_MS = 24 * 60 * 60 * 1000

function readStoredUser() {
    const storedUser = localStorage.getItem('user')

    if (!storedUser) return null

    try {
        return JSON.parse(storedUser)
    } catch {
        return null
    }
}

function getAuthenticatedDisclaimerKey(user) {
    return `${AUTHENTICATED_DISCLAIMER_STORAGE_PREFIX}:${user?.id || user?.email || 'current'}`
}

function shouldShowDisclaimer(now = Date.now()) {
    const token = localStorage.getItem('token')
    const user = readStoredUser()

    if (token && user) {
        if (user.medical_disclaimer_accepted_at) return false
        return localStorage.getItem(getAuthenticatedDisclaimerKey(user)) !== 'true'
    }

    const acceptedAt = Number(localStorage.getItem(ANONYMOUS_DISCLAIMER_STORAGE_KEY) || 0)
    return !acceptedAt || now - acceptedAt >= DISCLAIMER_INTERVAL_MS
}

async function fetchAuthenticatedProfile(token) {
    if (!API_URL || !token) return null

    try {
        const res = await fetch(`${API_URL}/api/users/me`, {
            headers: { Authorization: `Bearer ${token}` }
        })

        if (!res.ok) return null

        return await res.json()
    } catch {
        return null
    }
}

async function captureAuthenticatedDisclaimer(token) {
    if (!API_URL || !token) return

    try {
        const res = await fetch(`${API_URL}/api/users/disclaimer`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` }
        })

        if (!res.ok) return

        const data = await res.json()
        if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user))
            localStorage.setItem(getAuthenticatedDisclaimerKey(data.user), 'true')
        }
    } catch {
        // Local acknowledgement still prevents the modal from blocking users.
    }
}

/**
 * Landing page for the remedy discovery workflow.
 *
 * Responsibilities:
 * - Capture a free-text symptom query.
 * - Navigate to the search results route with query params.
 *
 * Run locally:
 * - Start API:   cd server && npm start
 * - Start UI:    cd client && npm run dev
 * - Open Vite URL (typically http://localhost:5173).
 *
 * Manual test:
 * - Enter "insomnia" and submit.
 * - Verify navigation to /search?q=insomnia.
 * - Verify no navigation occurs for empty/whitespace input.
 * - Anonymous users see the disclaimer again after 24 hours.
 * - Logged-in users see the disclaimer once per stored user profile.
 */
export default function Landing() {
    const [query, setQuery] = useState('')
    const [showDisclaimer, setShowDisclaimer] = useState(() => shouldShowDisclaimer())
    const navigate = useNavigate()

    useEffect(() => {
        const token = localStorage.getItem('token')
        const user = readStoredUser()

        if (!showDisclaimer || !token || !user) return undefined

        let isActive = true

        async function syncDisclaimerStatus() {
            const profile = await fetchAuthenticatedProfile(token)

            if (!isActive || !profile?.medical_disclaimer_accepted_at) return

            const nextUser = { ...user, ...profile }
            localStorage.setItem('user', JSON.stringify(nextUser))
            localStorage.setItem(getAuthenticatedDisclaimerKey(nextUser), 'true')
            setShowDisclaimer(false)
        }

        syncDisclaimerStatus()

        return () => {
            isActive = false
        }
    }, [showDisclaimer])

    function normalizeQuery(value) {
        return value.trim()
    }

    function handleDisclaimerAccept() {
        const token = localStorage.getItem('token')
        const user = readStoredUser()

        if (token && user) {
            localStorage.setItem(getAuthenticatedDisclaimerKey(user), 'true')
            captureAuthenticatedDisclaimer(token)
        } else {
            localStorage.setItem(ANONYMOUS_DISCLAIMER_STORAGE_KEY, String(Date.now()))
        }

        setShowDisclaimer(false)
    }

    function handleSearch(event) {
        event.preventDefault()

        const normalizedQuery = normalizeQuery(query)
        if (!normalizedQuery) return

        navigate(`/search?q=${encodeURIComponent(normalizedQuery)}`)
    }

    function openSearch(queryValue = '') {
        const normalizedQuery = normalizeQuery(queryValue)
        navigate(normalizedQuery ? `/search?q=${encodeURIComponent(normalizedQuery)}` : '/search')
    }

    return (
        <div className="relative min-h-screen w-full bg-[#F9F6F0] font-sans flex flex-col">
            <Nav />
            <DisclaimerModal isOpen={showDisclaimer} onAccept={handleDisclaimerAccept} />

            <div className="animate-in fade-in pb-24 text-[#2C4C3B] duration-500">
                <main className="relative mx-auto max-w-7xl overflow-hidden px-6 pt-12 sm:px-8">
                    <div className="relative z-10 mx-auto max-w-4xl space-y-6 pt-10 text-center">
                        <div className="inline-flex items-center space-x-2 rounded-full border border-[#E9E4D8] bg-white px-5 py-2 text-sm font-medium text-[#4E7A5E] shadow-sm">
                            <Heart className="h-4 w-4 fill-current" />
                            <span>Wellness, the natural way.</span>
                        </div>

                        <h1 className="text-5xl font-medium leading-[1.1] text-[#1A3326] sm:text-6xl md:text-7xl">
                            Feel your best,<br />
                            <span className="italic text-[#4E7A5E]">Naturally.</span>
                        </h1>

                        <div className="mx-auto mt-8 mb-4 max-w-2xl">
                            <form
                                onSubmit={handleSearch}
                                className="flex w-full min-w-0 items-center rounded-full border border-[#E9E4D8] bg-white p-2 shadow-lg transition-all focus-within:ring-4 focus-within:ring-[#4E7A5E]/20"
                            >
                                <div className="shrink-0 pl-4 pr-3 text-[#4E7A5E]">
                                    <Search className="h-6 w-6" />
                                </div>
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    placeholder="Search by condition, herb, or compound..."
                                    aria-label="Search by condition, herb, or compound"
                                    className="min-w-0 flex-1 border-none bg-transparent py-3 text-lg text-[#1A3326] outline-none placeholder:text-[#A3B899]"
                                />
                                <button
                                    type="submit"
                                    className="shrink-0 rounded-full bg-[#4E7A5E] px-8 py-3 font-medium text-[#F9F6F0] transition-colors hover:bg-[#3E5C4A]"
                                >
                                    Search
                                </button>
                            </form>
                        </div>

                        <p className="mx-auto max-w-2xl pb-8 text-lg leading-relaxed text-[#3E5C4A]">
                            Your personalized guide to holistic health, natural remedies, and feeling vibrantly alive every single day.
                        </p>
                    </div>

                    <div className="relative mx-auto mt-8 max-w-5xl">
                        <img
                            src="/holistic_health_landing.jpg"
                            alt="Amber dropper bottle with natural botanicals"
                            className="h-[500px] w-full rounded-[3rem] object-cover shadow-xl"
                        />
                        <CommunityBadge className="-right-6 -top-6 hidden md:block md:-right-12" />
                    </div>
                </main>

                <DarkRemediesSection onExplore={openSearch} />
            </div>
        </div>
    )
}

/**
 * Medical disclaimer shown from the landing page.
 *
 * Persistence behavior:
 * - Anonymous visitors acknowledge for 24 hours.
 * - Logged-in users acknowledge once per stored user profile.
 *
 * Run/test:
 * - Clear `holisticHealthAnonymousDisclaimerAcceptedAt`, log out, and open `/`.
 * - Click "I understand", reload, and confirm it stays dismissed.
 * - Set the stored timestamp to more than 24 hours ago and confirm it returns.
 * - Log in and confirm an accepted server timestamp keeps the modal dismissed.
 * - Confirm PATCH /api/users/disclaimer records the account timestamp.
 */
function DisclaimerModal({ isOpen, onAccept }) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A3326]/70 px-6 py-8 backdrop-blur-sm">
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="medical-disclaimer-title"
                className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-[#E9E4D8] bg-[#F9F6F0] p-6 text-[#2C4C3B] shadow-2xl sm:p-8"
            >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#1A3326]">
                    <AlertTriangle className="h-5 w-5 text-[#A3B899]" />
                </div>

                <h2 id="medical-disclaimer-title" className="font-serif text-3xl font-medium text-[#1A3326]">
                    Before you explore Holistic Health
                </h2>

                <div className="mt-5 space-y-4 text-sm leading-relaxed text-[#3E5C4A] sm:text-base">
                    <p>
                        Holistic Health provides general, educational information about natural remedies. It is not medical advice,
                        and it is not a substitute for diagnosis, treatment, or guidance from a licensed physician, pharmacist, or
                        other qualified healthcare provider.
                    </p>
                    <p>
                        Natural compounds can still interact with medications, existing conditions, and each other. Always consult
                        your doctor or pharmacist before starting, stopping, or combining any remedy - especially if you are pregnant,
                        nursing, managing a chronic condition, or taking prescription medication.
                    </p>
                    <p>
                        Holistic Health and its developers assume no liability for outcomes resulting from use of information on this
                        platform. Use of this site is at your own discretion and risk.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onAccept}
                    className="mt-7 w-full rounded-full bg-[#4E7A5E] px-6 py-3 text-sm font-medium text-[#F9F6F0] transition-colors hover:bg-[#3E5C4A] sm:w-auto"
                >
                    I understand
                </button>
            </section>
        </div>
    )
}

function CommunityBadge({ className = '' }) {
    return (
        <div className={`absolute z-20 rounded-3xl border border-[#E9E4D8] bg-[#F9F6F0] p-6 shadow-xl ${className}`}>
            <div className="mb-3 flex -space-x-4">
                <img
                    className="h-12 w-12 rounded-full border-2 border-[#F9F6F0] object-cover"
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&auto=format&fit=crop"
                    alt="User"
                />
                <img
                    className="h-12 w-12 rounded-full border-2 border-[#F9F6F0] object-cover"
                    src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=100&auto=format&fit=crop"
                    alt="User"
                />
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#F9F6F0] bg-[#E9E4D8] text-sm font-bold text-[#4E7A5E]">
                    +2k
                </div>
            </div>
            <p className="font-serif font-bold text-[#1A3326]">Join the community</p>
            <p className="text-sm text-[#3E5C4A]">Healing together.</p>
        </div>
    )
}

function DarkRemediesSection({ onExplore }) {
    const remedies = [
        {
            title: 'Turmeric Root',
            desc: 'Powerful anti-inflammatory and antioxidant properties used for centuries.'
        },
        {
            title: 'Ashwagandha',
            desc: 'Ancient adaptogen helping the body manage stress and maintain balance.'
        },
        {
            title: 'Elderberry',
            desc: 'Promotes restful sleep and naturally boosts the immune system.'
        }
    ]

    return (
        <section className="mt-12 bg-[#E9E4D8] px-6 py-24">
            <div className="mx-auto max-w-6xl">
                <div className="mb-16 flex flex-col items-center justify-between gap-4 md:flex-row">
                    <h2 className="text-center font-serif text-4xl font-medium text-[#1A3326] md:text-left">
                        Popular Remedies this Week
                    </h2>
                    <button
                        type="button"
                        onClick={() => onExplore('')}
                        className="flex items-center font-medium text-[#4E7A5E] transition-colors hover:text-[#1A3326]"
                    >
                        View all remedies <ArrowRight className="ml-2 h-5 w-5" />
                    </button>
                </div>

                <div className="grid gap-8 md:grid-cols-3">
                    {remedies.map((item) => (
                        <button
                            key={item.title}
                            type="button"
                            onClick={() => onExplore(item.title)}
                            className="group cursor-pointer rounded-[2rem] bg-[#1A3326] p-8 text-left text-[#F9F6F0] shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
                        >
                            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#2C4C3B] transition-colors group-hover:bg-[#4E7A5E]">
                                <Leaf className="h-6 w-6 text-[#A3B899] transition-colors group-hover:text-white" />
                            </div>
                            <h3 className="mb-3 font-serif text-2xl font-medium">{item.title}</h3>
                            <p className="mb-8 leading-relaxed text-[#A3B899]">{item.desc}</p>
                            <div className="flex items-center font-medium text-[#F9F6F0] opacity-80 transition-opacity group-hover:opacity-100">
                                Read more <ArrowRight className="ml-2 h-5 w-5" />
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </section>
    )
}
