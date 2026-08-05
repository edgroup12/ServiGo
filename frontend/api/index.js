const app = require('./backend/app');
const connectDatabase = require('./backend/db');

module.exports = async (req, res) => {
    try {
        await connectDatabase();
        return app(req, res);
    } catch (error) {
        console.error('Database connection failed:', error.message);
        return res.status(503).json({
            success: false,
            message: 'Database service is temporarily unavailable'
        });
    }
};
