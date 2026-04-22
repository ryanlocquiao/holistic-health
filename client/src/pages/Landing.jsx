import { ArrowRight, Heart, Leaf, Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Nav from '../components/Nav.jsx'

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
 */
export default function Landing() {
    const [query, setQuery] = useState('')
    const navigate = useNavigate()

    function normalizeQuery(value) {
        return value.trim()
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
        <div className="relative min-h-screen overflow-x-hidden bg-[#F9F6F0] font-sans selection:bg-[#4E7A5E] selection:text-white">
            <Nav />

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
                                className="flex items-center rounded-full border border-[#E9E4D8] bg-white p-2 shadow-lg transition-all focus-within:ring-4 focus-within:ring-[#4E7A5E]/20"
                            >
                                <div className="pl-4 pr-3 text-[#4E7A5E]">
                                    <Search className="h-6 w-6" />
                                </div>
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    placeholder="Search by condition, herb, or compound..."
                                    aria-label="Search by condition, herb, or compound"
                                    className="flex-1 border-none bg-transparent py-3 text-lg text-[#1A3326] outline-none placeholder:text-[#A3B899]"
                                />
                                <button
                                    type="submit"
                                    className="rounded-full bg-[#4E7A5E] px-8 py-3 font-medium text-[#F9F6F0] transition-colors hover:bg-[#3E5C4A]"
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
                            src="https://images.unsplash.com/photo-1556228578-0d85b1a4d571?q=80&w=1600&auto=format&fit=crop"
                            alt="Holistic lifestyle"
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