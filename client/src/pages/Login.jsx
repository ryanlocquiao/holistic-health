import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Leaf, AlertCircle, Sprout } from 'lucide-react';

/**
 * Login page
 *
 * Responsibilities:
 * - Authenticates a user against the server and stores returned token/user.
 * - Provides concise UX feedback for errors and loading state.
 */
export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    async function handleLogin(e) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            let data = {};
            try { data = await res.json(); } catch {}

            if (!res.ok) {
                setError(data.error || 'Invalid email or password');
                return;
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            navigate('/dashboard');
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-white flex flex-col md:flex-row selection:bg-[#4E7A5E] selection:text-white font-sans overflow-hidden">
            <div className="absolute top-6 left-6 z-30 md:text-[#F9F6F0] text-[#1A3326]">
                <Link to="/" className="flex items-center space-x-2 text-2xl font-serif font-bold">
                    <Sprout className="w-8 h-8 text-[#4E7A5E]" />
                    <span>Holistic Health</span>
                </Link>
            </div>

            {/* Left side: Image & Brand Messaging */}
            <div className="hidden md:block w-1/2 relative bg-[#1A3326]">
                <img 
                    src="https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=1200&auto=format&fit=crop" 
                    alt="Mortar and pestle" 
                    className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A3326] via-[#1A3326]/50 to-transparent"></div>
                <div className="absolute bottom-16 left-16 text-[#F9F6F0] max-w-md pr-8">
                    <div className="w-12 h-12 rounded-full bg-[#2C4C3B] flex items-center justify-center mb-6">
                        <Leaf className="w-6 h-6 text-[#A3B899]" />
                    </div>
                    <h2 className="text-4xl font-serif font-medium mb-4 leading-tight">Return to<br/>Nature's Pharmacy.</h2>
                    <p className="text-[#A3B899] leading-relaxed text-lg">Join thousands discovering the power of traditional, nature-backed medicine.</p>
                </div>
            </div>

            {/* Right side: Form */}
            <div className="w-full md:w-1/2 flex items-center justify-center p-8 md:p-24 bg-[#F9F6F0] relative">
                
                {/* Floating Back Button */}
                <button 
                    onClick={() => navigate('/')}
                    className="absolute top-8 right-8 text-sm font-medium text-[#3E5C4A] hover:text-[#1A3326] transition-colors hidden md:block"
                >
                    &larr; Back to Home
                </button>

                <div className="w-full max-w-md mt-12 md:mt-0">
                    <h1 className="text-4xl font-serif font-medium text-[#1A3326] mb-2">Sign In</h1>
                    <p className="text-[#3E5C4A] mb-10">Access your personalized remedies and saved routines.</p>

                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="bg-red-50/50 text-red-600 px-4 py-3 rounded-xl text-sm border border-red-200 flex items-center gap-2 animate-in slide-in-from-top-2">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#1A3326] ml-1">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                className="w-full px-5 py-4 rounded-2xl bg-white border border-[#E9E4D8] text-[#1A3326] focus:outline-none focus:ring-4 focus:ring-[#4E7A5E]/20 focus:border-[#4E7A5E] placeholder:text-[#A3B899] transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-sm font-medium text-[#1A3326]">Password</label>
                                <button type="button" className="text-sm font-medium text-[#4E7A5E] hover:text-[#1A3326] transition-colors">
                                    Forgot?
                                </button>
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="w-full px-5 py-4 rounded-2xl bg-white border border-[#E9E4D8] text-[#1A3326] focus:outline-none focus:ring-4 focus:ring-[#4E7A5E]/20 focus:border-[#4E7A5E] placeholder:text-[#A3B899] transition-all"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#1A3326] text-[#F9F6F0] py-4 rounded-2xl font-medium hover:bg-[#2C4C3B] transition-all mt-4 disabled:opacity-70 flex justify-center items-center"
                        >
                            {loading ? (
                                <span className="flex items-center space-x-2">
                                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                    <span>Signing in...</span>
                                </span>
                            ) : 'Sign in to your account'}
                        </button>
                    </form>

                    <div className="mt-10 pt-8 text-center border-t border-[#E9E4D8]">
                        <p className="text-[#3E5C4A]">
                            New to Holistic Health?{' '}
                            <button 
                                onClick={() => navigate('/register')}
                                className="text-[#4E7A5E] font-bold hover:text-[#1A3326] transition-colors border-b-2 border-transparent hover:border-[#1A3326]"
                            >
                                Create an account
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}