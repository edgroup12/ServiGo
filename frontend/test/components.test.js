import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

let vite;
let AsyncState;

before(async () => {
    vite = await createServer({
        configFile: './vite.config.js',
        server: { middlewareMode: true },
        appType: 'custom',
        logLevel: 'error'
    });
    AsyncState = await vite.ssrLoadModule('/src/components/AsyncState.jsx');
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
