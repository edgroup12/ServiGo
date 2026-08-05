import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        console.error('Unexpected application error:', error, info);
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        return (
            <main className="flex min-h-screen items-center justify-center bg-[var(--bg-color)] px-4 py-16 text-center">
                <section className="w-full max-w-lg rounded-[2rem] border border-red-500/20 bg-[var(--glass-bg)] p-8 shadow-2xl sm:p-10">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
                        <AlertTriangle size={30} aria-hidden="true" />
                    </div>
                    <h1 className="text-2xl font-black text-[var(--text-main)] sm:text-3xl">Something went wrong</h1>
                    <p className="mt-3 text-sm font-medium leading-relaxed text-[var(--text-muted)]">
                        ServiGo hit an unexpected error. Reload the page to recover safely.
                    </p>
                    <button
                        type="button"
                        onClick={this.handleReload}
                        className="mx-auto mt-7 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-6 py-3 text-sm font-black uppercase tracking-wider text-white"
                    >
                        <RefreshCw size={18} aria-hidden="true" />
                        Reload page
                    </button>
                </section>
            </main>
        );
    }
}

export default ErrorBoundary;
