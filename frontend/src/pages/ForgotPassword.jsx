import { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, Mail } from 'lucide-react';
import api from '../services/api';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');
        try {
            const { data } = await api.post('/auth/forgot-password', { email });
            setMessage(data.message);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Unable to request a password reset.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-color)] flex items-center justify-center px-4">
            <div className="glass-premium w-full max-w-md rounded-[2rem] border border-[var(--glass-border)] p-8 shadow-glow-blue/20">
                <KeyRound className="mx-auto mb-5 text-neon-blue" size={44} />
                <h1 className="text-center text-3xl font-black text-[var(--text-main)]">Forgot password?</h1>
                <p className="mt-2 text-center text-sm text-[var(--text-muted)]">Enter your account email to start a secure password reset.</p>

                {message && <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-300">{message}</div>}
                {error && <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-300">{error}</div>}

                <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={19} />
                        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" autoComplete="email" required className="w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] py-4 pl-12 pr-4 font-semibold text-[var(--text-main)] outline-none focus:border-neon-blue" />
                    </div>
                    <button type="submit" disabled={loading} className="w-full rounded-2xl bg-gradient-primary py-4 text-sm font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-60">
                        {loading ? 'Sending...' : 'Request reset'}
                    </button>
                </form>
                <Link to="/login" className="mt-6 block text-center text-sm font-bold text-neon-blue hover:underline">Back to sign in</Link>
            </div>
        </div>
    );
}
