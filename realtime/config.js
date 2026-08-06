'use strict';

const REQUIRED_ENVIRONMENT_VARIABLES = Object.freeze([
    'MONGODB_URI',
    'JWT_SECRET',
    'ALLOWED_ORIGINS'
]);

const parseOrigins = (value) => String(value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const loadConfig = (env = process.env) => {
    const missing = REQUIRED_ENVIRONMENT_VARIABLES.filter(
        (name) => !String(env[name] || '').trim()
    );

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    const port = Number.parseInt(env.PORT || '5002', 10);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('PORT must be an integer between 1 and 65535');
    }

    const allowedOrigins = parseOrigins(env.ALLOWED_ORIGINS);
    if (allowedOrigins.length === 0) {
        throw new Error('ALLOWED_ORIGINS must contain at least one exact origin');
    }

    if (allowedOrigins.includes('*')) {
        throw new Error('ALLOWED_ORIGINS cannot contain a wildcard');
    }

    return Object.freeze({
        nodeEnv: env.NODE_ENV || 'development',
        port,
        mongodbUri: env.MONGODB_URI,
        jwtSecret: env.JWT_SECRET,
        allowedOrigins,
        logLevel: env.LOG_LEVEL || 'info',
        shutdownTimeoutMs: Number.parseInt(env.SHUTDOWN_TIMEOUT_MS || '10000', 10)
    });
};

module.exports = { REQUIRED_ENVIRONMENT_VARIABLES, parseOrigins, loadConfig };
