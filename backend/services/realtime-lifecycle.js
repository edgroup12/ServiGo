'use strict';

const notifyLocationLifecycle = async (bookingId, reason) => {
    const baseUrl = String(process.env.REALTIME_INTERNAL_URL || '').trim().replace(/\/$/, '');
    const secret = String(process.env.REALTIME_INTERNAL_SECRET || '').trim();
    if (!baseUrl || !secret) return false;

    const response = await fetch(`${baseUrl}/internal/location/clear`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-servigo-internal-secret': secret,
        },
        body: JSON.stringify({ bookingId: String(bookingId), reason }),
        signal: AbortSignal.timeout(3_000),
    });

    if (!response.ok) {
        throw new Error(`Realtime lifecycle notification failed with status ${response.status}`);
    }
    return true;
};

module.exports = { notifyLocationLifecycle };
