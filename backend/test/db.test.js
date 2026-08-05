const { afterEach, beforeEach, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const dbModulePath = require.resolve('../db');
const originalConnect = mongoose.connect;

let connectCalls;

beforeEach(() => {
    connectCalls = 0;
    delete require.cache[dbModulePath];
    mongoose.connect = async () => {
        connectCalls += 1;
        return mongoose;
    };
});

afterEach(() => {
    mongoose.connect = originalConnect;
    delete require.cache[dbModulePath];
});

describe('MongoDB connection helper', () => {
    it('fails fast when MONGODB_URI is missing', async () => {
        const connectDatabase = require('../db');

        await assert.rejects(
            connectDatabase(''),
            /MONGODB_URI is required/
        );
        assert.equal(connectCalls, 0);
    });

    it('shares one connection attempt across concurrent calls', async () => {
        const connectDatabase = require('../db');

        const [firstConnection, secondConnection] = await Promise.all([
            connectDatabase('mongodb://127.0.0.1:27017/servigo-test'),
            connectDatabase('mongodb://127.0.0.1:27017/servigo-test')
        ]);

        assert.equal(connectCalls, 1);
        assert.equal(firstConnection, mongoose.connection);
        assert.equal(secondConnection, mongoose.connection);
    });
});
