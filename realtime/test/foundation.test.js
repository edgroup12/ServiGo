'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { loadConfig, parseOrigins } = require('../config');
const {
    CONTRACT_VERSION,
    ERROR_CODES,
    EVENTS,
    LIMITS,
    acknowledgement,
    roomNames
} = require('../contracts');
const {
    SocketAuthenticationError,
    createSocketAuthenticator,
    readHandshakeToken
} = require('../authenticate');
const { sanitize } = require('../logger');
const { createRealtimeServer } = require('../server');
const {
    CHAT_READABLE_STATUSES,
    isParticipant,
    authorizeBookingRoom
} = require('../authorize-booking');

const runMiddleware = (middleware, socket) => new Promise((resolve) => {
    middleware(socket, (error) => resolve(error));
});

test('config parses exact origins and rejects wildcard origins', () => {
    assert.deepEqual(
        parseOrigins('http://localhost:5173, https://servigo-bd.vercel.app '),
        ['http://localhost:5173', 'https://servigo-bd.vercel.app']
    );

    assert.throws(() => loadConfig({
        MONGODB_URI: 'mongodb://example',
        JWT_SECRET: 'secret',
        ALLOWED_ORIGINS: '*'
    }), /cannot contain a wildcard/);
});

test('contract provides versioned events, scoped rooms and acknowledgements', () => {
    assert.equal(CONTRACT_VERSION, 1);
    assert.match(EVENTS.CHAT_JOIN, /^v1:/);
    assert.equal(roomNames.user('123'), 'user:123');
    assert.equal(roomNames.chat('abc'), 'booking:chat:abc');
    assert.equal(roomNames.location('abc'), 'booking:location:abc');
    assert.equal(LIMITS.MAX_HTTP_BUFFER_BYTES, 16384);

    const success = acknowledgement.success({ joined: true });
    assert.equal(success.ok, true);
    assert.equal(success.data.joined, true);

    const failure = acknowledgement.error(ERROR_CODES.FORBIDDEN, 'Forbidden');
    assert.equal(failure.ok, false);
    assert.equal(failure.error.code, ERROR_CODES.FORBIDDEN);
});

test('handshake token reader accepts only a trimmed string', () => {
    assert.equal(readHandshakeToken({ handshake: { auth: { token: ' token ' } } }), 'token');
    assert.equal(readHandshakeToken({ handshake: { auth: { token: 123 } } }), '');
    assert.equal(readHandshakeToken({}), '');
});

test('socket authenticator rejects missing tokens', async () => {
    const middleware = createSocketAuthenticator({
        jwtSecret: 'secret',
        tokenModel: { exists: async () => false }
    });
    const error = await runMiddleware(middleware, { handshake: { auth: {} }, data: {} });

    assert.ok(error instanceof SocketAuthenticationError);
    assert.equal(error.data.code, ERROR_CODES.UNAUTHENTICATED);
});

test('socket authenticator rejects blacklisted tokens before verification', async () => {
    const middleware = createSocketAuthenticator({
        jwtSecret: 'secret',
        tokenModel: { exists: async () => true }
    });
    const error = await runMiddleware(middleware, {
        handshake: { auth: { token: 'revoked' } },
        data: {}
    });

    assert.equal(error.data.code, ERROR_CODES.TOKEN_REVOKED);
});

test('socket authenticator rejects expired tokens', async () => {
    const token = jwt.sign(
        { id: '507f1f77bcf86cd799439011', role: 'customer' },
        'secret',
        { expiresIn: -1 }
    );
    const middleware = createSocketAuthenticator({
        jwtSecret: 'secret',
        tokenModel: { exists: async () => false }
    });
    const error = await runMiddleware(middleware, {
        handshake: { auth: { token } },
        data: {}
    });

    assert.equal(error.data.code, ERROR_CODES.UNAUTHENTICATED);
});

