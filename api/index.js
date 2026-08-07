const app = require('../backend/app');
const connectDatabase = require('../backend/db');

const createHandler = ({ application = app, connect = connectDatabase, logger = console } = {}) => (
    async (req, res) => {
        try {
            await connect();
            return application(req, res);
        } catch (error) {
            logger.error('Database connection failed:', error.message);
            return res.status(503).json({
                success: false,
                code: 'DATABASE_UNAVAILABLE',
                message: 'Database service is temporarily unavailable'
            });
        }
    }
);

module.exports = createHandler();
module.exports.createHandler = createHandler;