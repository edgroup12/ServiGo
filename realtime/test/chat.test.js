'use strict';

/**
 * Integration tests for the v1:chat:publish handler.
 *
 * Each test spins up a real in-process server with stubbed DB dependencies
 * (no MongoDB required) and connects real Socket.IO clients over HTTP polling
 * (avoids OS-level WebSocket quirks in CI environments).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { io: ioc } = require('socket.io-client');
const { createRealtimeServer } = require('../server');
const { EVENTS, ERROR_CODES } = require('../contracts');

// ── Fixtures ──────────────────────────────────────────────────────────────────

const JWT_SECRET = 'test-secret-phase-b';
const CUSTOMER_ID = '507f1f77bcf86cd799430002';
const WORKER_ID = '507f1f77bcf86cd799430003';
const OUTSIDER_ID = '507f1f77bcf86cd799430005';
const BOOKING_ID = '507f1f77bcf86cd799430001';
const MESSAGE_ID = '507f1f77bcf86cd799430004';
const MESSAGE_TIMESTAMP = '2026-08-07T10:00:00.000Z';
const MESSAGE_CONTENT = 'Canonical persisted message';

const makeToken = (id, role = 'customer') =>
    jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '5m' });

// ── Stubs ─────────────────────────────────────────────────────────────────────

/** Booking model that returns a confirmed booking for any findById call. */
const confirmedBookingStub = {
    findById: () => ({
        select: () => ({
            lean: async () => ({
                _id: BOOKING_ID,
                customer: CUSTOMER_ID,
                worker: WORKER_ID,
                status: 'confirmed'
            })
        })
    })
};

/** Message model that enforces the same predicates as MongoDB for one fixture. */
const persistedMessageStub = {
    findOne: (query) => ({
        lean: async () => {
            if (
                String(query._id) !== MESSAGE_ID ||
                String(query.bookingId) !== BOOKING_ID ||
                (query.senderId !== undefined && String(query.senderId) !== CUSTOMER_ID)
            ) {
                return null;
            }
            return {
                _id: MESSAGE_ID,
                bookingId: BOOKING_ID,
                senderId: CUSTOMER_ID,
                content: MESSAGE_CONTENT,
                timestamp: new Date(MESSAGE_TIMESTAMP)
            };
        }
    })
};

/** Token model that never revokes any token. */
const noRevocations = { exists: async () => false };

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Starts a fully-stubbed server instance and returns { service, port }.
 *
 * @param {object} [overrides] — optional model or lifecycle overrides
 */
const startService = async (overrides = {}) => {
    const service = createRealtimeServer({
        config: {
            nodeEnv: 'test',
            port: 0,
            mongodbUri: 'mongodb://unused',
            jwtSecret: JWT_SECRET,
            allowedOrigins: ['http://localhost:5173'],
            shutdownTimeoutMs: 2000
        },
        connect: async () => { },
        disconnect: async () => { },
        isReady: () => true,
        tokenModel: noRevocations,
        bookingModel: confirmedBookingStub,
        messageModel: persistedMessageStub,
        ...overrides
    });

    const addr = await service.start();
    return { service, port: addr.port };
};

/**
 * Creates an authenticated Socket.IO client that uses long-polling transport
 * (avoids raw WebSocket OS issues in test environments).
 *
 * @param {number} port
 * @param {string} token
 * @returns {Promise<import('socket.io-client').Socket>}
 */
const connectClient = (port, token) =>
    new Promise((resolve, reject) => {
        const socket = ioc(`http://127.0.0.1:${port}`, {
            auth: { token },
            transports: ['polling'],  // polling only — avoids websocket errors in tests
            reconnection: false,
            timeout: 4000
        });
        socket.once('connect', () => resolve(socket));
        socket.once('connect_error', (err) => reject(new Error(`connect_error: ${err.message}`)));
        socket.connect();
    });

/**
 * Emits an event with an acknowledgement callback and returns a promise
 * that resolves with the ack payload.
 *
 * @param {import('socket.io-client').Socket} socket
 * @param {string} event
 * @param {object} payload
 * @returns {Promise<object>}
 */
const emitAck = (socket, event, payload) =>
    new Promise((resolve) => socket.emit(event, payload, resolve));

/** Resolves with the next payload for event, or rejects on timeout. */
const nextEvent = (socket, event, timeoutMs = 3000) =>
    new Promise((resolve, reject) => {
        const timer = setTimeout(
            () => reject(new Error(`Timed out waiting for ${event}`)),
            timeoutMs
        );
        socket.once(event, (payload) => {
            clearTimeout(timer);
            resolve(payload);
        });
    });

const nextConnect = (socket, timeoutMs = 3000) =>
    new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timed out waiting for reconnect')), timeoutMs);
        socket.once('connect', () => {
            clearTimeout(timer);
            resolve();
        });
    });

// ── Tests ─────────────────────────────────────────────────────────────────────

