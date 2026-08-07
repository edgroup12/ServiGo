'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { notifyLocationLifecycle } = require('../services/realtime-lifecycle');

test('realtime lifecycle notifier skips delivery when not configured', async () => {
    const originalUrl = process.env.REALTIME_INTERNAL_URL;
    const originalSecret = process.env.REALTIME_INTERNAL_SECRET;
    delete process.env.REALTIME_INTERNAL_URL;
    delete process.env.REALTIME_INTERNAL_SECRET;

    try {
        assert.equal(await notifyLocationLifecycle('booking-1', 'booking_completed'), false);
    } finally {
        if (originalUrl === undefined) delete process.env.REALTIME_INTERNAL_URL;
        else process.env.REALTIME_INTERNAL_URL = originalUrl;
        if (originalSecret === undefined) delete process.env.REALTIME_INTERNAL_SECRET;
        else process.env.REALTIME_INTERNAL_SECRET = originalSecret;
    }
});

test('realtime lifecycle notifier posts the booking and reason with the shared secret', async () => {
    const originalFetch = global.fetch;
    const originalUrl = process.env.REALTIME_INTERNAL_URL;
    const originalSecret = process.env.REALTIME_INTERNAL_SECRET;
    let request;
    process.env.REALTIME_INTERNAL_URL = 'http://realtime.example/';
    process.env.REALTIME_INTERNAL_SECRET = 'test-internal-secret';
    global.fetch = async (url, options) => {
        request = { url, options };
        return { ok: true, status: 200 };
    };

    try {
        assert.equal(await notifyLocationLifecycle('booking-1', 'booking_cancelled'), true);
        assert.equal(request.url, 'http://realtime.example/internal/location/clear');
        assert.equal(request.options.method, 'POST');
        assert.equal(request.options.headers['x-servigo-internal-secret'], 'test-internal-secret');
        assert.deepEqual(JSON.parse(request.options.body), {
            bookingId: 'booking-1',
            reason: 'booking_cancelled'
        });
    } finally {
        global.fetch = originalFetch;
        if (originalUrl === undefined) delete process.env.REALTIME_INTERNAL_URL;
        else process.env.REALTIME_INTERNAL_URL = originalUrl;
        if (originalSecret === undefined) delete process.env.REALTIME_INTERNAL_SECRET;
        else process.env.REALTIME_INTERNAL_SECRET = originalSecret;
    }
});

test('realtime lifecycle notifier rejects unsuccessful responses', async () => {
    const originalFetch = global.fetch;
    const originalUrl = process.env.REALTIME_INTERNAL_URL;
    const originalSecret = process.env.REALTIME_INTERNAL_SECRET;
    process.env.REALTIME_INTERNAL_URL = 'http://realtime.example';
    process.env.REALTIME_INTERNAL_SECRET = 'test-internal-secret';
    global.fetch = async () => ({ ok: false, status: 503 });

    try {
        await assert.rejects(
            notifyLocationLifecycle('booking-1', 'booking_completed'),
            /status 503/
        );
    } finally {
        global.fetch = originalFetch;
        if (originalUrl === undefined) delete process.env.REALTIME_INTERNAL_URL;
        else process.env.REALTIME_INTERNAL_URL = originalUrl;
        if (originalSecret === undefined) delete process.env.REALTIME_INTERNAL_SECRET;
        else process.env.REALTIME_INTERNAL_SECRET = originalSecret;
    }
});
