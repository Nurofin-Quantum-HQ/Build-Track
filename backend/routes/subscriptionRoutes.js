/**
 * subscriptionRoutes.js
 *
 * Endpoints:
 *   POST /api/subscriptions/initiate       — authenticated, creates PENDING payment + subscription
 *   POST /api/subscriptions/callback       — Airpay IPN server-to-server, returns HTTP 200
 *   GET  /api/subscriptions/browser-return — browser redirect after payment (checks status)
 *   GET  /api/subscriptions/status         — authenticated, returns current subscription status
 */
const express      = require('express');
const router       = express.Router();
const Subscription = require('../models/Subscription');
const Payment      = require('../models/Payment');
const User         = require('../models/User');
const { protect }  = require('../middleware/auth');
const { buildPaymentPayload, verifyAndDecryptCallbackData } = require('../utils/airpayservice');

// ─── Constants ────────────────────────────────────────────────────────────────

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

/** Phone validation: digits only, 8–15 characters */
function isValidPhone(phone) {
  return /^\d{8,15}$/.test(phone);
}

/** Normalise a name part to letters only, 1–50 chars */
function sanitiseName(str) {
  return (str || '').replace(/[^A-Za-z]/g, '').slice(0, 50);
}

// ─── POST /api/subscriptions/initiate ─────────────────────────────────────────

router.post('/initiate', protect, async (req, res) => {
  try {
    const { plan, phone: bodyPhone, savePhone } = req.body;

    if (!PLAN_PRICES[plan]) {
      return res.status(400).json({ message: 'Invalid plan selected.' });
    }

    const isSandbox = (process.env.AIRPAY_ENV || '').toLowerCase() === 'sandbox';
    const isProd    = process.env.NODE_ENV === 'production' && !isSandbox;

    // Re-fetch user to get the latest data (including newly saved phone)
    const user = await User.findById(req.user._id).select('-password -resetPasswordToken -resetPasswordExpires');
    if (!user) return res.status(404).json({ message: 'User not found.' });

    // ── Validate / supply phone ───────────────────────────────────────────
    let buyerPhone = (user.phone || bodyPhone || '').toString().replace(/\D/g, '');

    if (isProd && !isValidPhone(buyerPhone)) {
      // Phone is required — tell frontend to show the phone modal
      return res.status(422).json({
        requiresPhone: true,
        message: 'Please provide your mobile number to continue with payment.',
      });
    }

    // If sandbox and still no phone, use a safe placeholder
    if (!isProd && !isValidPhone(buyerPhone)) {
      buyerPhone = '9999999999';
    }

    // Save phone to profile if user requested it and it is valid
    if (savePhone && isValidPhone(buyerPhone) && user.phone !== buyerPhone) {
      await User.findByIdAndUpdate(user._id, { phone: buyerPhone });
    }

    // ── Build buyer name parts ─────────────────────────────────────────────
    const nameParts = (user.name || '').split(' ').filter(Boolean);
    let buyerFirstName = sanitiseName(nameParts[0]);
    let buyerLastName  = sanitiseName(nameParts.slice(1).join(''));

    // If user has only a single name (e.g. "Nisha"), reuse it as last name
    if (buyerFirstName && !buyerLastName) {
      buyerLastName = buyerFirstName;
    }

    // Sandbox fallback only
    if (!isProd) {
      if (!buyerFirstName) buyerFirstName = 'Test';
      if (!buyerLastName)  buyerLastName  = 'User';
    }

    // In production, reject only if there is truly no name at all
    if (isProd && !buyerFirstName) {
      return res.status(422).json({
        message: 'Your account must have a name to proceed with payment. Please update your profile.',
      });
    }

    // ── Create order ID and records ────────────────────────────────────────
    const orderId = `BT${Date.now().toString().slice(-8)}${String(Math.floor(Math.random() * 99)).padStart(2, '0')}`;
    const amount  = PLAN_PRICES[plan];

    // Create Subscription (status: pending — NOT active)
    const sub = await Subscription.create({
      userId: user._id,
      plan,
      status: 'pending',
      amount,
      airpayOrderId: orderId,
    });

    // Create Payment record (source of truth)
    await Payment.create({
      orderId,
      userId:         user._id,
      subscriptionId: sub._id,
      plan,
      amount,
      currency:       'INR',
      status:         'PENDING',
    });

    // ── Build Airpay payload ───────────────────────────────────────────────
    const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;

    const { postUrl, formFields } = await buildPaymentPayload({
      orderId,
      amount,
      buyerEmail:     user.email,
      buyerPhone,
      buyerFirstName,
      buyerLastName,
      // Optional — only passed when real data exists on profile
      buyerAddress:   user.address   || undefined,
      buyerCity:      user.city      || undefined,
      buyerState:     user.state     || undefined,
      buyerCountry:   'India',
      buyerPinCode:   user.pincode   || undefined,
      // Browser return URL (separate from IPN callback)
      returnUrl: `${backendUrl}/api/subscriptions/browser-return`,
    });

    console.log(`[Subscription] Initiate OK — orderId=${orderId} plan=${plan} userId=${user._id}`);

    return res.json({
      success: true,
      paymentParams: {
        airpayUrl: postUrl,
        ...formFields,
      },
      orderId,
    });
  } catch (err) {
    console.error('[Subscription] Initiate error:', err.message);
    return res.status(500).json({
      message: 'Failed to initiate payment. Please try again.',
      detail:  err.message,
    });
  }
});

