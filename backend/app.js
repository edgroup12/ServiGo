require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const apiRoutes = require('./routes/api');
const paymentRoutes = require('./routes/payment');
const uploadRoutes = require('./routes/upload');
const rateLimit = require('express-rate-limit');

const app = express();

// Vercel forwards the original client IP through one trusted proxy hop.
// This also lets express-rate-limit safely identify clients behind Vercel.
app.set('trust proxy', 1);

// Security: helmet middleware with relaxed policies for API
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
}));

const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:4173'];

app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : false)
        : allowedOrigins,
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'servigo-api'
    });
});

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { message: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 50,
    message: { message: 'Too many attempts, please try again in a few minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/auth', authLimiter);
app.use('/api', limiter);
app.use('/api/upload', uploadRoutes);
app.use('/api', apiRoutes);
app.use('/api/payment', paymentRoutes);

// Centralized 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`
    });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.message);

    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }

    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(409).json({ success: false, message: `${field} already exists` });
    }

    if (err.name === 'CastError') {
        return res.status(400).json({ success: false, message: `Invalid ${err.path}: ${err.value}` });
    }

    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Token expired' });
    }

    res.status(err.status || 500).json({
        success: false,
        message: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message || 'Internal server error'
    });
});

module.exports = app;