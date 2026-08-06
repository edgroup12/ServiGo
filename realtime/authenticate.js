'use strict';

const jwt = require('jsonwebtoken');
const { BlacklistedToken } = require('./models');
const { ERROR_CODES } = require('./contracts');

class SocketAuthenticationError extends Error {
    constructor(code, message) {
        super(message);
        this.name = 'SocketAuthenticationError';
        this.data = { code };
    }
}

const readHandshakeToken = (socket) => {
    const token = socket.handshake?.auth?.token;
    return typeof token === 'string' ? token.trim() : '';
};

const createSocketAuthenticator = ({ jwtSecret, tokenModel = BlacklistedToken }) => (
    async (socket, next) => {
        try {
            const token = readHandshakeToken(socket);
            if (!token) {
                return next(new SocketAuthenticationError(
                    ERROR_CODES.UNAUTHENTICATED,
                    'Authentication token is required'
                ));
            }

            const revoked = await tokenModel.exists({ token });
            if (revoked) {
                return next(new SocketAuthenticationError(
                    ERROR_CODES.TOKEN_REVOKED,
                    'Authentication token has been revoked'
                ));
            }

            const verified = jwt.verify(token, jwtSecret);
            if (!verified.id || !verified.role) {
                return next(new SocketAuthenticationError(
                    ERROR_CODES.UNAUTHENTICATED,
                    'Authentication token has an invalid identity'
                ));
            }

            socket.data.user = Object.freeze({
                id: String(verified.id),
                role: String(verified.role)
            });
            return next();
        } catch (error) {
            if (error instanceof SocketAuthenticationError) {
                return next(error);
            }
            return next(new SocketAuthenticationError(
                ERROR_CODES.UNAUTHENTICATED,
                'Authentication token is invalid or expired'
            ));
        }
    }
);

module.exports = {
    SocketAuthenticationError,
    readHandshakeToken,
    createSocketAuthenticator
};