// ─── POST /api/subscriptions/callback ─────────────────────────────────────────
// Airpay IPN — server-to-server. MUST return HTTP 200 to stop retries.

router.post('/callback', async (req, res) => {
  // Temporary deployment version log
  console.log('[AirPay IPN] --- CALLBACK ROUTE TRIGGERED (DEPLOYMENT v10.5) ---');
  
  // Safe logging — never log keys, full payloads, or sensitive fields
  console.log('[AirPay IPN] Callback received — body keys:', Object.keys(req.body || {}));
  console.log('[AirPay IPN] Has "response" field:', !!req.body?.response);
  if (req.body?.response) {
    console.log('[AirPay IPN] response length:', req.body.response.length);
  }

  try {
    // ── 1. Decrypt and verify IPN ──────────────────────────────────────────
    const { data: txnData } = verifyAndDecryptCallbackData(req.body);

    const orderId       = txnData.orderid       || txnData.TRANSACTIONID || txnData.order_id;
    const airpayTxnId   = txnData.ap_transactionid || txnData.APTRANSACTIONID || txnData.transactionid;
    const paymentStatus = (txnData.transaction_status || txnData.TRANSACTIONSTATUS || '').toString().trim().toUpperCase();
    const receivedMid   = String(txnData.merchant_id || txnData.MERCHANT_ID || '').trim();
    const receivedAmt   = Number(txnData.amount || txnData.AMOUNT || 0);

    console.log(`[AirPay IPN] orderId=${orderId} txnId=${airpayTxnId} status=${paymentStatus}`);

    // ── 2. Verify merchant ID ──────────────────────────────────────────────
    const expectedMid = (process.env.AIRPAY_MERCHANT_ID || '').trim();
    if (receivedMid && receivedMid !== expectedMid) {
      console.error(`[AirPay IPN] Merchant ID mismatch: expected=${expectedMid} got=${receivedMid}`);
      return res.status(200).send('MERCHANT_ID_MISMATCH');
    }

    // ── 3. Find payment record ─────────────────────────────────────────────
    const payment = await Payment.findOne({ orderId });
    if (!payment) {
      console.error(`[AirPay IPN] No Payment record for orderId=${orderId}`);
      return res.status(200).send('ORDER_NOT_FOUND');
    }

    // ── 4. Idempotency — if already processed, acknowledge and stop ────────
    if (payment.callbackProcessed) {
      console.log(`[AirPay IPN] Duplicate callback ignored for orderId=${orderId}`);
      
      const userAgent = req.headers['user-agent'] || '';
      const isBrowser = userAgent.includes('Mozilla') || userAgent.includes('AppleWebKit') || 
                        req.headers['sec-fetch-dest'] === 'document' || 
                        (req.headers.accept && req.headers.accept.includes('text/html'));
                        
      if (isBrowser) {
        const isSuccess = payment.status === 'PAID';
        const frontendUrl = process.env.CLIENT_URL || 'https://buildtrack.nurofin.com';
        return res.redirect(`${frontendUrl}/subscription?status=${isSuccess ? 'success' : 'failed'}`);
      }
      return res.status(200).send('ALREADY_PROCESSED');
    }

    // ── 5. Verify amount ───────────────────────────────────────────────────
    if (Math.abs(receivedAmt - payment.amount) > 0.01) {
      console.error(`[AirPay IPN] Amount mismatch: expected=${payment.amount} got=${receivedAmt} orderId=${orderId}`);
      await Payment.findByIdAndUpdate(payment._id, {
        status:              'FAILED',
        callbackProcessed:   true,
        callbackProcessedAt: new Date(),
        callbackStatus:      `AMOUNT_MISMATCH:expected=${payment.amount},got=${receivedAmt}`,
      });
      await Subscription.findOneAndUpdate(
        { airpayOrderId: orderId },
        { status: 'failed', callbackProcessed: true, callbackReceivedAt: new Date(), callbackStatus: 'AMOUNT_MISMATCH' }
      );
      return res.status(200).send('AMOUNT_MISMATCH');
    }

    // ── 6. Process based on status ─────────────────────────────────────────
    const isSuccess = paymentStatus === 'SUCCESS' || paymentStatus === '200';

    if (isSuccess) {
      const now     = new Date();
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + (PLAN_DURATION_DAYS[payment.plan] || 30));

      // Mark payment PAID
      await Payment.findByIdAndUpdate(payment._id, {
        status:              'PAID',
        airpayTxnId,
        secureHash:          txnData.ap_securehash,
        callbackProcessed:   true,
        callbackProcessedAt: now,
        callbackStatus:      paymentStatus,
      });

      // Activate subscription — ONLY after verified success
      await Subscription.findOneAndUpdate(
        { airpayOrderId: orderId },
        {
          status:              'active',
          airpayTxnId,
          transactionId:       airpayTxnId, // legacy compat
          startDate:           now,
          endDate,
          callbackProcessed:   true,
          callbackReceivedAt:  now,
          callbackStatus:      paymentStatus,
        }
      );

      console.log(`[AirPay IPN] ✅ SUCCESS — subscription activated for orderId=${orderId} plan=${payment.plan}`);

      try {
        const NotificationService = require("../services/NotificationService");
        await NotificationService.send(payment.userId, {
          title: "Payment Received",
          message: `Your ${payment.plan} plan payment of Rs. ${payment.amount} was successful. Subscription activated.`,
          type: "payment",
          priority: "high",
          relatedId: payment._id,
          relatedModel: "Payment",
          data: { plan: payment.plan, amount: payment.amount }
        });
      } catch (e) {
        console.error("[AirPay IPN] Failed to send success notification:", e);
      }
    } else {
      // Payment failed or unknown status
      await Payment.findByIdAndUpdate(payment._id, {
        status:              'FAILED',
        airpayTxnId:         airpayTxnId || undefined,
        callbackProcessed:   true,
        callbackProcessedAt: new Date(),
        callbackStatus:      paymentStatus,
      });

      await Subscription.findOneAndUpdate(
        { airpayOrderId: orderId },
        {
          status:             'failed',
          airpayTxnId:        airpayTxnId || undefined,
          callbackProcessed:  true,
          callbackReceivedAt: new Date(),
          callbackStatus:     paymentStatus,
        }
      );

      console.log(`[AirPay IPN] ❌ FAILED — status=${paymentStatus} orderId=${orderId}`);

      try {
        const NotificationService = require("../services/NotificationService");
        await NotificationService.send(payment.userId, {
          title: "Payment Failed",
          message: `Your ${payment.plan} plan payment of Rs. ${payment.amount} could not be completed. Please try again.`,
          type: "payment",
          priority: "high",
          relatedId: payment._id,
          relatedModel: "Payment",
          data: { plan: payment.plan, amount: payment.amount, status: paymentStatus }
        });
      } catch (e) {
        console.error("[AirPay IPN] Failed to send failure notification:", e);
      }
    }

    // Check if this is a browser redirecting to the callback
    const userAgent = req.headers['user-agent'] || '';
    const isBrowser = userAgent.includes('Mozilla') || userAgent.includes('AppleWebKit') || 
                      req.headers['sec-fetch-dest'] === 'document' || 
                      (req.headers.accept && req.headers.accept.includes('text/html'));
                      
    if (isBrowser) {
      const frontendUrl = process.env.CLIENT_URL || 'https://buildtrack.nurofin.com';
      return res.redirect(`${frontendUrl}/subscription?status=${isSuccess ? 'success' : 'failed'}`);
    }

    // Airpay requires HTTP 200 to stop retrying
    return res.status(200).send(isSuccess ? 'SUCCESS' : 'FAILED');

  } catch (err) {
    // On ANY error: log for investigation
    console.error('[AirPay IPN] Processing error:', err.message);
    
    // Check if this is a browser redirecting to the callback
    const userAgent = req.headers['user-agent'] || '';
    const isBrowser = userAgent.includes('Mozilla') || userAgent.includes('AppleWebKit') || 
                      req.headers['sec-fetch-dest'] === 'document' || 
                      (req.headers.accept && req.headers.accept.includes('text/html'));
                      
    if (isBrowser) {
      console.log('[AirPay IPN] Redirecting browser to frontend after error.');
      const frontendUrl = process.env.CLIENT_URL || 'https://buildtrack.nurofin.com';
      // URL encode the error message so we can debug it on the frontend
      const encodedError = encodeURIComponent(err.message || 'unknown_error');
      return res.redirect(`${frontendUrl}/subscription?status=failed&reason=${encodedError}`);
    }

    // Do NOT redirect to buildtrack:// — this is a server-to-server endpoint
    return res.status(200).send('SERVER_ERROR');
  }
});

