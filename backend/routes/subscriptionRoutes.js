/**
 * subscriptionRoutes.js
 *
 * Endpoints:
 *   POST /api/subscriptions/initiate       - authenticated, creates PENDING payment + subscription
 *   POST /api/subscriptions/callback       - unauthenticated IPN webhook from Airpay
 *   GET  /api/subscriptions/browser-return - browser redirect after payment (checks status)
 *   POST /api/subscriptions/cancel         - authenticated, cancels active subscription
 *   GET  /api/subscriptions/status         - authenticated, returns current subscription status
 */
const express      = require('express');
const router       = express.Router();
const Subscription = require('../models/Subscription');
const Payment      = require('../models/Payment');
const User         = require('../models/User');
const { protect }  = require('../middleware/auth');
const {
  buildPaymentPayload, verifyAndDecryptCallbackData, manageSubscription, subscriptionHmac, PRIVATE_KEY,
  FIRST_DEBIT_DAYS, MANDATE_TOKEN_AMOUNT,
} = require('../utils/airpayservice');
const { applyRenewal, syncRenewalsFromAirpay } = require('../services/subscriptionRenewal');

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
    const { plan, phone: bodyPhone, savePhone, isRecurring, chmod } = req.body;

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
    const wantsAutoPay = isRecurring === true || isRecurring === 'true' || isRecurring === 1 || isRecurring === '1';
    // AutoPay charges only the mandate token now; AutoPay debits the plan price from T+2.
    const chargeNow = wantsAutoPay ? MANDATE_TOKEN_AMOUNT : amount;
    if (wantsAutoPay && !(amount > MANDATE_TOKEN_AMOUNT)) {
      return res.status(400).json({
        message: `AutoPay isn't available for the ${plan} plan. Please choose One-Time Payment.`,
      });
    }

    // Create Subscription (status: pending — NOT active)
    const sub = await Subscription.create({
      userId: user._id,
      plan,
      status: 'pending',
      amount,
      airpayOrderId: orderId,
      isRecurring: wantsAutoPay,
    });

    // Create Payment record (source of truth)
    await Payment.create({
      orderId,
      userId:         user._id,
      subscriptionId: sub._id,
      plan,
      amount:         chargeNow,
      currency:       'INR',
      status:         'PENDING',
    });

    // ── Build Airpay payload ───────────────────────────────────────────────
    const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;

    const { postUrl, formFields, requestData } = await buildPaymentPayload({
      orderId,
      amount:          chargeNow,
      recurringAmount: amount,
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
      // AutoPay → txnsubtype 12 + sb_* fields (Simple Transaction doc)
      isRecurring: wantsAutoPay,
      chmod,
    });

    console.log(`[Subscription] Initiate OK — orderId=${orderId} plan=${plan} userId=${user._id} isRecurring=${wantsAutoPay}`);

    return res.json({
      success: true,
      paymentParams: {
        airpayUrl: postUrl,
        ...formFields,
      },
      orderId,
      // What went inside encdata (the buyer's own details, no keys) — logged in the browser
      // console so the request can be checked or shared with AirPay without server access.
      airpayRequest: requestData,
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
  console.log('[AirPay IPN] --- CALLBACK ROUTE TRIGGERED (DEPLOYMENT v10.7) ---');
  
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

    // ── 3b. AutoPay renewal debit ──────────────────────────────────────────
    // A monthly debit carries the AirPay subscription_id but is a NEW ap_transactionid —
    // either for an orderid we don't know, or for the original (already processed) order.
    const airpaySubId = String(txnData.subscription_id || txnData.SUBSCRIPTION_ID || '').trim();
    const isRenewalDebit = airpaySubId && airpayTxnId && (
      !payment || (payment.callbackProcessed && String(payment.airpayTxnId || '') !== String(airpayTxnId))
    );
    if (isRenewalDebit) {
      const recurringSub = await Subscription.findOne({ airpaySubscriptionId: airpaySubId });
      if (recurringSub) {
        if (paymentStatus === 'SUCCESS' || paymentStatus === '200') {
          const applied = await applyRenewal(recurringSub, { airpayTxnId, amount: receivedAmt });
          return res.status(200).send(applied ? 'RENEWAL_APPLIED' : 'RENEWAL_ALREADY_PROCESSED');
        }
        console.warn(`[AirPay IPN] AutoPay debit not successful sub=${recurringSub._id} txn=${airpayTxnId} status=${paymentStatus}`);
        return res.status(200).send('RENEWAL_NOT_SUCCESSFUL');
      }
    }

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
      const subDoc  = await Subscription.findOne({ airpayOrderId: orderId });
      if (subDoc?.isRecurring) {
        // AutoPay: only the mandate token was paid. Access runs until the first AutoPay debit
        // (T+2) plus one grace day; each successful debit then extends it by a month.
        endDate.setDate(endDate.getDate() + FIRST_DEBIT_DAYS + 1);
      } else {
        endDate.setDate(endDate.getDate() + (PLAN_DURATION_DAYS[payment.plan] || 30));
      }

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
          // AutoPay: AirPay returns these on a subscription transaction
          ...(airpaySubId ? { airpaySubscriptionId: airpaySubId } : {}),
          ...(txnData.subscription_next_rundate ? { nextRunDate: String(txnData.subscription_next_rundate) } : {}),
          callbackProcessed:   true,
          callbackReceivedAt:  now,
          callbackStatus:      paymentStatus,
        }
      );

      console.log(`[AirPay IPN] ✅ SUCCESS — subscription activated for orderId=${orderId} plan=${payment.plan}`);

      try {
        const NotificationService = require("../services/NotificationService");
        await NotificationService.send(payment.userId, {
          title: subDoc?.isRecurring ? "AutoPay Set Up" : "Payment Received",
          message: subDoc?.isRecurring
            ? `AutoPay is set up for your ${payment.plan} plan. Rs. ${subDoc.amount} will be debited every month, starting in ${FIRST_DEBIT_DAYS} days.`
            : `Your ${payment.plan} plan payment of Rs. ${payment.amount} was successful. Subscription activated.`,
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

// ─── POST /api/subscriptions/subscription-approval ────────────────────────────
// AirPay "Subscription Callback": called 1–2 days before each AutoPay debit and
// asks us to Approve (200) or Reject (400). Register this URL with AirPay.
// Safety net for cancel: if the unsubscribe call failed, the debit is rejected here.
// Read-only — it never changes our data, so an unverified caller can't do harm.

router.post('/subscription-approval', async (req, res) => {
  const approve = { status: '200', message: 'Approve' };
  const reject  = { status: '400', message: 'Reject' };
  try {
    const { subscription_id: subId, sb_amount: sbAmount, checksum } = req.body || {};
    if (!subId) return res.status(200).json(reject);

    const mid = (process.env.AIRPAY_MERCHANT_ID || '').trim();
    const expected = subscriptionHmac([subId, PRIVATE_KEY, mid, sbAmount]);
    if (String(checksum || '') !== expected) {
      console.warn(`[AutoPay] subscription-approval checksum did not match for sub=${subId} (deciding from our records only)`);
    }

    const sub = await Subscription.findOne({ airpaySubscriptionId: String(subId) }).sort({ createdAt: -1 });
    if (!sub) {
      // Unknown to us — AirPay's default with no callback is Approve; keep that behaviour.
      console.warn(`[AutoPay] subscription-approval for unknown sub=${subId} — approving (AirPay default)`);
      return res.status(200).json(approve);
    }
    if (sub.status === 'cancelled') {
      console.log(`[AutoPay] Rejecting debit for cancelled sub=${sub._id}`);
      return res.status(200).json(reject);
    }
    if (Number(sbAmount) - sub.amount > 0.01) {
      console.warn(`[AutoPay] Rejecting debit sub=${sub._id}: amount ${sbAmount} > plan ${sub.amount}`);
      return res.status(200).json(reject);
    }
    return res.status(200).json(approve);
  } catch (err) {
    console.error('[AutoPay] subscription-approval error:', err.message);
    return res.status(200).json(approve);
  }
});

// ─── GET /api/subscriptions/status ────────────────────────────────────────────


router.post('/cancel', protect, async (req, res) => {
  try {
    const isAdmin = (req.user.role || '').toLowerCase() === 'admin';
    const billingUserId = isAdmin
      ? req.user._id
      : (req.user.createdBy || req.user._id);
    const sub = await Subscription.findOne({
      userId: billingUserId,
      status: 'active',
      endDate: { $gt: new Date() },
    }).sort({ createdAt: -1 });
    if (!sub) {
      return res.status(404).json({ success: false, message: 'No active subscription found to cancel' });
    }
    // AutoPay: stop the mandate at AirPay, otherwise the customer keeps getting debited.
    let autopay = null;
    if (sub.isRecurring) {
      if (sub.airpaySubscriptionId) {
        try {
          autopay = await manageSubscription(sub.airpaySubscriptionId, 'U');
        } catch (e) {
          autopay = { ok: false, status: 'ERROR', message: e.message };
        }
        if (!autopay.ok) {
          // Still cancel locally: /subscription-approval will Reject the next debit.
          console.error(`[Subscription] AirPay unsubscribe FAILED sub=${sub._id} airpaySub=${sub.airpaySubscriptionId} status=${autopay.status} msg=${autopay.message}`);
        }
      } else {
        autopay = { ok: false, status: 'NO_SUBSCRIPTION_ID', message: 'AirPay subscription_id was never received' };
        console.error(`[Subscription] AutoPay sub=${sub._id} has no AirPay subscription_id — stop it manually in the AirPay dashboard`);
      }
    }

    await Subscription.findByIdAndUpdate(sub._id, {
      status: 'cancelled',
      ...(autopay ? { airpayUnsubscribe: { status: autopay.status, message: autopay.message, at: new Date() } } : {}),
    });
    res.json({
      success: true,
      message: autopay && !autopay.ok
        ? 'Subscription cancelled. We could not confirm AutoPay was stopped at the bank yet — our team will make sure you are not charged again.'
        : 'Subscription has been cancelled successfully.',
      endDate: sub.endDate,
      autopayStopped: autopay ? autopay.ok : undefined,
    });
  } catch (err) {
    console.error('Cancel error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to cancel subscription' });
  }
});

router.get('/status', protect, async (req, res) => {
  try {
    const isAdmin       = (req.user.role || '').toLowerCase() === 'admin';
    const billingUserId = isAdmin ? req.user._id : (req.user.createdBy || req.user._id);

    let sub = await Subscription.findOne({
      userId:  billingUserId,
      status:  'active',
      endDate: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    // AutoPay period ran out locally — a renewal debit may have succeeded without its
    // IPN reaching us. Ask AirPay (Subscription Status Check) before reporting expiry.
    if (!sub) {
      const lapsed = await Subscription.findOne({
        userId: billingUserId, status: 'active', isRecurring: true,
        airpaySubscriptionId: { $exists: true, $ne: null },
      }).sort({ createdAt: -1 });
      if (lapsed) {
        try {
          if (await syncRenewalsFromAirpay(lapsed)) {
            sub = await Subscription.findById(lapsed._id);
            if (!(sub?.endDate > new Date())) sub = null;
          }
        } catch (e) {
          console.error(`[Subscription] AutoPay renewal sync failed sub=${lapsed._id}: ${e.message}`);
        }
      }
    }

    if (!sub) return res.json({ hasSubscription: false, plan: null });

    return res.json({
      hasSubscription: true,
      plan:            sub.plan,
      status:          sub.status,
      startDate:       sub.startDate,
      endDate:         sub.endDate,
      transactionId:   sub.airpayTxnId || sub.transactionId,
      isRecurring:     !!sub.isRecurring,
      nextRunDate:     sub.nextRunDate,
    });
  } catch (err) {
    console.error('[Subscription] Status error:', err.message);
    return res.status(500).json({ message: 'Failed to fetch subscription status.' });
  }
});

module.exports = router;
