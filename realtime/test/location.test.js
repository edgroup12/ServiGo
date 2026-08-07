'use strict';

/**
 * Integration coverage for authenticated, ephemeral live location.
 * Uses real Socket.IO clients and stubbed booking persistence.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { io: ioc } = require('socket.io-client');
const { createRealtimeServer } = require('../server');
const { EVENTS, ERROR_CODES } = require('../contracts');

const JWT_SECRET = 'test-secret-phase-d-location';
const INTERNAL_SECRET = 'internal-location-secret';
const CUSTOMER_ID = '507f1f77bcf86cd799430002';
const WORKER_ID = '507f1f77bcf86cd799430003';
const OUTSIDER_ID = '507f1f77bcf86cd799430005';
const BOOKING_ID = '507f1f77bcf86cd799430001';

const makeToken = (id, role) => jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '5m' });

const makeBookingModel = (state = { status: 'confirmed' }) => ({
    findById: () => ({
        select: () => ({
            lean: async () => ({
                _id: BOOKING_ID,
                customer: CUSTOMER_ID,
                worker: WORKER_ID,
                status: state.status
            })
        })
    })
});

const noRevocations = { exists: async () => false };

const startService = async (state = { status: 'confirmed' }, overrides = {}) => {
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
        bookingModel: makeBookingModel(state),
        ...overrides
    });
    const address = await service.start();
    return { service, port: address.port };
};

const connectClient = (port, token) => new Promise((resolve, reject) => {
    const socket = ioc(`http://127.0.0.1:${port}`, {
        auth: { token },
        transports: ['polling'],
        reconnection: false,
        timeout: 4000
    });
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', (error) => reject(error));
    socket.connect();
});

const emitAck = (socket, event, payload) => new Promise((resolve) => {
    socket.emit(event, payload, resolve);
});

const nextEvent = (socket, event, timeoutMs = 3000) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), timeoutMs);
    socket.once(event, (payload) => {
        clearTimeout(timer);
        resolve(payload);
    });
});

const closeClients = (...clients) => clients.forEach((client) => client?.disconnect());

const joinLocation = (socket) => emitAck(socket, EVENTS.LOCATION_JOIN, { bookingId: BOOKING_ID });

const validLocation = (latitude = 23.8103, longitude = 90.4125) => ({
    bookingId: BOOKING_ID,
    latitude,
    longitude,
    accuracy: 25,
    clientTimestamp: new Date().toISOString()
});

test('location: authenticated worker publishes and participant receives the latest coordinate', async (t) => {
    const { service, port } = await startService();
    t.after(() => service.stop());
    const worker = await connectClient(port, makeToken(WORKER_ID, 'worker'));
    const customer = await connectClient(port, makeToken(CUSTOMER_ID, 'customer'));
    t.after(() => closeClients(worker, customer));

    assert.equal((await joinLocation(worker)).ok, true);
    assert.equal((await joinLocation(customer)).ok, true);
    assert.equal((await emitAck(worker, EVENTS.LOCATION_START, { bookingId: BOOKING_ID })).ok, true);

    const update = nextEvent(customer, EVENTS.LOCATION_UPDATE);
    const published = await emitAck(worker, EVENTS.LOCATION_PUBLISH, validLocation());
    assert.equal(published.ok, true);
    assert.equal(published.data.location.workerId, WORKER_ID);
    assert.deepEqual(await update, published.data.location);
});

test('location: rejects outsiders and prevents customers from starting or publishing', async (t) => {
    const { service, port } = await startService();
    t.after(() => service.stop());
    const outsider = await connectClient(port, makeToken(OUTSIDER_ID, 'customer'));
    const customer = await connectClient(port, makeToken(CUSTOMER_ID, 'customer'));
    t.after(() => closeClients(outsider, customer));

    assert.equal((await joinLocation(outsider)).error.code, ERROR_CODES.FORBIDDEN);
    assert.equal((await joinLocation(customer)).ok, true);
    const start = await emitAck(customer, EVENTS.LOCATION_START, { bookingId: BOOKING_ID });
    assert.equal(start.error.code, ERROR_CODES.FORBIDDEN);
    const publish = await emitAck(customer, EVENTS.LOCATION_PUBLISH, validLocation());
    assert.equal(publish.error.code, ERROR_CODES.FORBIDDEN);
});

test('location: validates coordinates and rate-limits updates', async (t) => {
    const { service, port } = await startService();
    t.after(() => service.stop());
    const worker = await connectClient(port, makeToken(WORKER_ID, 'worker'));
    t.after(() => worker.disconnect());
    assert.equal((await joinLocation(worker)).ok, true);
    assert.equal((await emitAck(worker, EVENTS.LOCATION_START, { bookingId: BOOKING_ID })).ok, true);

    const invalid = await emitAck(worker, EVENTS.LOCATION_PUBLISH, validLocation(91, 0));
    assert.equal(invalid.error.code, ERROR_CODES.INVALID_PAYLOAD);

    const inaccurate = await emitAck(worker, EVENTS.LOCATION_PUBLISH, {
        ...validLocation(),
        accuracy: 501
    });
    assert.equal(inaccurate.error.code, ERROR_CODES.INVALID_PAYLOAD);

    const invalidTimestamp = await emitAck(worker, EVENTS.LOCATION_PUBLISH, {
        ...validLocation(),
        clientTimestamp: 'not-a-timestamp'
    });
    assert.equal(invalidTimestamp.error.code, ERROR_CODES.INVALID_PAYLOAD);

    assert.equal((await emitAck(worker, EVENTS.LOCATION_PUBLISH, validLocation())).ok, true);
    const tooSoon = await emitAck(worker, EVENTS.LOCATION_PUBLISH, validLocation(23.811, 90.413));
    assert.equal(tooSoon.error.code, ERROR_CODES.RATE_LIMITED);
});

test('location: explicit stop broadcasts and clears latest state', async (t) => {
    const { service, port } = await startService();
    t.after(() => service.stop());
    const worker = await connectClient(port, makeToken(WORKER_ID, 'worker'));
    const customer = await connectClient(port, makeToken(CUSTOMER_ID, 'customer'));
    t.after(() => closeClients(worker, customer));
    await joinLocation(worker);
    const customerJoin = await joinLocation(customer);
    assert.equal(customerJoin.data.latestLocation, null);
    await emitAck(worker, EVENTS.LOCATION_START, { bookingId: BOOKING_ID });
    await emitAck(worker, EVENTS.LOCATION_PUBLISH, validLocation());

    const stopped = nextEvent(customer, EVENTS.LOCATION_STOP);
    const stopAck = await emitAck(worker, EVENTS.LOCATION_STOP, { bookingId: BOOKING_ID });
    assert.equal(stopAck.ok, true);
    assert.equal((await stopped).reason, 'stopped');

    const rejoin = await emitAck(customer, EVENTS.LOCATION_LEAVE, { bookingId: BOOKING_ID });
    assert.equal(rejoin.ok, true);
    assert.equal((await joinLocation(customer)).data.latestLocation, null);
});

test('location: completed and cancelled bookings deny location access', async (t) => {
    for (const status of ['completed', 'cancelled']) {
        const state = { status };
        const { service, port } = await startService(state);
        const worker = await connectClient(port, makeToken(WORKER_ID, 'worker'));
        t.after(() => {
            closeClients(worker);
            service.stop();
        });

        const join = await joinLocation(worker);
        assert.equal(join.ok, false, `${status} join should be denied`);
        assert.equal(join.error.code, ERROR_CODES.INVALID_BOOKING_STATE);
    }
});

test('location: disconnect clears the session and reconnect requires join and start again', async (t) => {
    const { service, port } = await startService();
    t.after(() => service.stop());
    const worker = await connectClient(port, makeToken(WORKER_ID, 'worker'));
    const customer = await connectClient(port, makeToken(CUSTOMER_ID, 'customer'));
    t.after(() => closeClients(worker, customer));
    await joinLocation(worker);
    await joinLocation(customer);
    await emitAck(worker, EVENTS.LOCATION_START, { bookingId: BOOKING_ID });
    await emitAck(worker, EVENTS.LOCATION_PUBLISH, validLocation());

    worker.disconnect();
    const replacement = await connectClient(port, makeToken(WORKER_ID, 'worker'));
    t.after(() => replacement.disconnect());
    const withoutJoin = await emitAck(replacement, EVENTS.LOCATION_PUBLISH, validLocation(23.811, 90.413));
    assert.equal(withoutJoin.error.code, ERROR_CODES.FORBIDDEN);
    await joinLocation(replacement);
    const withoutStart = await emitAck(replacement, EVENTS.LOCATION_PUBLISH, validLocation(23.811, 90.413));
    assert.equal(withoutStart.error.code, ERROR_CODES.FORBIDDEN);
    assert.equal((await emitAck(replacement, EVENTS.LOCATION_START, { bookingId: BOOKING_ID })).ok, true);
});

test('location: private lifecycle endpoint requires the shared secret and clears state', async (t) => {
    const previous = process.env.REALTIME_INTERNAL_SECRET;
    process.env.REALTIME_INTERNAL_SECRET = INTERNAL_SECRET;
    t.after(() => {
        if (previous === undefined) delete process.env.REALTIME_INTERNAL_SECRET;
        else process.env.REALTIME_INTERNAL_SECRET = previous;
    });

    const { service, port } = await startService();
    t.after(() => service.stop());
    const worker = await connectClient(port, makeToken(WORKER_ID, 'worker'));
    const customer = await connectClient(port, makeToken(CUSTOMER_ID, 'customer'));
    t.after(() => closeClients(worker, customer));
    await joinLocation(worker);
    await joinLocation(customer);
    await emitAck(worker, EVENTS.LOCATION_START, { bookingId: BOOKING_ID });
    await emitAck(worker, EVENTS.LOCATION_PUBLISH, validLocation());

    const unauthorized = await fetch(`http://127.0.0.1:${port}/internal/location/clear`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-servigo-internal-secret': 'wrong-secret' },
        body: JSON.stringify({ bookingId: BOOKING_ID })
    });
    assert.equal(unauthorized.status, 401);

    const stopped = nextEvent(customer, EVENTS.LOCATION_STOP);
    const cleared = await fetch(`http://127.0.0.1:${port}/internal/location/clear`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-servigo-internal-secret': INTERNAL_SECRET },
        body: JSON.stringify({ bookingId: BOOKING_ID, reason: 'booking_completed' })
    });
    assert.equal(cleared.status, 200);
    assert.equal((await cleared.json()).cleared, true);
    assert.equal((await stopped).reason, 'booking_completed');
});
