'use strict';

require('dotenv').config();

const http = require('http');
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
const logger = require('./logger');

const createRealtimeServer = ({
    config = loadConfig(),
    connect = connectDatabase,
    disconnect = disconnectDatabase,
    isReady = databaseIsReady
} = {}) => {
    const app = express();
    app.disable('x-powered-by');
    app.use(helmet());

    let acceptingConnections = true;

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
                if (origin && allowedOrigins.has(origin)) {
                    return callback(null, true);
                }
                return callback(new Error('Origin not allowed'));
            },
            methods: ['GET', 'POST'],
            credentials: false
        },
        maxHttpBufferSize: LIMITS.MAX_HTTP_BUFFER_BYTES,
        serveClient: false,
        transports: ['websocket', 'polling']
    });

    io.use(createSocketAuthenticator({ jwtSecret: config.jwtSecret }));

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
                    scope
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
        socket.on(EVENTS.LOCATION_JOIN, handleRoomJoin('location'));
        socket.on(EVENTS.LOCATION_LEAVE, handleRoomLeave('location'));

        socket.on('disconnect', (reason) => {
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