// ─── GET /api/subscriptions/browser-return ────────────────────────────────────
// This is the URL the USER's BROWSER is redirected to after payment on Airpay.
// Look up real payment status and redirect accordingly.

router.get('/browser-return', async (req, res) => {
  const { orderid } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'https://buildtrack.nurofin.com';

  try {
    if (!orderid) {
      return res.redirect(`${frontendUrl}/subscription?status=unknown`);
    }

    // Wait briefly for IPN to process (IPN can arrive slightly before browser return)
    await new Promise(r => setTimeout(r, 1500));

    const payment = await Payment.findOne({ orderId: orderid });

    if (!payment) {
      return res.redirect(`${frontendUrl}/subscription?status=not_found`);
    }

    if (payment.status === 'PAID') {
      const sub = await Subscription.findById(payment.subscriptionId);
      return res.redirect(
        `${frontendUrl}/subscription?status=success&plan=${sub?.plan || payment.plan}`
      );
    } else if (payment.status === 'FAILED') {
      return res.redirect(`${frontendUrl}/subscription?status=failed`);
    } else {
      // Still PENDING — IPN may not have arrived yet
      return res.redirect(`${frontendUrl}/subscription?status=pending&orderid=${orderid}`);
    }
  } catch (err) {
    console.error('[Subscription] Browser return error:', err.message);
    return res.redirect(`${frontendUrl}/subscription?status=error`);
  }
});

// ─── GET /api/subscriptions/status ────────────────────────────────────────────

router.get('/status', protect, async (req, res) => {
  try {
    const isAdmin       = (req.user.role || '').toLowerCase() === 'admin';
    const billingUserId = isAdmin ? req.user._id : (req.user.createdBy || req.user._id);

    const sub = await Subscription.findOne({
      userId:  billingUserId,
      status:  'active',
      endDate: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!sub) return res.json({ hasSubscription: false, plan: null });

    return res.json({
      hasSubscription: true,
      plan:            sub.plan,
      status:          sub.status,
      startDate:       sub.startDate,
      endDate:         sub.endDate,
      transactionId:   sub.airpayTxnId || sub.transactionId,
    });
  } catch (err) {
    console.error('[Subscription] Status error:', err.message);
    return res.status(500).json({ message: 'Failed to fetch subscription status.' });
  }
});

module.exports = router;