test('v1:chat:publish: valid publish → broadcast to room → ack success', async (t) => {
    const { service, port } = await startService();
    t.after(() => service.stop());

    const customer = await connectClient(port, makeToken(CUSTOMER_ID, 'customer'));
    const worker = await connectClient(port, makeToken(WORKER_ID, 'worker'));
    t.after(() => { customer.disconnect(); worker.disconnect(); });

    // Both participants join the room.
    const cJoin = await emitAck(customer, EVENTS.CHAT_JOIN, { bookingId: BOOKING_ID });
    assert.equal(cJoin.ok, true, 'Customer should join successfully');

    const wJoin = await emitAck(worker, EVENTS.CHAT_JOIN, { bookingId: BOOKING_ID });
    assert.equal(wJoin.ok, true, 'Worker should join successfully');

    // Worker waits for incoming message before customer publishes.
    const incomingPromise = nextEvent(worker, EVENTS.CHAT_MESSAGE);

    const ack = await emitAck(customer, EVENTS.CHAT_PUBLISH, {
        bookingId: BOOKING_ID,
        messageId: MESSAGE_ID,
        clientTimestamp: new Date().toISOString()
    });

    assert.equal(ack.ok, true, 'Publish ack should be ok');
    assert.equal(ack.data.messageId, MESSAGE_ID, 'Ack should echo messageId');
    assert.equal(ack.data.deliveryState, 'sent');

    const received = await incomingPromise;
    assert.deepEqual(received, {
        _id: MESSAGE_ID,
        bookingId: BOOKING_ID,
        senderId: CUSTOMER_ID,
        content: MESSAGE_CONTENT,
        timestamp: MESSAGE_TIMESTAMP
    });
});

test('v1:chat:publish: rejects a message not persisted by the authenticated sender', async (t) => {
    const { service, port } = await startService();
    t.after(() => service.stop());

    const worker = await connectClient(port, makeToken(WORKER_ID, 'worker'));
    t.after(() => worker.disconnect());
    assert.equal((await emitAck(worker, EVENTS.CHAT_JOIN, { bookingId: BOOKING_ID })).ok, true);

    const ack = await emitAck(worker, EVENTS.CHAT_PUBLISH, {
        bookingId: BOOKING_ID,
        messageId: MESSAGE_ID,
        clientTimestamp: new Date().toISOString()
    });

    assert.equal(ack.ok, false);
    assert.equal(ack.error.code, ERROR_CODES.MESSAGE_NOT_FOUND);
});

test('v1:chat:publish: rejects a missing persisted message', async (t) => {
    const messageModel = { findOne: () => ({ lean: async () => null }) };
    const { service, port } = await startService({ messageModel });
    t.after(() => service.stop());

    const customer = await connectClient(port, makeToken(CUSTOMER_ID, 'customer'));
    t.after(() => customer.disconnect());
    assert.equal((await emitAck(customer, EVENTS.CHAT_JOIN, { bookingId: BOOKING_ID })).ok, true);

    const ack = await emitAck(customer, EVENTS.CHAT_PUBLISH, {
        bookingId: BOOKING_ID,
        messageId: MESSAGE_ID,
        clientTimestamp: new Date().toISOString()
    });

    assert.equal(ack.ok, false);
    assert.equal(ack.error.code, ERROR_CODES.MESSAGE_NOT_FOUND);
});

test('v1:chat:received: routes delivery to the persisted sender', async (t) => {
    const { service, port } = await startService();
    t.after(() => service.stop());

    const customer = await connectClient(port, makeToken(CUSTOMER_ID, 'customer'));
    const worker = await connectClient(port, makeToken(WORKER_ID, 'worker'));
    t.after(() => { customer.disconnect(); worker.disconnect(); });
    await emitAck(customer, EVENTS.CHAT_JOIN, { bookingId: BOOKING_ID });
    await emitAck(worker, EVENTS.CHAT_JOIN, { bookingId: BOOKING_ID });

    const deliveredPromise = nextEvent(customer, EVENTS.CHAT_DELIVERED);
    const ack = await emitAck(worker, EVENTS.CHAT_RECEIVED, {
        bookingId: BOOKING_ID,
        messageId: MESSAGE_ID
    });

    assert.equal(ack.ok, true);
    assert.equal(ack.data.deliveryState, 'delivered');
    const delivered = await deliveredPromise;
    assert.equal(delivered.bookingId, BOOKING_ID);
    assert.equal(delivered.messageId, MESSAGE_ID);
    assert.equal(delivered.deliveredBy, WORKER_ID);
});

test('v1:chat:received: rejects sender self-receipts', async (t) => {
    const { service, port } = await startService();
    t.after(() => service.stop());

    const customer = await connectClient(port, makeToken(CUSTOMER_ID, 'customer'));
    t.after(() => customer.disconnect());
    await emitAck(customer, EVENTS.CHAT_JOIN, { bookingId: BOOKING_ID });

    const ack = await emitAck(customer, EVENTS.CHAT_RECEIVED, {
        bookingId: BOOKING_ID,
        messageId: MESSAGE_ID
    });

    assert.equal(ack.ok, false);
    assert.equal(ack.error.code, ERROR_CODES.FORBIDDEN);
});

