import { useState, useEffect, useRef } from 'react';
import { Send, X, CheckCheck, Check, Clock, AlertCircle, Sparkles, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import api from '../services/api';
import useChatSocket from '../hooks/useChatSocket';

// ─── Sub-components ────────────────────────────────────────────────────────────

/**
 * Shows a coloured badge in the chat header indicating the socket connection state.
 *
 * @param {{ status: import('../hooks/useChatSocket').ConnectionStatus }} props
 */
const ConnectionBadge = ({ status }) => {
  const map = {
    connected: {
      label: 'Live',
      icon: <Wifi size={10} />,
      class: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      dot: 'bg-emerald-400 animate-pulse',
    },
    connecting: {
      label: 'Connecting…',
      icon: <RefreshCw size={10} className="animate-spin" />,
      class: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      dot: 'bg-amber-400',
    },
    disconnected: {
      label: 'Offline',
      icon: <WifiOff size={10} />,
      class: 'bg-red-500/20 text-red-400 border-red-500/30',
      dot: 'bg-red-400',
    },
    polling: {
      label: 'Offline · Polling',
      icon: <RefreshCw size={10} className="animate-spin" />,
      class: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      dot: 'bg-orange-400 animate-pulse',
    },
  };

  const cfg = map[status] ?? map.disconnected;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${cfg.class}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.icon}
      {cfg.label}
    </span>
  );
};

/**
 * Delivery status icon shown next to outgoing messages.
 *
 * @param {{ status: import('../hooks/useChatSocket').MessageStatus|undefined }} props
 */
const StatusIcon = ({ status }) => {
  if (status === 'pending') {
    return <Clock size={11} className="text-white/30" aria-label="Sending…" />;
  }
  if (status === 'failed') {
    return <AlertCircle size={11} className="text-red-400" aria-label="Failed" />;
  }
  if (status === 'delivered') {
    return <CheckCheck size={11} className="text-neon-blue" aria-label="Delivered" />;
  }
  // 'sent' or undefined (older messages loaded from HTTP)
  return <Check size={11} className="text-white/40" aria-label="Sent" />;
};

// ─── Main Component ────────────────────────────────────────────────────────────

/**
 * Full-featured live chat panel for a booking.
 *
 * Integrates with the realtime server via `useChatSocket` and falls back to
 * HTTP polling when the WebSocket is unavailable.
 *
 * @param {{
 *   booking: object,
 *   currentUser: object,
 *   onClose: () => void,
 * }} props
 */
