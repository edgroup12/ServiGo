import { useCallback, useEffect, useRef, useState } from 'react';
import { createRealtimeSocket, readStoredToken } from '../services/socket';

const EVENTS = Object.freeze({
    LOCATION_JOIN: 'v1:location:join',
    LOCATION_START: 'v1:location:start',
    LOCATION_PUBLISH: 'v1:location:publish',
    LOCATION_UPDATE: 'v1:location:update',
    LOCATION_STOP: 'v1:location:stop',
    LOCATION_LEAVE: 'v1:location:leave',
});

const ACK_TIMEOUT_MS = 6_000;
const TERMINAL_LOCATION_ERRORS = new Set([
    'BOOKING_NOT_FOUND',
    'FORBIDDEN',
    'INVALID_BOOKING_STATE',
]);

const isTerminalLocationError = (error) => TERMINAL_LOCATION_ERRORS.has(error?.code);

const getErrorMessage = (error) => {
    if (error?.code === 1) return 'Location permission was denied. Enable location access to share your position.';
    if (error?.code === 2) return 'GPS is unavailable. Check your device location settings.';
    if (error?.code === 3) return 'GPS timed out. Move to an area with a clearer signal and retry.';
    return error?.message || 'Unable to access your location.';
};

const emitAck = (socket, event, payload) => new Promise((resolve, reject) => {
    socket.timeout(ACK_TIMEOUT_MS).emit(event, payload, (timeoutError, response) => {
        if (timeoutError) {
            reject(new Error('Realtime service did not respond.'));
            return;
        }
        if (!response?.ok) {
            const error = new Error(response?.error?.message || 'Realtime request failed.');
            error.code = response?.error?.code;
            reject(error);
            return;
        }
        resolve(response.data);
    });
});

