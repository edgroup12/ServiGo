import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { createRealtimeSocket, readStoredToken } from '../services/socket';
import api from '../services/api';
import {
  markChatMessageDelivered,
  mergeChatMessages,
} from './chat-state';

// ─── Constants ────────────────────────────────────────────────────────────────

const EVENTS = Object.freeze({
  SESSION_READY: 'v1:session:ready',
  CHAT_JOIN: 'v1:chat:join',
  CHAT_LEAVE: 'v1:chat:leave',
  CHAT_PUBLISH: 'v1:chat:publish',
  CHAT_MESSAGE: 'v1:chat:message',
  CHAT_RECEIVED: 'v1:chat:received',
  CHAT_DELIVERED: 'v1:chat:delivered',
});

const TERMINAL_PUBLISH_ERRORS = new Set([
  'FORBIDDEN',
  'INVALID_PAYLOAD',
  'MESSAGE_NOT_FOUND',
  'STALE_EVENT',
]);

/** HTTP polling interval when the socket is disconnected (ms). */
const POLL_INTERVAL_MS = 5_000;

/** Max time to wait for a server acknowledgement before retrying later (ms). */
const ACK_TIMEOUT_MS = 6_000;

// ─── Types (JSDoc) ────────────────────────────────────────────────────────────

/**
 * @typedef {'connected'|'connecting'|'disconnected'|'polling'} ConnectionStatus
 *
 * @typedef {'pending'|'sent'|'delivered'|'failed'} MessageStatus
 *
 * @typedef {{
 *   _id: string,
 *   bookingId: string,
 *   senderId: string,
 *   content: string,
 *   timestamp: string,
 *   status?: MessageStatus,
 *   _clientId?: string,
 * }} ChatMessage
 */

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Manages the full live-chat lifecycle for a single booking room.
 *
 * Responsibilities:
 *  - Creates an authenticated socket on mount and destroys it on unmount.
 *  - Joins / leaves `v1:chat` room automatically.
 *  - Receives real-time messages via `v1:chat:message`.
 *  - Sends messages via HTTP POST (source of truth), then broadcasts via socket.
 *  - Falls back to HTTP polling every 5 s when the socket is disconnected.
 *  - Exposes a `connectionStatus` so the UI can show a Live / Offline badge.
 *  - Deduplicates messages arriving from both the socket and HTTP polling.
 *
 * @param {{
 *   bookingId: string,
 *   currentUserId: string,
 *   initialMessages?: ChatMessage[],
 * }} options
 *
 * @returns {{
 *   messages: ChatMessage[],
 *   connectionStatus: ConnectionStatus,
 *   sendMessage: (content: string) => Promise<void>,
 *   isSending: boolean,
 * }}
 */
