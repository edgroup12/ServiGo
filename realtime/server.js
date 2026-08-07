'use strict';

require('dotenv').config();

const http = require('http');
const crypto = require('node:crypto');
const express = require('express');
const helmet = require('helmet');
const { Server } = require('socket.io');
const { loadConfig } = require('./config');
const { connectDatabase, databaseIsReady, disconnectDatabase } = require('./database');
const { createSocketAuthenticator } = require('./authenticate');
const {
    CONTRACT_VERSION,
    EVENTS,
    ERROR_CODES,
    LIMITS,
    roomNames,
    acknowledgement
} = require('./contracts');
const { authorizeBookingRoom } = require('./authorize-booking');
const { createLocationStore } = require('./location-store');
const { Message } = require('./models');
const logger = require('./logger');

const createRealtimeServer = ({
    config = loadConfig(),
    connect = connectDatabase,
    disconnect = disconnectDatabase,
    isReady = databaseIsReady,
    /**
     * Optionally inject a BlacklistedToken model stub (useful for tests).
     * When undefined the default model from models.js is used.
     * @type {{ exists: (query: object) => Promise<boolean> } | undefined}
     */
    tokenModel = undefined,
    /**
     * Optionally inject a Booking model stub (useful for tests).
     * When undefined the default model from models.js is used via authorizeBookingRoom.
     * @type {object | undefined}
     */
    bookingModel = undefined,
    /** Realtime reads persisted messages but never creates them. */
    messageModel = Message,
    locationStore: injectedLocationStore = undefined
} = {}) => {
    const app = express();
    app.disable('x-powered-by');
    app.use(helmet());

    let acceptingConnections = true;
    const locationStore = injectedLocationStore || createLocationStore({ io: null });
    const internalSecret = String(process.env.REALTIME_INTERNAL_SECRET || '').trim();

    app.post('/internal/location/clear', express.json({ limit: '2kb' }), (req, res) => {
        const providedSecret = String(req.get('x-servigo-internal-secret') || '');
        if (!internalSecret || providedSecret.length !== internalSecret.length
            || !crypto.timingSafeEqual(Buffer.from(providedSecret), Buffer.from(internalSecret))) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const bookingId = req.body?.bookingId;
        if (typeof bookingId !== 'string' || !bookingId || bookingId.length > LIMITS.MAX_BOOKING_ID_LENGTH) {
            return res.status(400).json({ message: 'A valid booking ID is required' });
        }
        const cleared = locationStore.clear(bookingId, req.body?.reason || 'booking_transition');
        return res.status(200).json({ cleared });
    });

    app.get('/health', (_req, res) => {
        res.status(200).json({
            status: 'ok',
            service: 'servigo-realtime',
            version: CONTRACT_VERSION
        });
    });

    app.get('/ready', (_req, res) => {
        const ready = acceptingConnections && isReady();
        res.status(ready ? 200 : 503).json({
            status: ready ? 'ready' : 'not_ready',
            database: isReady() ? 'connected' : 'disconnected'
        });
    });

    app.use((_req, res) => {
        res.status(404).json({ message: 'Route not found' });
    });

    const httpServer = http.createServer(app);
    const allowedOrigins = new Set(config.allowedOrigins);
    const io = new Server(httpServer, {
        cors: {
            origin(origin, callback) {
                // Allow requests with no Origin header (e.g. Node.js test clients,
                // server-to-server calls, or non-browser WebSocket clients).
                if (!origin) return callback(null, true);
                if (allowedOrigins.has(origin)) return callback(null, true);
                return callback(new Error('Origin not allowed'));
            },
            methods: ['GET', 'POST'],
            credentials: false
        },
        maxHttpBufferSize: LIMITS.MAX_HTTP_BUFFER_BYTES,
        serveClient: false,
        transports: ['websocket', 'polling']
    });

    locationStore.bind(io);

    io.use(createSocketAuthenticator({
        jwtSecret: config.jwtSecret,
        ...(tokenModel ? { tokenModel } : {})
    }));

    io.on('connection', (socket) => {
        socket.join(roomNames.user(socket.data.user.id));
        socket.emit(EVENTS.SESSION_READY, {
            version: CONTRACT_VERSION,
            serverTimestamp: new Date().toISOString()
        });

        logger.info('socket.connected', {
            socketId: socket.id,
            userId: socket.data.user.id,
            role: socket.data.user.role
        });

        const safelyAcknowledge = (callback, response) => {
            if (typeof callback === 'function') callback(response);
        };

        const handleRoomJoin = (scope) => async (payload, callback) => {
            try {
                const result = await authorizeBookingRoom({
                    bookingId: payload?.bookingId,
                    user: socket.data.user,
                    scope,
                    ...(bookingModel ? { bookingModel } : {})
                });

                if (!result.ok) {
                    return safelyAcknowledge(
                        callback,
                        acknowledgement.error(result.code, result.message)
                    );
                }

                const room = scope === 'chat'
                    ? roomNames.chat(result.booking.id)
                    : roomNames.location(result.booking.id);
                await socket.join(room);

                return safelyAcknowledge(callback, acknowledgement.success({
                    bookingId: result.booking.id,
                    bookingStatus: result.booking.status,
                    roomScope: scope,
                    canPublish: scope === 'location'
                        ? socket.data.user.id === result.booking.workerId
                        : result.booking.status === 'confirmed'
                }));
            } catch (error) {
                logger.error('room.join_failed', {
                    socketId: socket.id,
                    userId: socket.data.user.id,
                    scope,
                    error: error.message
                });
                return safelyAcknowledge(
                    callback,
                    acknowledgement.error(ERROR_CODES.INTERNAL_ERROR, 'Unable to join room')
                );
            }
        };

        const handleRoomLeave = (scope) => async (payload, callback) => {
            const bookingId = payload?.bookingId;
            if (typeof bookingId !== 'string') {
                return safelyAcknowledge(
                    callback,
                    acknowledgement.error(ERROR_CODES.INVALID_PAYLOAD, 'A valid booking ID is required')
                );
            }

            const room = scope === 'chat'
                ? roomNames.chat(bookingId)
                : roomNames.location(bookingId);
            await socket.leave(room);
            return safelyAcknowledge(callback, acknowledgement.success({ bookingId, roomScope: scope }));
        };

        socket.on(EVENTS.CHAT_JOIN, handleRoomJoin('chat'));
        socket.on(EVENTS.CHAT_LEAVE, handleRoomLeave('chat'));
        socket.on(EVENTS.LOCATION_JOIN, async (payload, callback) => {
            const result = await authorizeBookingRoom({
                bookingId: payload?.bookingId,
                user: socket.data.user,
                scope: 'location',
                ...(bookingModel ? { bookingModel } : {})
            });
            if (!result.ok) {
                return safelyAcknowledge(callback, acknowledgement.error(result.code, result.message));
            }
            await socket.join(roomNames.location(result.booking.id));
            return safelyAcknowledge(callback, acknowledgement.success({
                bookingId: result.booking.id,
                bookingStatus: result.booking.status,
                roomScope: 'location',
                canPublish: socket.data.user.id === result.booking.workerId,
                latestLocation: locationStore.getLatest(result.booking.id)
            }));
        });
        socket.on(EVENTS.LOCATION_LEAVE, handleRoomLeave('location'));

        const validateLocationPayload = (payload) => {
            const { bookingId, latitude, longitude, accuracy, clientTimestamp } = payload ?? {};
            if (
                typeof bookingId !== 'string' || !bookingId
                || bookingId.length > LIMITS.MAX_BOOKING_ID_LENGTH
                || !Number.isFinite(latitude) || latitude < -90 || latitude > 90
                || !Number.isFinite(longitude) || longitude < -180 || longitude > 180
                || (accuracy !== undefined && (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > LIMITS.LOCATION_MAX_ACCURACY_METERS))
            ) return null;
            if (clientTimestamp !== undefined && (typeof clientTimestamp !== 'string' || Number.isNaN(Date.parse(clientTimestamp)))) return null;
            return { bookingId, latitude, longitude, ...(accuracy === undefined ? {} : { accuracy }), clientTimestamp };
        };

        socket.on(EVENTS.LOCATION_START, async (payload, callback) => {
            const result = await authorizeBookingRoom({ bookingId: payload?.bookingId, user: socket.data.user, scope: 'location', ...(bookingModel ? { bookingModel } : {}) });
            if (!result.ok) return safelyAcknowledge(callback, acknowledgement.error(result.code, result.message));
            if (socket.data.user.id !== result.booking.workerId) return safelyAcknowledge(callback, acknowledgement.error(ERROR_CODES.FORBIDDEN, 'Only the assigned worker can share location'));
            locationStore.start({ bookingId: result.booking.id, workerId: socket.data.user.id, socketId: socket.id });
            return safelyAcknowledge(callback, acknowledgement.success({ bookingId: result.booking.id, sharing: true }));
        });

        socket.on(EVENTS.LOCATION_PUBLISH, async (payload, callback) => {
            const location = validateLocationPayload(payload);
            if (!location) return safelyAcknowledge(callback, acknowledgement.error(ERROR_CODES.INVALID_PAYLOAD, 'Valid coordinates are required'));
            const result = await authorizeBookingRoom({ bookingId: location.bookingId, user: socket.data.user, scope: 'location', ...(bookingModel ? { bookingModel } : {}) });
            if (!result.ok) {
                locationStore.clear(location.bookingId, 'booking_inactive');
                return safelyAcknowledge(callback, acknowledgement.error(result.code, result.message));
            }
            if (socket.data.user.id !== result.booking.workerId) return safelyAcknowledge(callback, acknowledgement.error(ERROR_CODES.FORBIDDEN, 'Only the assigned worker can publish location'));
            const session = locationStore.getSession(location.bookingId);
            if (!session || session.socketId !== socket.id) return safelyAcknowledge(callback, acknowledgement.error(ERROR_CODES.FORBIDDEN, 'Start sharing before publishing location'));
            const nowMs = Date.now();
            if (session.lastPublishedAt && nowMs - session.lastPublishedAt < LIMITS.LOCATION_MIN_INTERVAL_MS) return safelyAcknowledge(callback, acknowledgement.error(ERROR_CODES.RATE_LIMITED, 'Location updates are too frequent'));
            const canonical = locationStore.publish({ bookingId: location.bookingId, socketId: socket.id, location: { latitude: location.latitude, longitude: location.longitude, ...(location.accuracy === undefined ? {} : { accuracy: location.accuracy }) }, publishedAt: nowMs });
            socket.to(roomNames.location(location.bookingId)).emit(EVENTS.LOCATION_UPDATE, canonical);
            return safelyAcknowledge(callback, acknowledgement.success({ location: canonical }));
        });

        socket.on(EVENTS.LOCATION_STOP, async (payload, callback) => {
            const bookingId = payload?.bookingId;
            if (typeof bookingId !== 'string' || !bookingId) return safelyAcknowledge(callback, acknowledgement.error(ERROR_CODES.INVALID_PAYLOAD, 'A valid booking ID is required'));
            const session = locationStore.getSession(bookingId);
            if (session && session.socketId !== socket.id) return safelyAcknowledge(callback, acknowledgement.error(ERROR_CODES.FORBIDDEN, 'Only the active sharing worker can stop sharing'));
            locationStore.clear(bookingId, 'stopped');
            return safelyAcknowledge(callback, acknowledgement.success({ bookingId, sharing: false }));
        });

        // ── v1:chat:publish ──────────────────────────────────────────────────
        //
        // HTTP persistence is authoritative. This event only republishes the
        // canonical record returned by Mongo after the HTTP POST succeeds.
        socket.on(EVENTS.CHAT_PUBLISH, async (payload, callback) => {
            try {
                const { messageId, bookingId, clientTimestamp } = payload ?? {};

                // — Payload validation —
                if (
                    typeof messageId !== 'string' ||
                    messageId.length === 0 ||
                    messageId.length > LIMITS.MAX_MESSAGE_ID_LENGTH
                ) {
                    return safelyAcknowledge(
                        callback,
                        acknowledgement.error(ERROR_CODES.INVALID_PAYLOAD, 'A valid message ID is required')
                    );
                }

                if (
                    typeof bookingId !== 'string' ||
                    bookingId.length === 0 ||
                    bookingId.length > LIMITS.MAX_BOOKING_ID_LENGTH
                ) {
                    return safelyAcknowledge(
                        callback,
                        acknowledgement.error(ERROR_CODES.INVALID_PAYLOAD, 'A valid booking ID is required')
                    );
                }

                // — Clock skew check (guard against replayed events) —
                if (typeof clientTimestamp === 'string') {
                    const clientTime = Date.parse(clientTimestamp);
                    if (Number.isNaN(clientTime)) {
                        return safelyAcknowledge(
                            callback,
                            acknowledgement.error(ERROR_CODES.INVALID_PAYLOAD, 'clientTimestamp must be a valid ISO string')
                        );
                    }
                    const skewMs = Math.abs(Date.now() - clientTime);
                    if (skewMs > LIMITS.MAX_CLOCK_SKEW_MS) {
                        return safelyAcknowledge(
                            callback,
                            acknowledgement.error(ERROR_CODES.STALE_EVENT, 'Event timestamp is outside the allowed clock skew window')
                        );
                    }
                }

                // — Room membership check —
                const chatRoom = roomNames.chat(bookingId);
                const roomSockets = await io.in(chatRoom).allSockets();
                if (!roomSockets.has(socket.id)) {
                    return safelyAcknowledge(
                        callback,
                        acknowledgement.error(ERROR_CODES.FORBIDDEN, 'You must join the chat room before publishing')
                    );
                }

                const persistedMessage = await messageModel
                    .findOne({
                        _id: messageId,
                        bookingId,
                        senderId: socket.data.user.id
                    })
                    .lean();

                if (!persistedMessage) {
                    return safelyAcknowledge(
                        callback,
                        acknowledgement.error(ERROR_CODES.MESSAGE_NOT_FOUND, 'Persisted message not found')
                    );
                }

                // — Broadcast the canonical persisted record to other members —
                const canonicalMessage = {
                    _id: String(persistedMessage._id),
                    bookingId: String(persistedMessage.bookingId),
                    senderId: String(persistedMessage.senderId),
                    content: persistedMessage.content,
                    timestamp: new Date(persistedMessage.timestamp).toISOString()
                };
                socket.to(chatRoom).emit(EVENTS.CHAT_MESSAGE, canonicalMessage);

                logger.info('chat.message_broadcast', {
                    socketId: socket.id,
                    userId: socket.data.user.id,
                    bookingId,
                    messageId
                });

                return safelyAcknowledge(callback, acknowledgement.success({
                    messageId: canonicalMessage._id,
                    deliveryState: 'sent',
                    serverTimestamp: new Date().toISOString()
                }));
            } catch (error) {
                logger.error('chat.publish_failed', {
                    socketId: socket.id,
                    userId: socket.data.user.id,
                    error: error.message
                });
                return safelyAcknowledge(
                    callback,
                    acknowledgement.error(ERROR_CODES.INTERNAL_ERROR, 'Unable to broadcast message')
                );
            }
        });

        socket.on(EVENTS.CHAT_RECEIVED, async (payload, callback) => {
            try {
                const { bookingId, messageId } = payload ?? {};
                if (
                    typeof bookingId !== 'string' ||
                    typeof messageId !== 'string' ||
                    !bookingId ||
                    !messageId ||
                    bookingId.length > LIMITS.MAX_BOOKING_ID_LENGTH ||
                    messageId.length > LIMITS.MAX_MESSAGE_ID_LENGTH
                ) {
                    return safelyAcknowledge(
                        callback,
                        acknowledgement.error(ERROR_CODES.INVALID_PAYLOAD, 'Booking ID and message ID are required')
                    );
                }

                const chatRoom = roomNames.chat(bookingId);
                const roomSockets = await io.in(chatRoom).allSockets();
                if (!roomSockets.has(socket.id)) {
                    return safelyAcknowledge(
                        callback,
                        acknowledgement.error(ERROR_CODES.FORBIDDEN, 'You must join the chat room first')
                    );
                }

                const persistedMessage = await messageModel
                    .findOne({ _id: messageId, bookingId })
                    .lean();
                if (!persistedMessage) {
                    return safelyAcknowledge(
                        callback,
                        acknowledgement.error(ERROR_CODES.MESSAGE_NOT_FOUND, 'Persisted message not found')
                    );
                }
                if (String(persistedMessage.senderId) === socket.data.user.id) {
                    return safelyAcknowledge(
                        callback,
                        acknowledgement.error(ERROR_CODES.FORBIDDEN, 'Senders cannot acknowledge their own message')
                    );
                }

                io.to(roomNames.user(String(persistedMessage.senderId))).emit(EVENTS.CHAT_DELIVERED, {
                    bookingId,
                    messageId: String(persistedMessage._id),
                    deliveredBy: socket.data.user.id,
                    serverTimestamp: new Date().toISOString()
                });
                return safelyAcknowledge(callback, acknowledgement.success({
                    messageId: String(persistedMessage._id),
                    deliveryState: 'delivered'
                }));
            } catch (error) {
                logger.error('chat.received_failed', {
                    socketId: socket.id,
                    userId: socket.data.user.id,
                    error: error.message
                });
                return safelyAcknowledge(
                    callback,
                    acknowledgement.error(ERROR_CODES.INTERNAL_ERROR, 'Unable to record delivery')
                );
            }
        });

        socket.on('disconnect', (reason) => {
            locationStore.clearForSocket(socket.id, 'disconnected');
            logger.info('socket.disconnected', {
                socketId: socket.id,
                userId: socket.data.user.id,
                reason
            });
        });
    });

    const start = async () => {
        await connect(config.mongodbUri);
        await new Promise((resolve, reject) => {
            const onError = (error) => {
                httpServer.off('listening', onListening);
                reject(error);
            };
            const onListening = () => {
                httpServer.off('error', onError);
                resolve();
            };
            httpServer.once('error', onError);
            httpServer.once('listening', onListening);
            httpServer.listen(config.port);
        });

        logger.info('service.started', { port: config.port, environment: config.nodeEnv });
        return httpServer.address();
    };

    const stop = async () => {
        acceptingConnections = false;
        io.disconnectSockets(true);
        await new Promise((resolve) => io.close(resolve));
        if (httpServer.listening) {
            await new Promise((resolve, reject) => {
                httpServer.close((error) => error ? reject(error) : resolve());
            });
        }
        await disconnect();
        logger.info('service.stopped');
    };

    return { app, httpServer, io, start, stop };
};

const run = async () => {
    const config = loadConfig();
    const service = createRealtimeServer({ config });
    let shuttingDown = false;

    const shutdown = async (signal) => {
        if (shuttingDown) return;
        shuttingDown = true;
        logger.info('service.shutdown_requested', { signal });

        const forceExit = setTimeout(() => {
            logger.error('service.shutdown_timeout', { signal });
            process.exit(1);
        }, config.shutdownTimeoutMs);
        forceExit.unref();

        try {
            await service.stop();
            clearTimeout(forceExit);
            process.exit(0);
        } catch (error) {
            logger.error('service.shutdown_failed', { error: error.message });
            process.exit(1);
        }
    };

    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.once('SIGINT', () => shutdown('SIGINT'));

    await service.start();
};

if (require.main === module) {
    run().catch((error) => {
        logger.error('service.start_failed', { error: error.message });
        process.exit(1);
    });
}

module.exports = { createRealtimeServer, run };
