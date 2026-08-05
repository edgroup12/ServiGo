const { after, before, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ||= 'servigo-test-secret';

const app = require('../app');

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
});