test('v1:chat:publish: rejects messageId that is too long', async (t) => {
    const { service, port } = await startService();
    t.after(() => service.stop());

    const socket = await connectClient(port, makeToken(CUSTOMER_ID, 'customer'));
    t.after(() => socket.disconnect());

    const ack = await emitAck(socket, EVENTS.CHAT_PUBLISH, {
        bookingId: BOOKING_ID,
        messageId: 'x'.repeat(100), // exceeds MAX_MESSAGE_ID_LENGTH (24)
        clientTimestamp: new Date().toISOString()
    });

    assert.equal(ack.ok, false, 'Should reject invalid messageId');
    assert.equal(ack.error.code, ERROR_CODES.INVALID_PAYLOAD);
});

test('v1:chat:publish: rejects missing bookingId', async (t) => {
    const { service, port } = await startService();
    t.after(() => service.stop());

    const socket = await connectClient(port, makeToken(CUSTOMER_ID, 'customer'));
    t.after(() => socket.disconnect());

    const ack = await emitAck(socket, EVENTS.CHAT_PUBLISH, {
        messageId: MESSAGE_ID,
        clientTimestamp: new Date().toISOString()
        // bookingId intentionally absent
    });

    assert.equal(ack.ok, false, 'Should reject missing bookingId');
    assert.equal(ack.error.code, ERROR_CODES.INVALID_PAYLOAD);
});

test('v1:chat:publish: rejects a stale clientTimestamp (>30 s ago)', async (t) => {
    const { service, port } = await startService();
    t.after(() => service.stop());

    const socket = await connectClient(port, makeToken(CUSTOMER_ID, 'customer'));
    t.after(() => socket.disconnect());

    const stale = new Date(Date.now() - 60_000).toISOString(); // 60 s ago

    const ack = await emitAck(socket, EVENTS.CHAT_PUBLISH, {
        bookingId: BOOKING_ID,
        messageId: MESSAGE_ID,
        clientTimestamp: stale
    });

    assert.equal(ack.ok, false, 'Should reject stale timestamp');
    assert.equal(ack.error.code, ERROR_CODES.STALE_EVENT);
});

test('v1:chat:publish: rejects sender who has not joined the chat room', async (t) => {
    const { service, port } = await startService();
    t.after(() => service.stop());

    const socket = await connectClient(port, makeToken(CUSTOMER_ID, 'customer'));
    t.after(() => socket.disconnect());

    // Publish WITHOUT joining the room first.
    const ack = await emitAck(socket, EVENTS.CHAT_PUBLISH, {
        bookingId: BOOKING_ID,
        messageId: MESSAGE_ID,
        clientTimestamp: new Date().toISOString()
    });

    assert.equal(ack.ok, false, 'Should reject non-room member');
    assert.equal(ack.error.code, ERROR_CODES.FORBIDDEN);
});

test('v1:chat:reconnect: requires an authorized room rejoin before publishing', async (t) => {
    const { service, port } = await startService();
    t.after(() => service.stop());

    const customer = await connectClient(port, makeToken(CUSTOMER_ID, 'customer'));
    const worker = await connectClient(port, makeToken(WORKER_ID, 'worker'));
    t.after(() => { customer.disconnect(); worker.disconnect(); });
    await emitAck(customer, EVENTS.CHAT_JOIN, { bookingId: BOOKING_ID });
    await emitAck(worker, EVENTS.CHAT_JOIN, { bookingId: BOOKING_ID });

    customer.disconnect();
    const reconnected = nextConnect(customer);
    customer.connect();
    await reconnected;

    const rejected = await emitAck(customer, EVENTS.CHAT_PUBLISH, {
        bookingId: BOOKING_ID,
        messageId: MESSAGE_ID,
        clientTimestamp: new Date().toISOString()
    });
    assert.equal(rejected.ok, false);
    assert.equal(rejected.error.code, ERROR_CODES.FORBIDDEN);

    const incomingPromise = nextEvent(worker, EVENTS.CHAT_MESSAGE);
    const rejoin = await emitAck(customer, EVENTS.CHAT_JOIN, { bookingId: BOOKING_ID });
    assert.equal(rejoin.ok, true);
    const published = await emitAck(customer, EVENTS.CHAT_PUBLISH, {
        bookingId: BOOKING_ID,
        messageId: MESSAGE_ID,
        clientTimestamp: new Date().toISOString()
    });
    assert.equal(published.ok, true);
    assert.equal((await incomingPromise)._id, MESSAGE_ID);
});

test('v1:chat:join: rejects authenticated users outside the booking', async (t) => {
    const { service, port } = await startService();
    t.after(() => service.stop());

    const outsider = await connectClient(port, makeToken(OUTSIDER_ID, 'customer'));
    t.after(() => outsider.disconnect());

    const ack = await emitAck(outsider, EVENTS.CHAT_JOIN, { bookingId: BOOKING_ID });
    assert.equal(ack.ok, false);
    assert.equal(ack.error.code, ERROR_CODES.FORBIDDEN);
});
