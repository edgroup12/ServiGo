import { AlertTriangle, Inbox, LoaderCircle, RefreshCw } from 'lucide-react';

export const LoadingState = ({ message = 'Loading...', compact = false }) => (
    <div
        className={`flex flex-col items-center justify-center text-center ${compact ? 'min-h-40 p-6' : 'min-h-[50vh] p-10'}`}
        role="status"
        aria-live="polite"
    >
        <LoaderCircle className="mb-4 animate-spin text-neon-blue" size={compact ? 32 : 48} aria-hidden="true" />
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">{message}</p>
    </div>
);

export const ErrorState = ({
    title = 'Something went wrong',
    message = 'We could not load this content. Please try again.',
    onRetry,
    compact = false
}) => (
    <div
        className={`glass-card flex flex-col items-center justify-center rounded-3xl border border-red-500/20 text-center ${compact ? 'p-6' : 'min-h-72 p-8 sm:p-12'}`}
        role="alert"
    >
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
            <AlertTriangle size={28} aria-hidden="true" />
        </div>
        <h2 className="text-xl font-black text-[var(--text-main)]">{title}</h2>
        <p className="mt-2 max-w-md text-sm font-medium text-[var(--text-muted)]">{message}</p>
        {onRetry && (
            <button
                type="button"
                onClick={onRetry}
                className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-primary px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-neon-blue/60"
            >
                <RefreshCw size={16} aria-hidden="true" />
                Try again
            </button>
        )}
    </div>
);

export const EmptyState = ({
    title = 'Nothing here yet',
    message = 'New items will appear here when they become available.',
    actionLabel,
    onAction,
    icon: Icon = Inbox,
    compact = false
}) => (
    <div className={`glass-card flex flex-col items-center justify-center rounded-3xl border border-[var(--glass-border)] text-center ${compact ? 'p-6' : 'min-h-64 p-8 sm:p-12'}`}>
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-neon-blue/10 text-neon-blue">
            <Icon size={28} aria-hidden="true" />
        </div>
        <h2 className="text-xl font-black text-[var(--text-main)]">{title}</h2>
        <p className="mt-2 max-w-md text-sm font-medium text-[var(--text-muted)]">{message}</p>
        {actionLabel && onAction && (
            <button
                type="button"
                onClick={onAction}
                className="mt-6 min-h-11 rounded-xl border border-neon-blue/30 bg-neon-blue/10 px-5 py-3 text-xs font-black uppercase tracking-widest text-neon-blue transition-colors hover:bg-neon-blue/20 focus:outline-none focus:ring-2 focus:ring-neon-blue/60"
            >
                {actionLabel}
            </button>
        )}
    </div>
);
