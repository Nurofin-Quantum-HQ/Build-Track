const express    = require('express');
const router     = express.Router();
const Subscription = require('../models/Subscription');
const { protect } = require('../middleware/auth');
const { buildPaymentPayload, verifyAndDecryptCallbackData } = require('../utils/airpayservice');
const PLAN_PRICES = {
  starter:    1,
  growth:     999,
  pro:       1499,
  business:  2499,
  enterprise: 4999,
};
const PLAN_DURATION_DAYS = {
  starter:    30,
  growth:     30,
  pro:        30,
  business:   30,
  enterprise: 30,
};
router.post('/initiate', protect, async (req, res) => {
  try {
    const { plan } = req.body;
    const userId   = req.user._id;
    if (!PLAN_PRICES[plan]) {
      return res.status(400).json({ message: 'Invalid plan' });
    }
    const orderId = `BT${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 99)}`;
    const amount  = PLAN_PRICES[plan];
    await Subscription.create({
      userId,
      plan,
      status: 'pending',
      amount,
      airpayOrderId: orderId,
    });
    const user = req.user;
    const nameParts = (user.name || 'BuildTrack User').split(' ');
    const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const { postUrl, formFields } = await buildPaymentPayload({
      orderId,
      amount,
      buyerEmail:     user.email     || 'test@buildtrack.com',
      buyerPhone:     (user.phone || '9999999999').replace(/\D/g, '').slice(-10) || '9999999999',
      buyerFirstName: (nameParts[0] || 'BuildTrack').replace(/[^a-zA-Z]/g, '') || 'BuildTrack',
      buyerLastName:  (nameParts.slice(1).join('') || 'User').replace(/[^a-zA-Z]/g, '') || 'User',
      buyerAddress:   'Not Available',
      buyerCity:      'Not Available',
      buyerState:     'Not Available',
      buyerCountry:   'India',
      buyerPinCode:   '400001',
      returnUrl:      `${backendUrl}/api/subscriptions/callback`,
    });
    res.json({
      success: true,
      paymentParams: {
        airpayUrl: postUrl,
        ...formFields,
      },
      orderId,
    });
  } catch (err) {
    console.error('Initiate error:', err.message);
    res.status(500).json({
      message: 'Failed to initiate payment',
      detail:  err.message,
    });
  }
});
router.post('/callback', async (req, res) => {
  try {
    const result = verifyAndDecryptCallbackData(req.body);
    const dataObj = result.data || result;
    const orderid       = dataObj.orderid || dataObj.order_id || result.orderid;
    const transactionId = dataObj.ap_transactionid || dataObj.transactionid || dataObj.transaction_id || result.transactionid;
    const paymentStatus = (
      dataObj.transaction_status ||
      dataObj.transaction_payment_status ||
      dataObj.payment_status ||
      result.status ||
      ''
    ).toString().toUpperCase();
    const sub = await Subscription.findOne({ airpayOrderId: orderid });
    if (!sub) {
      console.error('No matching subscription for orderid:', orderid);
      return res.redirect('buildtrack://payment/failure?reason=order_not_found');
    }
    if (paymentStatus === 'SUCCESS' || paymentStatus === '200') {
      const now     = new Date();
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + (PLAN_DURATION_DAYS[sub.plan] || 30));
      await Subscription.findByIdAndUpdate(sub._id, {
        status: 'active',
        transactionId,
        startDate: now,
        endDate,
      });
      return res.redirect(
        `buildtrack://payment/success?plan=${sub.plan}&txn=${transactionId}`
      );
    } else {
      await Subscription.findByIdAndUpdate(sub._id, {
        status: 'failed',
        transactionId,
      });
      return res.redirect('buildtrack://payment/failure?reason=payment_failed');
    }
  } catch (err) {
    console.error('Callback error:', err.message);
    res.redirect('buildtrack://payment/failure?reason=server_error');
  }
});
router.get('/status', protect, async (req, res) => {
  try {
    const isAdmin = (req.user.role || '').toLowerCase() === 'admin';
    const billingUserId = isAdmin
      ? req.user._id
      : (req.user.createdBy || req.user._id);
    const sub = await Subscription.findOne({
      userId:  billingUserId,
      status:  'active',
      endDate: { $gt: new Date() },
    }).sort({ createdAt: -1 });
    if (!sub) return res.json({ hasSubscription: false, plan: null });
    res.json({
      hasSubscription: true,
      plan:          sub.plan,
      status:        sub.status,
      startDate:     sub.startDate,
      endDate:       sub.endDate,
      transactionId: sub.transactionId,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch status' });
  }
});
module.exports = router;