const useChatSocket = ({ bookingId, currentUserId, initialMessages = [] }) => {
  // ── State ──────────────────────────────────────────────────────────────────
  const [token] = useState(readStoredToken);
  const [messages, setMessages] = useState(/** @type {ChatMessage[]} */([]));
  const [connectionStatus, setConnectionStatus] = useState(
    /** @type {ConnectionStatus} */(token ? 'connecting' : 'polling')
  );
  const [isSending, setIsSending] = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const socketRef = useRef(/** @type {ReturnType<typeof createRealtimeSocket>|null} */(null));
  const seenIdsRef = useRef(/** @type {Set<string>} */(new Set()));
  const pollTimerRef = useRef(/** @type {ReturnType<typeof setInterval>|null} */(null));
  const inRoomRef = useRef(false);
  const joiningRoomRef = useRef(false);
  const outboxRef = useRef(/** @type {Map<string, string>} */(new Map()));

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Adds messages that haven't been seen yet to state (deduplication).
   *
   * @param {ChatMessage[]} incoming
   */
  const mergeMessages = useCallback((incoming) => {
    const fresh = incoming.filter((m) => m._id && !seenIdsRef.current.has(m._id));
    if (fresh.length === 0) return;
    fresh.forEach((m) => seenIdsRef.current.add(m._id));
    setMessages((previous) => mergeChatMessages(previous, fresh));
  }, []);

  /**
   * Updates the status field on an optimistic message identified by _clientId.
   *
   * @param {string} clientId
   * @param {MessageStatus} status
   * @param {Partial<ChatMessage>} [patch] — optional field overrides
   */
  const patchOptimistic = useCallback((clientId, status, patch = {}) => {
    setMessages((prev) =>
      prev.map((m) =>
        m._clientId === clientId ? { ...m, ...patch, status } : m
      )
    );
  }, []);

  const markDelivered = useCallback((messageId) => {
    outboxRef.current.delete(messageId);
    setMessages((previous) => markChatMessageDelivered(previous, messageId));
  }, []);

  const reconcileHistory = useCallback(async () => {
    const res = await api.get(`/messages/${bookingId}`);
    const data = Array.isArray(res.data) ? res.data : [];
    mergeMessages(data);
  }, [bookingId, mergeMessages]);

  const visibleMessages = useMemo(
    () => mergeChatMessages(initialMessages, messages),
    [initialMessages, messages]
  );

  // ── HTTP Polling Fallback ──────────────────────────────────────────────────

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return;
    pollTimerRef.current = setInterval(() => {
      reconcileHistory().catch(() => {
        // The connection badge already communicates degraded operation.
      });
    }, POLL_INTERVAL_MS);
  }, [reconcileHistory]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  // ── Room Join / Leave ──────────────────────────────────────────────────────

  const publishPersisted = useCallback((messageId, clientId) => {
    const socket = socketRef.current;
    if (!socket?.connected || !inRoomRef.current) return;

    socket.timeout(ACK_TIMEOUT_MS).emit(
      EVENTS.CHAT_PUBLISH,
      { bookingId, messageId, clientTimestamp: new Date().toISOString() },
      (error, ack) => {
        if (!error && ack?.ok) {
          patchOptimistic(clientId, 'sent');
          return;
        }
        if (ack?.error?.code && TERMINAL_PUBLISH_ERRORS.has(ack.error.code)) {
          outboxRef.current.delete(messageId);
        }
      }
    );
  }, [bookingId, patchOptimistic]);

  const flushOutbox = useCallback(() => {
    outboxRef.current.forEach((clientId, messageId) => {
      publishPersisted(messageId, clientId);
    });
  }, [publishPersisted]);

  const joinRoom = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || inRoomRef.current || joiningRoomRef.current) return;
    joiningRoomRef.current = true;
    socket.timeout(ACK_TIMEOUT_MS).emit(EVENTS.CHAT_JOIN, { bookingId }, (error, ack) => {
      joiningRoomRef.current = false;
      if (!error && ack?.ok) {
        inRoomRef.current = true;
        setConnectionStatus('connected');
        stopPolling();
        reconcileHistory().catch(() => { });
        flushOutbox();
      } else {
        setConnectionStatus('polling');
        startPolling();
      }
    });
  }, [bookingId, flushOutbox, reconcileHistory, startPolling, stopPolling]);

  const leaveRoom = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !inRoomRef.current) return;
    socket.emit(EVENTS.CHAT_LEAVE, { bookingId });
    inRoomRef.current = false;
    joiningRoomRef.current = false;
  }, [bookingId]);

  // ── Socket Lifecycle ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!bookingId) return;
    if (!token) {
      startPolling();
      return stopPolling;
    }

    const socket = createRealtimeSocket(token);
    socketRef.current = socket;

    // — Connection events —

    socket.on('connect', () => {
      setConnectionStatus('connecting');
      joinRoom();
    });

    socket.on('connect_error', () => {
      setConnectionStatus('connecting');
    });

    socket.on('disconnect', () => {
      inRoomRef.current = false;
      joiningRoomRef.current = false;
      setConnectionStatus('polling');
      startPolling();
    });

    socket.io.on('reconnect_attempt', () => {
      setConnectionStatus('connecting');
    });

    socket.io.on('reconnect_failed', () => {
      setConnectionStatus('polling');
      startPolling();
    });

    socket.io.on('reconnect', () => {
      setConnectionStatus('connecting');
      joinRoom();
    });

    // — Session ready (server confirms auth) —
    socket.on(EVENTS.SESSION_READY, () => {
      joinRoom();
    });

    // — Incoming canonical messages and recipient delivery receipts —
    socket.on(EVENTS.CHAT_MESSAGE, (msg) => {
      if (msg?.bookingId !== bookingId || !msg?._id) return;
      mergeMessages([msg]);
      socket.timeout(ACK_TIMEOUT_MS).emit(
        EVENTS.CHAT_RECEIVED,
        { bookingId, messageId: msg._id },
        () => { }
      );
    });

    socket.on(EVENTS.CHAT_DELIVERED, (receipt) => {
      if (receipt?.bookingId === bookingId && receipt?.messageId) {
        markDelivered(receipt.messageId);
      }
    });

    socket.connect();

    return () => {
      leaveRoom();
      socket.disconnect();
      socketRef.current = null;
      stopPolling();
    };
  }, [bookingId, joinRoom, leaveRoom, markDelivered, mergeMessages, startPolling, stopPolling, token]);

  // ── Send Message ───────────────────────────────────────────────────────────

  /**
   * Sends a message:
   *  1. Adds an optimistic (pending) entry to the UI immediately.
   *  2. POSTs to the HTTP API — this persists the message (source of truth).
   *  3. On success, promotes the message to `sent` and broadcasts via socket.
   *  4. A recipient receipt promotes the persisted message to `delivered`.
   *  5. On HTTP failure, marks the optimistic entry as `failed`.
   *
   * @param {string} content
   */
  const sendMessage = useCallback(
    async (content) => {
      if (!content.trim() || isSending) return;

      const clientId = `opt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimistic = /** @type {ChatMessage} */ ({
        _clientId: clientId,
        _id: clientId, // placeholder; replaced after HTTP response
        bookingId,
        senderId: currentUserId,
        content: content.trim(),
        timestamp: new Date().toISOString(),
        status: 'pending',
      });

      // Step 1: Optimistic UI
      setMessages((prev) => [...prev, optimistic]);
      setIsSending(true);

      try {
        // Step 2: Persist via HTTP API
        const res = await api.post('/messages', { bookingId, content: content.trim() });
        const saved = res.data;

        // Register the real ID so polling and socket delivery deduplicate.
        seenIdsRef.current.add(saved._id);
        outboxRef.current.set(saved._id, clientId);

        // HTTP success means persisted/sent. Only a recipient receipt means delivered.
        patchOptimistic(clientId, 'sent', {
          ...saved,
          _id: saved._id,
          _clientId: clientId,
        });
        publishPersisted(saved._id, clientId);
      } catch {
        // Step 5: Mark as failed
        patchOptimistic(clientId, 'failed');
      } finally {
        setIsSending(false);
      }
    },
    [bookingId, currentUserId, isSending, patchOptimistic, publishPersisted]
  );

  return { messages: visibleMessages, connectionStatus, sendMessage, isSending };
};

export default useChatSocket;