test('socket authenticator stores only verified identity in socket data', async () => {
    const token = jwt.sign(
        { id: '507f1f77bcf86cd799439011', role: 'worker', email: 'private@example.com' },
        'secret',
        { expiresIn: '5m' }
    );
    const socket = { handshake: { auth: { token } }, data: {} };
    const middleware = createSocketAuthenticator({
        jwtSecret: 'secret',
        tokenModel: { exists: async () => false }
    });
    const error = await runMiddleware(middleware, socket);

    assert.equal(error, undefined);
    assert.deepEqual(socket.data.user, {
        id: '507f1f77bcf86cd799439011',
        role: 'worker'
    });
    assert.equal(Object.isFrozen(socket.data.user), true);
});

test('logger sanitizer redacts tokens, message content and coordinates', () => {
    assert.deepEqual(sanitize({
        token: 'secret',
        nested: { content: 'hello', lat: 23.8, safe: 'value' }
    }), {
        token: '[REDACTED]',
        nested: { content: '[REDACTED]', lat: '[REDACTED]', safe: 'value' }
    });
});

test('booking authorization permits only participants under the scoped status policy', async () => {
    const customerId = '507f1f77bcf86cd799439011';
    const workerId = '507f1f77bcf86cd799439012';
    const bookingId = '507f1f77bcf86cd799439013';
    const makeBookingModel = (status) => ({
        findById: () => ({
            select: () => ({
                lean: async () => ({
                    _id: bookingId,
                    customer: customerId,
                    worker: workerId,
                    status
                })
            })
        })
    });

    assert.deepEqual(CHAT_READABLE_STATUSES, ['confirmed', 'completed', 'declined']);
    assert.equal(isParticipant({ customer: customerId, worker: workerId }, customerId), true);

    const chat = await authorizeBookingRoom({
        bookingId,
        user: { id: customerId, role: 'customer' },
        scope: 'chat',
        bookingModel: makeBookingModel('completed')
    });
    assert.equal(chat.ok, true);
    assert.equal(chat.booking.status, 'completed');

    const inactiveLocation = await authorizeBookingRoom({
        bookingId,
        user: { id: workerId, role: 'worker' },
        scope: 'location',
        bookingModel: makeBookingModel('completed')
    });
    assert.equal(inactiveLocation.ok, false);
    assert.equal(inactiveLocation.code, ERROR_CODES.INVALID_BOOKING_STATE);

    const outsider = await authorizeBookingRoom({
        bookingId,
        user: { id: '507f1f77bcf86cd799439014', role: 'customer' },
        scope: 'chat',
        bookingModel: makeBookingModel('confirmed')
    });
    assert.equal(outsider.code, ERROR_CODES.FORBIDDEN);

    const admin = await authorizeBookingRoom({
        bookingId,
        user: { id: '507f1f77bcf86cd799439015', role: 'admin' },
        scope: 'chat',
        bookingModel: makeBookingModel('confirmed')
    });
    assert.equal(admin.code, ERROR_CODES.FORBIDDEN);
});

test('service exposes separate liveness and readiness endpoints', async () => {
    let databaseReady = true;
    const service = createRealtimeServer({
        config: {
            nodeEnv: 'test',
            port: 0,
            mongodbUri: 'mongodb://unused',
            jwtSecret: 'secret',
            allowedOrigins: ['http://localhost:5173'],
            shutdownTimeoutMs: 1000
        },
        connect: async () => { },
        disconnect: async () => { },
        isReady: () => databaseReady
    });

    const address = await service.start();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    try {
        const health = await fetch(`${baseUrl}/health`);
        assert.equal(health.status, 200);
        assert.deepEqual(await health.json(), {
            status: 'ok',
            service: 'servigo-realtime',
            version: CONTRACT_VERSION
        });

        const ready = await fetch(`${baseUrl}/ready`);
        assert.equal(ready.status, 200);
        assert.equal((await ready.json()).status, 'ready');

        databaseReady = false;
        const unavailable = await fetch(`${baseUrl}/ready`);
        assert.equal(unavailable.status, 503);
        assert.equal((await unavailable.json()).status, 'not_ready');
    } finally {
        await service.stop();
    }
});
