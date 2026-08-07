const express = require('express');

const router = express.Router();

const paymentUnavailable = (req, res) => {
  res.status(503).json({
    success: false,
    code: 'ONLINE_PAYMENTS_DISABLED',
    message: 'Online payments are temporarily unavailable. Please select Cash.'
  });
};

// Online payments remain fail-closed until gateway callbacks are verified
// server-side for authenticity, amount, currency, ownership, and idempotency.
router.all('/{*paymentPath}', paymentUnavailable);
router.all('/', paymentUnavailable);

module.exports = router;
