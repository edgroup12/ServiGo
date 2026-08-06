'use strict';

const mongoose = require('mongoose');

let connectionPromise = null;

const connectDatabase = async (uri) => {
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    if (!connectionPromise) {
        connectionPromise = mongoose
            .connect(uri, {
                serverSelectionTimeoutMS: 5000,
                maxPoolSize: 10
            })
            .then(() => mongoose.connection)
            .catch((error) => {
                connectionPromise = null;
                throw error;
            });
    }

    return connectionPromise;
};

const databaseIsReady = () => mongoose.connection.readyState === 1;

const disconnectDatabase = async () => {
    connectionPromise = null;
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
};

module.exports = { connectDatabase, databaseIsReady, disconnectDatabase };
