'use strict';

const SENSITIVE_KEYS = new Set([
    'token',
    'authorization',
    'content',
    'message',
    'lat',
    'latitude',
    'lng',
    'longitude',
    'accuracy'
]);

const sanitize = (value) => {
    if (!value || typeof value !== 'object') {
        return value;
    }

    if (Array.isArray(value)) {
        return value.map(sanitize);
    }

    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
        key,
        SENSITIVE_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : sanitize(entry)
    ]));
};

const write = (level, event, details = {}) => {
    const record = {
        level,
        event,
        timestamp: new Date().toISOString(),
        ...sanitize(details)
    };
    const output = JSON.stringify(record);
    if (level === 'error') {
        console.error(output);
    } else {
        console.log(output);
    }
};

module.exports = {
    info: (event, details) => write('info', event, details),
    error: (event, details) => write('error', event, details),
    sanitize
};
