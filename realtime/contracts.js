'use strict';

const CONTRACT_VERSION = 1;

const EVENTS = Object.freeze({
    SESSION_READY: 'v1:session:ready',
    SESSION_ERROR: 'v1:session:error',
    CHAT_JOIN: 'v1:chat:join',
    CHAT_LEAVE: 'v1:chat:leave',
    CHAT_PUBLISH: 'v1:chat:publish',
    CHAT_MESSAGE: 'v1:chat:message',
    LOCATION_JOIN: 'v1:location:join',
    LOCATION_LEAVE: 'v1:location:leave',
    LOCATION_START: 'v1:location:start',
    LOCATION_PUBLISH: 'v1:location:publish',
    LOCATION_UPDATE: 'v1:location:update',
    LOCATION_STOP: 'v1:location:stop'
});

const ERROR_CODES = Object.freeze({
    UNAUTHENTICATED: 'UNAUTHENTICATED',
    TOKEN_REVOKED: 'TOKEN_REVOKED',
    FORBIDDEN: 'FORBIDDEN',
    BOOKING_NOT_FOUND: 'BOOKING_NOT_FOUND',
    INVALID_BOOKING_STATE: 'INVALID_BOOKING_STATE',
    INVALID_PAYLOAD: 'INVALID_PAYLOAD',
    STALE_EVENT: 'STALE_EVENT',
    RATE_LIMITED: 'RATE_LIMITED',
    INTERNAL_ERROR: 'INTERNAL_ERROR'
});

const LIMITS = Object.freeze({
    MAX_HTTP_BUFFER_BYTES: 16 * 1024,
    MAX_BOOKING_ID_LENGTH: 24,
    MAX_MESSAGE_ID_LENGTH: 24,
    MAX_CLOCK_SKEW_MS: 30 * 1000,
    LOCATION_MIN_INTERVAL_MS: 5 * 1000,
    LOCATION_MAX_ACCURACY_METERS: 500
});

const ROOM_PREFIXES = Object.freeze({
    USER: 'user',
    CHAT: 'booking:chat',
    LOCATION: 'booking:location'
});

const roomNames = Object.freeze({
    user: (userId) => `${ROOM_PREFIXES.USER}:${String(userId)}`,
    chat: (bookingId) => `${ROOM_PREFIXES.CHAT}:${String(bookingId)}`,
    location: (bookingId) => `${ROOM_PREFIXES.LOCATION}:${String(bookingId)}`
});

const timestamp = () => new Date().toISOString();

const acknowledgement = Object.freeze({
    success: (data = null) => ({
        ok: true,
        version: CONTRACT_VERSION,
        serverTimestamp: timestamp(),
        data
    }),
    error: (code, message) => ({
        ok: false,
        version: CONTRACT_VERSION,
        serverTimestamp: timestamp(),
        error: { code, message }
    })
});

module.exports = {
    CONTRACT_VERSION,
    EVENTS,
    ERROR_CODES,
    LIMITS,
    ROOM_PREFIXES,
    roomNames,
    acknowledgement
};