const ChatBox = ({ booking, currentUser, onClose }) => {
  const [initialMessages, setInitialMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);

  const bookingId = booking._id;
  const otherParty =
    currentUser.role === 'customer' ? booking.worker : booking.customer;

  // ── Load history from HTTP on mount ──────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    const request = window.setTimeout(() => {
      setLoadingHistory(true);
      setHistoryError('');

      api
        .get(`/messages/${bookingId}`)
        .then((res) => {
          if (!cancelled) {
            setInitialMessages(Array.isArray(res.data) ? res.data : []);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setHistoryError(
              err.response?.data?.message || 'Messages could not be loaded.'
            );
          }
        })
        .finally(() => {
          if (!cancelled) setLoadingHistory(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(request);
    };
  }, [bookingId, retryKey]);

  // ── Socket hook (only mounted after history is ready) ────────────────────

  const { messages, connectionStatus, sendMessage, isSending } = useChatSocket({
    bookingId,
    currentUserId: currentUser._id,
    initialMessages,
  });

  // ── Auto-scroll ───────────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send handler ──────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isSending) return;
    setInputValue('');
    await sendMessage(trimmed);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      id="chatbox-overlay"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-2 backdrop-blur-sm animate-in fade-in duration-300 sm:p-4"
    >
      <div className="glass-premium flex h-[min(92dvh,620px)] w-full max-w-lg flex-col overflow-hidden rounded-[1.75rem] border-white/10 shadow-glow-blue/20 animate-in zoom-in-95 duration-300 sm:rounded-[2.5rem]">

        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <img
                src={
                  otherParty?.photoUrl ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(otherParty?.name || 'User')}&background=7F5AF0&color=fff`
                }
                className="w-11 h-11 rounded-2xl object-cover border border-white/10 shadow-glow-blue/10"
                alt=""
              />
            </div>
            <div className="min-w-0">
              <h3 className="text-white font-black text-sm tracking-tight truncate">
                {otherParty?.name || 'User'}
              </h3>
              <div className="mt-0.5">
                <ConnectionBadge status={connectionStatus} />
              </div>
            </div>
          </div>

          <button
            type="button"
            id="chatbox-close-btn"
            aria-label="Close chat"
            onClick={onClose}
            className="p-2.5 bg-white/5 rounded-2xl text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-90 flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Message List ── */}
        <div className="flex-grow overflow-y-auto bg-black/20 p-4 custom-scrollbar sm:p-5 space-y-3">
          {loadingHistory ? (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="w-9 h-9 border-4 border-neon-blue/20 border-t-neon-blue rounded-full animate-spin mb-3" />
              <p className="text-white/20 text-[10px] font-black uppercase tracking-widest">
                Securing Connection…
              </p>
            </div>
          ) : historyError ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <AlertCircle size={28} className="text-red-400/60 mb-3" />
              <p className="text-sm font-bold text-red-300">{historyError}</p>
              <button
                id="chatbox-retry-btn"
                type="button"
                onClick={() => {
                  setLoadingHistory(true);
                  setRetryKey((k) => k + 1);
                }}
                className="mt-4 rounded-xl border border-white/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-white/5 transition-all"
              >
                Retry
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-10">
              <div className="w-14 h-14 bg-white/5 rounded-3xl flex items-center justify-center mb-4 border border-white/10 rotate-3">
                <Sparkles size={26} className="text-neon-blue/50" />
              </div>
              <p className="text-white font-black text-sm uppercase tracking-tight">
                No Messages Yet
              </p>
              <p className="text-white/30 text-[11px] font-bold mt-2 leading-relaxed">
                Be the first to say hi! Discuss your project requirements here.
              </p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isMe = msg.senderId === currentUser._id || msg.senderId?.toString() === currentUser._id?.toString();
              const key = msg._id ?? `msg-${i}`;
              const isFailed = msg.status === 'failed';

              return (
                <div
                  key={key}
                  id={`chat-msg-${key}`}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-200`}
                >
                  <div className={`max-w-[80%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-[13px] font-bold leading-relaxed transition-opacity ${isMe
                          ? isFailed
                            ? 'bg-red-500/20 border border-red-500/30 text-red-200 rounded-tr-none opacity-80'
                            : msg.status === 'pending'
                              ? 'bg-gradient-primary text-white rounded-tr-none opacity-60'
                              : 'bg-gradient-primary text-white shadow-glow-blue/20 rounded-tr-none'
                          : 'bg-white/5 text-white/90 border border-white/10 rounded-tl-none backdrop-blur-md'
                        }`}
                    >
                      {msg.content}
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 px-1">
                      <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">
                        {Number.isNaN(new Date(msg.timestamp).getTime())
                          ? 'Just now'
                          : new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                      </span>

                      {isMe && (
                        <span className="flex items-center gap-1">
                          <StatusIcon status={msg.status} />
                          {isFailed && (
                            <button
                              type="button"
                              aria-label="Retry sending message"
                              className="text-[9px] text-red-400 font-black uppercase tracking-widest hover:text-red-300 transition-colors"
                              onClick={() => sendMessage(msg.content)}
                            >
                              Retry
                            </button>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Input ── */}
        <div className="border-t border-white/5 bg-white/[0.02] p-3 backdrop-blur-md sm:p-4">
          {connectionStatus === 'polling' && (
            <div className="mb-2 flex items-center gap-2 rounded-xl bg-orange-500/10 border border-orange-500/20 px-3 py-1.5">
              <WifiOff size={12} className="text-orange-400 flex-shrink-0" />
              <p className="text-[10px] font-black text-orange-300 uppercase tracking-wide">
                Live connection lost — messages will still be sent via HTTP
              </p>
            </div>
          )}

          <form id="chatbox-form" onSubmit={handleSubmit} className="flex items-center gap-2.5">
            <div className="flex-grow relative group">
              <input
                id="chatbox-input"
                type="text"
                placeholder="Write a message…"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                maxLength={2000}
                disabled={isSending || loadingHistory}
                autoComplete="off"
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-5 pr-4 py-3.5 text-sm text-white placeholder-white/20 outline-none focus:border-neon-blue/50 focus:ring-2 focus:ring-neon-blue/10 transition-all font-bold disabled:opacity-60"
              />
              <div className="absolute inset-0 rounded-2xl bg-neon-blue/5 opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity" />
            </div>

            <button
              id="chatbox-send-btn"
              type="submit"
              aria-label="Send message"
              disabled={!inputValue.trim() || isSending || loadingHistory}
              className="p-3.5 bg-gradient-primary text-white rounded-2xl shadow-glow-blue hover:opacity-90 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale flex-shrink-0"
            >
              {isSending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default ChatBox;
