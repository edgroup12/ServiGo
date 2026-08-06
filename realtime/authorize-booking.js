'use strict';

const mongoose = require('mongoose');
const { Booking } = require('./models');
const { ERROR_CODES } = require('./contracts');

const CHAT_READABLE_STATUSES = Object.freeze([
    'confirmed',
    'completed',
    'declined'
]);

const isParticipant = (booking, userId) => (
    String(booking.customer) === String(userId)
    || String(booking.worker) === String(userId)
);

const authorizeBookingRoom = async ({
    bookingId,
    user,
    scope,
    bookingModel = Booking
}) => {
    if (
        typeof bookingId !== 'string'
        || !mongoose.isObjectIdOrHexString(bookingId)
    ) {
        return {
            ok: false,
            code: ERROR_CODES.INVALID_PAYLOAD,
            message: 'A valid booking ID is required'
        };
    }

    const booking = await bookingModel
        .findById(bookingId)
        .select('customer worker status')
        .lean();

    if (!booking) {
        return {
            ok: false,
            code: ERROR_CODES.BOOKING_NOT_FOUND,
            message: 'Booking not found'
        };
    }

    if (user.role === 'admin' || !isParticipant(booking, user.id)) {
        return {
            ok: false,
            code: ERROR_CODES.FORBIDDEN,
            message: 'You are not authorized for this booking room'
        };
    }

    const allowed = scope === 'chat'
        ? CHAT_READABLE_STATUSES.includes(booking.status)
        : scope === 'location' && booking.status === 'confirmed';

    if (!allowed) {
        return {
            ok: false,
            code: ERROR_CODES.INVALID_BOOKING_STATE,
            message: 'This booking is not active for the requested room'
        };
    }

    return {
        ok: true,
        booking: {
            id: String(booking._id),
            status: booking.status,
            customerId: String(booking.customer),
            workerId: String(booking.worker)
        }
    };
};

module.exports = {
    CHAT_READABLE_STATUSES,
    isParticipant,
    authorizeBookingRoom
};
