import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const ToastContext = createContext(null);

// The provider and hook intentionally share one module as a small UI subsystem.
// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        // Fallback: return a no-op toast if used outside provider
        return { toast: () => { } };
    }
    return context;
};

const TOAST_ICONS = {
    success: <CheckCircle2 size={18} className="text-neon-green" />,
    error: <AlertCircle size={18} className="text-red-400" />,
    warning: <AlertTriangle size={18} className="text-yellow-400" />,
    info: <Info size={18} className="text-neon-blue" />,
};

const TOAST_BORDERS = {
    success: 'border-neon-green/30',
    error: 'border-red-500/30',
    warning: 'border-yellow-500/30',
    info: 'border-neon-blue/30',
};

const TOAST_BG = {
    success: 'bg-neon-green/10',
    error: 'bg-red-500/10',
    warning: 'bg-yellow-500/10',
    info: 'bg-neon-blue/10',
};

let globalToastId = 0;

const ToastItem = ({ id, message, type, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(() => onDismiss(id), 4000);
        return () => clearTimeout(timer);
    }, [id, onDismiss]);

    return (
        <div
            className={`glass-premium px-5 py-4 rounded-2xl border ${TOAST_BORDERS[type]} ${TOAST_BG[type]} shadow-2xl flex items-center gap-3 min-w-[300px] max-w-[420px] animate-in slide-in-from-right duration-300`}
        >
            {TOAST_ICONS[type]}
            <p className="text-sm font-bold text-[var(--text-main)] flex-1">{message}</p>
            <button
                onClick={() => onDismiss(id)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5 transition-colors"
            >
                <X size={14} />
            </button>
        </div>
    );
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const toast = useCallback((message, type = 'info') => {
        const id = ++globalToastId;
        setToasts(prev => [...prev, { id, message, type }]);
    }, []);

    const dismiss = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
                {toasts.map(t => (
                    <div key={t.id} className="pointer-events-auto">
                        <ToastItem {...t} onDismiss={dismiss} />
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export default ToastProvider;