const express = require('express');
const router = express.Router();
const SSLCommerzPayment = require('sslcommerz-lts');
const Booking = require('../models/Booking');
const { auth } = require('../middleware/auth');

// Sandbox Credentials
const store_id = process.env.STORE_ID || 'testbox';
const store_passwd = process.env.STORE_PASSWORD || 'testpassword';
const is_live = false; // true for live, false for sandbox

// Init Payment
router.post('/init', auth, async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId).populate('customer').populate('worker');
    
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const tran_id = `REF-${bookingId}-${Date.now()}`;

    const data = {
      total_amount: booking.estimatedPrice,
      currency: 'BDT',
      tran_id: tran_id, // use unique tran_id for each api call
      success_url: `http://localhost:5001/api/payment/success/${tran_id}`,
      fail_url: `http://localhost:5001/api/payment/fail/${tran_id}`,
      cancel_url: `http://localhost:5001/api/payment/cancel/${tran_id}`,
      ipn_url: `http://localhost:5001/api/payment/ipn`,
      shipping_method: 'Courier',
      product_name: `Service from ${booking.worker.name}`,
      product_category: 'Service',
      product_profile: 'general',
      cus_name: booking.customer.name,
      cus_email: booking.customer.email || 'customer@example.com',
      cus_add1: booking.address || 'Dhaka',
      cus_city: 'Dhaka',
      cus_state: 'Dhaka',
      cus_postcode: '1000',
      cus_country: 'Bangladesh',
      cus_phone: booking.customer.phone || '01711111111',
      shipping_name: booking.customer.name,
      shipping_add1: 'Dhaka',
      shipping_city: 'Dhaka',
      shipping_state: 'Dhaka',
      shipping_postcode: 1000,
      shipping_country: 'Bangladesh',
    };

    // Save transaction info in booking
    booking.transactionId = tran_id;
    await booking.save();

    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    sslcz.init(data).then(apiResponse => {
      // Redirect the user to payment gateway
      let GatewayPageURL = apiResponse.GatewayPageURL;
      res.json({ url: GatewayPageURL });
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Success Route
router.post('/success/:tranId', async (req, res) => {
  try {
    const booking = await Booking.findOne({ transactionId: req.params.tranId });
    if (booking) {
      booking.paymentStatus = 'paid';
      await booking.save();
    }
    res.redirect('http://localhost:5173/payment/success');
  } catch (error) {
    res.status(500).send('Payment success processing failed');
  }
});

// Fail Route
router.post('/fail/:tranId', async (req, res) => {
  try {
    const booking = await Booking.findOne({ transactionId: req.params.tranId });
    if (booking) {
      booking.paymentStatus = 'failed';
      await booking.save();
    }
    res.redirect('http://localhost:5173/payment/fail');
  } catch (error) {
    res.status(500).send('Payment failure processing failed');
  }
});

// Cancel Route
router.post('/cancel/:tranId', async (req, res) => {
  try {
    const booking = await Booking.findOne({ transactionId: req.params.tranId });
    if (booking) {
      booking.paymentStatus = 'cancelled';
      await booking.save();
    }
    res.redirect('http://localhost:5173/payment/cancel');
  } catch (error) {
    res.status(500).send('Payment cancellation processing failed');
  }
});

module.exports = router;
