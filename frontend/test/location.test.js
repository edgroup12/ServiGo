import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

let vite;
let getErrorMessage;
let isTerminalLocationError;

before(async () => {
    vite = await createServer({
        configFile: './vite.config.js',
        server: { middlewareMode: true },
        appType: 'custom',
        logLevel: 'error'
    });

    ({
        getErrorMessage,
        isTerminalLocationError
    } = await vite.ssrLoadModule('/src/hooks/useLocationSocket.js'));
});

after(async () => {
    await vite?.close();
});

describe('live location client policy', () => {
    it('maps browser geolocation failures to actionable messages', () => {
        assert.match(getErrorMessage({ code: 1 }), /permission was denied/i);
        assert.match(getErrorMessage({ code: 2 }), /GPS is unavailable/i);
        assert.match(getErrorMessage({ code: 3 }), /timed out/i);
        assert.equal(getErrorMessage({ message: 'Device offline' }), 'Device offline');
    });

    it('classifies booking authorization failures as terminal', () => {
        assert.equal(isTerminalLocationError({ code: 'BOOKING_NOT_FOUND' }), true);
        assert.equal(isTerminalLocationError({ code: 'INVALID_BOOKING_STATE' }), true);
        assert.equal(isTerminalLocationError({ code: 'FORBIDDEN' }), true);
        assert.equal(isTerminalLocationError({ code: 'RATE_LIMITED' }), false);
        assert.equal(isTerminalLocationError(new Error('network failure')), false);
    });
});
