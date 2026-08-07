const { after, before, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ||= 'servigo-test-secret';

const app = require('../app');
const BlacklistedToken = require('../models/BlacklistedToken');
const Booking = require('../models/Booking');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { createHandler } = require('../../api');

let server;
let baseUrl;

before(async () => {
    server = http.createServer(app);
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });

    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
    if (!server) return;
    await new Promise((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
    });
});

describe('Express application smoke tests', () => {
    it('returns API health status', async () => {
        const response = await fetch(`${baseUrl}/api/health`);
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.deepEqual(body, {
            status: 'ok',
            service: 'servigo-api'
        });
    });

    it('returns a structured JSON 404 for an unknown API route', async () => {
        const response = await fetch(`${baseUrl}/api/quality-check-missing`);
        const body = await response.json();

        assert.equal(response.status, 404);
        assert.equal(response.headers.get('content-type')?.includes('application/json'), true);
        assert.deepEqual(body, {
            success: false,
            message: 'Route not found: GET /api/quality-check-missing'
        });
    });

    it('sets baseline security headers', async () => {
        const response = await fetch(`${baseUrl}/quality-check`);

        assert.equal(response.status, 404);
        assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
        assert.equal(response.headers.get('x-frame-options'), 'SAMEORIGIN');
    });

    it('accepts Vercel-style forwarded client IP headers', async () => {
        const response = await fetch(`${baseUrl}/api/quality-check-missing`, {
            headers: { 'x-forwarded-for': '203.0.113.10' }
        });
        const body = await response.json();

        assert.equal(response.status, 404);
        assert.equal(body.success, false);
        assert.equal(app.get('trust proxy'), 1);
    });

    it('rejects malformed JSON without exposing an HTML error page', async () => {
        const response = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: '{"email":'
        });
        const body = await response.json();

        assert.equal(response.status, 400);
        assert.equal(body.success, false);
        assert.match(body.message, /JSON/i);
    });

    it('does not allow an unconfigured production origin', async () => {
        const response = await fetch(`${baseUrl}/quality-check`, {
            headers: { origin: 'https://untrusted.example' }
        });

        assert.equal(response.headers.get('access-control-allow-origin'), null);
    });

    it('rejects public admin registration before accessing the database', async () => {
        const response = await fetch(`${baseUrl}/api/auth/register`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                name: 'Beta Admin',
                email: 'beta-admin@example.com',
                password: 'Password1',
                role: 'admin'
            })
        });
        const body = await response.json();

        assert.equal(response.status, 400);
        assert.equal(body.message, 'Role must be customer or worker');
    });

    it('validates forgot-password email before accessing the database', async () => {
        const response = await fetch(`${baseUrl}/api/auth/forgot-password`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: 'not-an-email' })
        });
        const body = await response.json();

        assert.equal(response.status, 400);
        assert.match(body.message, /valid email/i);
    });

    it('validates reset-password token and password strength before database access', async () => {
        const invalidTokenResponse = await fetch(`${baseUrl}/api/auth/reset-password`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ token: 'short', password: 'Password1' })
        });
        assert.equal(invalidTokenResponse.status, 400);

        const weakPasswordResponse = await fetch(`${baseUrl}/api/auth/reset-password`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ token: 'a'.repeat(64), password: 'password' })
        });
        const body = await weakPasswordResponse.json();

        assert.equal(weakPasswordResponse.status, 400);
        assert.match(body.message, /letter and number/i);
    });

    it('fails closed for every online payment route', async () => {
        for (const path of ['/api/payment', '/api/payment/init', '/api/payment/success/forged-id']) {
            const response = await fetch(`${baseUrl}${path}`, { method: 'POST' });
            const body = await response.json();

            assert.equal(response.status, 503);
            assert.deepEqual(body, {
                success: false,
                code: 'ONLINE_PAYMENTS_DISABLED',
                message: 'Online payments are temporarily unavailable. Please select Cash.'
            });
        }
    });

    it('rejects non-cash bookings before booking data access', async () => {
        const originalBlacklistLookup = BlacklistedToken.findOne;
        const originalWorkerLookup = User.findOne;
        let workerLookupCalled = false;

        BlacklistedToken.findOne = async () => null;
        User.findOne = async () => {
            workerLookupCalled = true;
            throw new Error('Worker lookup must not run for disabled payment methods');
        };

        try {
            const token = jwt.sign(
                { id: '507f1f77bcf86cd799439011', role: 'customer' },
                process.env.JWT_SECRET
            );
            const response = await fetch(`${baseUrl}/api/bookings`, {
                method: 'POST',
                headers: {
                    authorization: `Bearer ${token}`,
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    worker: '507f1f77bcf86cd799439012',
                    date: new Date(Date.now() + 60_000).toISOString(),
                    address: 'Test address',
                    description: 'Test service request',
                    paymentMethod: 'bKash',
                    transactionId: 'forged-transaction'
                })
            });
            const body = await response.json();

            assert.equal(response.status, 503);
            assert.equal(body.code, 'ONLINE_PAYMENTS_DISABLED');
            assert.equal(workerLookupCalled, false);
        } finally {
            BlacklistedToken.findOne = originalBlacklistLookup;
            User.findOne = originalWorkerLookup;
        }
    });

    it('returns authoritative message history to a booking participant in timestamp order', async () => {
        const customerId = '507f1f77bcf86cd799439021';
        const workerId = '507f1f77bcf86cd799439022';
        const bookingId = '507f1f77bcf86cd799439023';
        const originalBlacklistLookup = BlacklistedToken.findOne;
        const originalBookingLookup = Booking.findById;
        const originalMessageLookup = Message.find;
        let messageQuery;
        let messageSort;

        BlacklistedToken.findOne = async () => null;
        Booking.findById = async () => ({ customer: customerId, worker: workerId });
        Message.find = (query) => {
            messageQuery = query;
            return {
                sort: async (sort) => {
                    messageSort = sort;
                    return [{
                        _id: '507f1f77bcf86cd799439024',
                        bookingId,
                        senderId: workerId,
                        senderModel: 'Worker',
                        content: 'Canonical persisted message',
                        timestamp: '2026-08-07T10:00:00.000Z'
                    }];
                }
            };
        };

        try {
            const token = jwt.sign({ id: customerId, role: 'customer' }, process.env.JWT_SECRET);
            const response = await fetch(`${baseUrl}/api/messages/${bookingId}`, {
                headers: { authorization: `Bearer ${token}` }
            });
            const body = await response.json();

            assert.equal(response.status, 200);
            assert.deepEqual(messageQuery, { bookingId });
            assert.deepEqual(messageSort, { timestamp: 1 });
            assert.equal(body.length, 1);
            assert.equal(body[0].content, 'Canonical persisted message');
        } finally {
            BlacklistedToken.findOne = originalBlacklistLookup;
            Booking.findById = originalBookingLookup;
            Message.find = originalMessageLookup;
        }
    });

    it('persists the authenticated sender and returns the canonical saved message', async () => {
        const customerId = '507f1f77bcf86cd799439031';
        const workerId = '507f1f77bcf86cd799439032';
        const bookingId = '507f1f77bcf86cd799439033';
        const messageId = '507f1f77bcf86cd799439034';
        const originalBlacklistLookup = BlacklistedToken.findOne;
        const originalBookingLookup = Booking.findById;
        const originalMessageSave = Message.prototype.save;
        const originalNotificationSave = Notification.prototype.save;
        let savedMessage;
        let savedNotification;

        BlacklistedToken.findOne = async () => null;
        Booking.findById = async () => ({ _id: bookingId, customer: customerId, worker: workerId });
        Message.prototype.save = async function saveMessage() {
            this._id = messageId;
            savedMessage = this;
            return this;
        };
        Notification.prototype.save = async function saveNotification() {
            savedNotification = this;
            return this;
        };

        try {
            const token = jwt.sign({ id: customerId, role: 'customer' }, process.env.JWT_SECRET);
            const response = await fetch(`${baseUrl}/api/messages`, {
                method: 'POST',
                headers: {
                    authorization: `Bearer ${token}`,
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    bookingId,
                    senderId: workerId,
                    content: '  Persist this first  '
                })
            });
            const body = await response.json();

            assert.equal(response.status, 201);
            assert.equal(savedMessage.bookingId.toString(), bookingId);
            assert.equal(savedMessage.senderId.toString(), customerId);
            assert.equal(savedMessage.senderModel, 'Customer');
            assert.equal(savedMessage.content, 'Persist this first');
            assert.equal(body._id, messageId);
            assert.equal(body.senderId, customerId);
            assert.equal(body.content, 'Persist this first');
            assert.equal(savedNotification.recipientId.toString(), workerId);
            assert.equal(savedNotification.type, 'new_message');
        } finally {
            BlacklistedToken.findOne = originalBlacklistLookup;
            Booking.findById = originalBookingLookup;
            Message.prototype.save = originalMessageSave;
            Notification.prototype.save = originalNotificationSave;
        }
    });

    it('does not invoke Express when serverless database readiness fails', async () => {
        let applicationCalled = false;
        const handler = createHandler({
            application: () => {
                applicationCalled = true;
            },
            connect: async () => {
                throw new Error('database unavailable');
            },
            logger: { error() { } }
        });
        const response = {
            statusCode: null,
            body: null,
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(body) {
                this.body = body;
                return this;
            }
        };

        await handler({}, response);

        assert.equal(applicationCalled, false);
        assert.equal(response.statusCode, 503);
        assert.deepEqual(response.body, {
            success: false,
            code: 'DATABASE_UNAVAILABLE',
            message: 'Database service is temporarily unavailable'
        });
    });
});
