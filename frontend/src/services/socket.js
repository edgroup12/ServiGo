import { io } from 'socket.io-client';

const REALTIME_URL =
  import.meta.env.VITE_REALTIME_URL || 'http://localhost:5002';

/**
 * Creates an authenticated Socket.IO connection to the realtime server.
 *
 * The socket is NOT auto-connected — call socket.connect() explicitly.
 * This allows callers to control the connection lifecycle and avoid
 * opening connections before a JWT token is available.
 *
 * @param {string} token — JWT from localStorage (servigo_user)
 * @returns {import('socket.io-client').Socket}
 */
export const createRealtimeSocket = (token) =>
  io(REALTIME_URL, {
    auth: { token },
    autoConnect: false,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
    randomizationFactor: 0.4,
    timeout: 10_000,
  });

/**
 * Reads the JWT token from localStorage.
 * Returns an empty string if the token is unavailable or storage is corrupted.
 *
 * @returns {string}
 */
export const readStoredToken = () => {
  try {
    const raw = localStorage.getItem('servigo_user');
    if (!raw) return '';
    const { token } = JSON.parse(raw);
    return typeof token === 'string' ? token : '';
  } catch {
    return '';
  }
};
