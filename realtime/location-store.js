'use strict';

const { EVENTS, roomNames } = require('./contracts');

const createLocationStore = ({ io, now = () => new Date() }) => {
    const ioRef = { current: io };
    const sessions = new Map();
    const latestLocations = new Map();

    const clear = (bookingId, reason = 'stopped') => {
        const id = String(bookingId);
        const session = sessions.get(id);
        const location = latestLocations.get(id);
        if (!session && !location) return false;

        sessions.delete(id);
        latestLocations.delete(id);
        ioRef.current.to(roomNames.location(id)).emit(EVENTS.LOCATION_STOP, {
            bookingId: id,
            reason,
            serverTimestamp: now().toISOString()
        });
        return true;
    };

    const start = ({ bookingId, workerId, socketId }) => {
        const id = String(bookingId);
        const previous = sessions.get(id);
        if (previous && previous.socketId !== socketId) clear(id, 'replaced');

        sessions.set(id, {
            bookingId: id,
            workerId: String(workerId),
            socketId,
            lastPublishedAt: 0
        });
        latestLocations.delete(id);
        return sessions.get(id);
    };

    const publish = ({ bookingId, socketId, location, publishedAt }) => {
        const id = String(bookingId);
        const session = sessions.get(id);
        if (!session || session.socketId !== socketId) return null;

        session.lastPublishedAt = publishedAt;
        const canonical = {
            bookingId: id,
            workerId: session.workerId,
            ...location,
            serverTimestamp: now().toISOString()
        };
        latestLocations.set(id, canonical);
        return canonical;
    };

    const clearForSocket = (socketId, reason = 'disconnected') => {
        for (const [bookingId, session] of sessions) {
            if (session.socketId === socketId) clear(bookingId, reason);
        }
    };

    return {
        bind: (socketIo) => {
            ioRef.current = socketIo;
        },
        clear,
        clearForSocket,
        getLatest: (bookingId) => latestLocations.get(String(bookingId)) || null,
        getSession: (bookingId) => sessions.get(String(bookingId)) || null,
        publish,
        start
    };
};

module.exports = { createLocationStore };
