const mongoose = require('mongoose');

let connectionPromise = null;
let connectionUri = null;

/**
 * Connect to MongoDB once per Node.js process.
 * Warm serverless invocations reuse the cached connection promise.
 */
const connectDatabase = async (uri = process.env.MONGODB_URI) => {
    if (!uri) {
        throw new Error('MONGODB_URI is required to connect to the database');
    }

    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    if (!connectionPromise || connectionUri !== uri) {
        connectionUri = uri;
        connectionPromise = mongoose
            .connect(uri, { serverSelectionTimeoutMS: 5000 })
            .then(() => mongoose.connection)
            .catch((error) => {
                connectionPromise = null;
                connectionUri = null;
                throw error;
            });
    }

    return connectionPromise;
};

module.exports = connectDatabase;
