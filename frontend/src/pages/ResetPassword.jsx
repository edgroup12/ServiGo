import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound, Lock } from 'lucide-react';
import api from '../services/api';

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token') || '';
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await api.post('/auth/reset-password', { token, password });
            navigate('/login', { replace: true });
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Unable to reset your password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-color)] flex items-center justify-center px-4">
            <div className="glass-premium w-full max-w-md rounded-[2rem] border border-[var(--glass-border)] p-8">
                <KeyRound className="mx-auto mb-5 text-neon-purple" size={44} />
                <h1 className="text-center text-3xl font-black text-[var(--text-main)]">Create new password</h1>
                {!token && <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-300">This reset link is invalid because it has no token.</div>}
                {error && <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-300">{error}</div>}
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    {[['New password', password, setPassword], ['Confirm password', confirmPassword, setConfirmPassword]].map(([placeholder, value, setter]) => (
                        <div className="relative" key={placeholder}>
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={19} />
                            <input type="password" value={value} onChange={(event) => setter(event.target.value)} placeholder={placeholder} autoComplete="new-password" minLength={8} required className="w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] py-4 pl-12 pr-4 font-semibold text-[var(--text-main)] outline-none focus:border-neon-purple" />
                        </div>
                    ))}
                    <button type="submit" disabled={loading || !token} className="w-full rounded-2xl bg-gradient-primary py-4 text-sm font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Updating...' : 'Reset password'}</button>
                </form>
                <Link to="/login" className="mt-6 block text-center text-sm font-bold text-neon-blue hover:underline">Back to sign in</Link>
            </div>
        </div>
    );
}
