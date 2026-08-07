import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

let vite;
let AsyncState;
let chatState;

before(async () => {
    vite = await createServer({
        configFile: './vite.config.js',
        server: { middlewareMode: true },
        appType: 'custom',
        logLevel: 'error'
    });
    AsyncState = await vite.ssrLoadModule('/src/components/AsyncState.jsx');
    chatState = await vite.ssrLoadModule('/src/hooks/chat-state.js');
});

after(async () => {
    await vite?.close();
});

describe('AsyncState components', () => {
    it('renders an accessible loading state with a custom message', () => {
        const html = renderToStaticMarkup(
            React.createElement(AsyncState.LoadingState, {
                message: 'Loading professionals',
                compact: true
            })
        );

        assert.match(html, /role="status"/);
        assert.match(html, /aria-live="polite"/);
        assert.match(html, /Loading professionals/);
    });

    it('renders an alert and retry control for recoverable errors', () => {
        const html = renderToStaticMarkup(
            React.createElement(AsyncState.ErrorState, {
                title: 'Unable to load',
                message: 'Check the connection.',
                onRetry: () => { }
            })
        );

        assert.match(html, /role="alert"/);
        assert.match(html, /Unable to load/);
        assert.match(html, /Check the connection\./);
        assert.match(html, /Try again/);
    });

    it('omits the retry control when an error is not retryable', () => {
        const html = renderToStaticMarkup(
            React.createElement(AsyncState.ErrorState, { message: 'Permanent failure' })
        );

        assert.doesNotMatch(html, /Try again/);
    });

    it('renders an empty-state action only when both label and handler exist', () => {
        const actionableHtml = renderToStaticMarkup(
            React.createElement(AsyncState.EmptyState, {
                title: 'No bookings',
                actionLabel: 'Explore services',
                onAction: () => { }
            })
        );
        const passiveHtml = renderToStaticMarkup(
            React.createElement(AsyncState.EmptyState, {
                title: 'No bookings',
                actionLabel: 'Explore services'
            })
        );

        assert.match(actionableHtml, /Explore services/);
        assert.doesNotMatch(passiveHtml, /Explore services/);
    });
});

describe('chat state transitions', () => {
    const message = (id, timestamp, extras = {}) => ({
        _id: id,
        bookingId: 'booking-1',
        senderId: 'customer-1',
        content: id,
        timestamp,
        ...extras
    });

    it('merges HTTP and realtime records once in chronological order', () => {
        const later = message('message-2', '2026-08-07T10:02:00.000Z');
        const earlier = message('message-1', '2026-08-07T10:01:00.000Z');
        const result = chatState.mergeChatMessages([later], [earlier, later]);

        assert.deepEqual(result.map((entry) => entry._id), ['message-1', 'message-2']);
    });

    it('replaces an optimistic record with its canonical persisted record', () => {
        const optimistic = message('message-1', '2026-08-07T10:01:00.000Z', {
            _clientId: 'client-1',
            status: 'sent',
            content: 'optimistic'
        });
        const canonical = message('message-1', '2026-08-07T10:01:01.000Z', {
            content: 'canonical'
        });

        assert.deepEqual(
            chatState.mergeChatMessages([optimistic], [canonical]),
            [canonical]
        );
    });

    it('marks only the recipient-acknowledged message as delivered', () => {
        const first = message('message-1', '2026-08-07T10:01:00.000Z', { status: 'sent' });
        const second = message('message-2', '2026-08-07T10:02:00.000Z', { status: 'sent' });
        const result = chatState.markChatMessageDelivered([first, second], 'message-1');

        assert.equal(result[0].status, 'delivered');
        assert.equal(result[1].status, 'sent');
    });
});