export const useCustomerLocation = (bookingId) => {
    const [state, setState] = useState(() => {
        const available = Boolean(bookingId && readStoredToken());
        return {
            connection: available ? 'connecting' : 'offline',
            position: null,
            lastUpdated: null,
            error: available ? '' : 'Authentication is required for live tracking.',
        };
    });

    useEffect(() => {
        const token = readStoredToken();
        if (!bookingId || !token) return undefined;

        const socket = createRealtimeSocket(token);
        const join = () => {
            emitAck(socket, EVENTS.LOCATION_JOIN, { bookingId })
                .then((data) => {
                    setState((current) => ({
                        ...current,
                        connection: 'connected',
                        position: data?.latestLocation || current.position,
                        lastUpdated: data?.latestLocation?.serverTimestamp || current.lastUpdated,
                        error: '',
                    }));
                })
                .catch((error) => setState((current) => ({ ...current, connection: 'offline', error: error.message })));
        };

        socket.on('connect', join);
        socket.on('connect_error', () => setState((current) => ({ ...current, connection: 'reconnecting' })));
        socket.on('disconnect', () => setState((current) => ({ ...current, connection: 'reconnecting' })));
        socket.on(EVENTS.LOCATION_UPDATE, (location) => {
            if (location?.bookingId !== bookingId) return;
            setState((current) => ({ ...current, position: location, lastUpdated: location.serverTimestamp, error: '' }));
        });
        socket.on(EVENTS.LOCATION_STOP, (event) => {
            if (event?.bookingId !== bookingId) return;
            setState((current) => ({ ...current, position: null, lastUpdated: null }));
        });
        socket.connect();

        const handleOffline = () => setState((current) => ({ ...current, connection: 'offline' }));
        const handleOnline = () => setState((current) => ({ ...current, connection: 'reconnecting' }));
        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            socket.emit(EVENTS.LOCATION_LEAVE, { bookingId });
            socket.disconnect();
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, [bookingId]);

    return state;
};

export const useWorkerLocation = (activeBookings = []) => {
    const [state, setState] = useState({ sharing: false, connection: 'offline', error: '', bookingId: '' });
    const socketRef = useRef(null);
    const watchIdRef = useRef(null);
    const sharingIntentRef = useRef(false);
    const bookingIdRef = useRef('');

    const clearWatch = useCallback(() => {
        if (watchIdRef.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
    }, []);

    const endSharing = useCallback((error = '') => {
        sharingIntentRef.current = false;
        bookingIdRef.current = '';
        clearWatch();
        setState({
            sharing: false,
            connection: socketRef.current?.connected ? 'connected' : 'offline',
            error,
            bookingId: '',
        });
    }, [clearWatch]);

    const publish = useCallback((position) => {
        const socket = socketRef.current;
        const bookingId = bookingIdRef.current;
        if (!socket?.connected || !sharingIntentRef.current || !bookingId) return;
        emitAck(socket, EVENTS.LOCATION_PUBLISH, {
            bookingId,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            clientTimestamp: new Date().toISOString(),
        }).catch((error) => {
            if (error.code === 'RATE_LIMITED') return;
            if (isTerminalLocationError(error)) {
                endSharing(error.message || 'Location sharing is no longer allowed.');
                return;
            }
            setState((current) => ({ ...current, error: error.message || 'Location update rejected.' }));
        });
    }, [endSharing]);

    const startWatch = useCallback(() => {
        clearWatch();
        if (!navigator.geolocation) {
            setState((current) => ({ ...current, error: 'GPS is unavailable on this device.' }));
            return;
        }
        watchIdRef.current = navigator.geolocation.watchPosition(publish, (error) => {
            setState((current) => ({ ...current, error: getErrorMessage(error) }));
        }, { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 });
    }, [clearWatch, publish]);

    const startSharing = useCallback(async (bookingId) => {
        const socket = socketRef.current;
        if (!socket?.connected) {
            setState((current) => ({ ...current, error: 'Realtime service is reconnecting.' }));
            return;
        }
        try {
            await emitAck(socket, EVENTS.LOCATION_START, { bookingId });
            bookingIdRef.current = bookingId;
            sharingIntentRef.current = true;
            setState({ sharing: true, connection: 'connected', error: '', bookingId });
            startWatch();
        } catch (error) {
            setState((current) => ({ ...current, error: error.message }));
        }
    }, [startWatch]);

    const stopSharing = useCallback(() => {
        const bookingId = bookingIdRef.current;
        if (socketRef.current?.connected && bookingId) socketRef.current.emit(EVENTS.LOCATION_STOP, { bookingId });
        endSharing();
    }, [endSharing]);

    useEffect(() => {
        const token = readStoredToken();
        if (!token) return undefined;
        const socket = createRealtimeSocket(token);
        socketRef.current = socket;
        socket.on('connect', async () => {
            setState((current) => ({ ...current, connection: 'connected' }));
            if (sharingIntentRef.current && bookingIdRef.current) {
                try {
                    await emitAck(socket, EVENTS.LOCATION_JOIN, { bookingId: bookingIdRef.current });
                    await emitAck(socket, EVENTS.LOCATION_START, { bookingId: bookingIdRef.current });
                    setState((current) => ({ ...current, sharing: true, connection: 'connected', error: '' }));
                    startWatch();
                } catch (error) {
                    clearWatch();
                    if (isTerminalLocationError(error)) {
                        endSharing(error.message || 'Location sharing is no longer allowed.');
                        return;
                    }
                    setState((current) => ({ ...current, sharing: false, connection: 'connected', error: error.message }));
                }
            }
        });
        socket.on('connect_error', () => setState((current) => ({ ...current, connection: 'reconnecting' })));
        socket.on('disconnect', () => {
            clearWatch();
            setState((current) => ({ ...current, connection: 'reconnecting' }));
        });
        socket.on(EVENTS.LOCATION_STOP, (event) => {
            if (event?.bookingId === bookingIdRef.current) endSharing();
        });
        socket.connect();

        const handleOffline = () => {
            clearWatch();
            setState((current) => ({ ...current, connection: 'offline' }));
        };
        const handleOnline = () => setState((current) => ({ ...current, connection: 'reconnecting' }));
        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            clearWatch();
            if (bookingIdRef.current) socket.emit(EVENTS.LOCATION_STOP, { bookingId: bookingIdRef.current });
            socket.disconnect();
            socketRef.current = null;
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, [clearWatch, endSharing, startWatch]);

    const eligibleBookings = activeBookings.filter((booking) => booking.status === 'confirmed');
    const selectedBooking = eligibleBookings.find((booking) => booking._id === state.bookingId) || eligibleBookings[0];

    useEffect(() => {
        if (state.sharing && !eligibleBookings.some((booking) => booking._id === state.bookingId)) {
            stopSharing();
        }
    }, [eligibleBookings, state.bookingId, state.sharing, stopSharing]);

    return { ...state, eligibleBookings, selectedBooking, startSharing, stopSharing };
};

export { EVENTS, getErrorMessage, isTerminalLocationError };
