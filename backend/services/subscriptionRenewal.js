/**
 * subscriptionRenewal.js
 * AutoPay (AirPay txnsubtype 12) renewals: each successful monthly debit extends
 * the subscription by one plan period. Idempotent on AirPay's transaction id, so
 * the same debit arriving via IPN and via the status-check API counts once.
 */
const Subscription = require('../models/Subscription');
const Payment      = require('../models/Payment');
const { getSubscriptionStatus, successfulDebits, addMonthsIST } = require('../utils/airpayservice');

/**
 * Records one successful AutoPay debit against `sub` and extends its end date.
 * @returns {Promise<boolean>} true if this debit was new and applied
 */
async function applyRenewal(sub, { airpayTxnId, amount }) {
  if (!airpayTxnId) return false;
  // The first payment and every earlier renewal are already Payment rows.
  if (sub.airpayTxnId === String(airpayTxnId)) return false;
  if (await Payment.findOne({ airpayTxnId: String(airpayTxnId) })) return false;

  if (Math.abs(Number(amount) - sub.amount) > 0.01) {
    console.error(`[AutoPay] Renewal amount mismatch sub=${sub._id} expected=${sub.amount} got=${amount} txn=${airpayTxnId}`);
    return false;
  }

  try {
    await Payment.create({
      orderId:        `RN${airpayTxnId}`,
      userId:         sub.userId,
      subscriptionId: sub._id,
      plan:           sub.plan,
      amount:         sub.amount,
      currency:       sub.currency || 'INR',
      status:         'PAID',
      airpayTxnId:    String(airpayTxnId),
      isRenewal:      true,
      callbackProcessed:   true,
      callbackProcessedAt: new Date(),
      callbackStatus:      'RENEWAL_SUCCESS',
    });
  } catch (err) {
    // Duplicate key on orderId = a concurrent call already recorded this debit
    if (err && err.code === 11000) return false;
    throw err;
  }

  // One calendar month per debit (AirPay debits on the same date each month), from the
  // current end if still running, so access stays aligned with the debit dates.
  const now  = new Date();
  const from = sub.endDate && sub.endDate > now ? new Date(sub.endDate) : now;
  const base = addMonthsIST(from, 1);

  const update = { endDate: base };
  if (sub.status === 'cancelled') {
    // Debited after the user cancelled — they paid, so keep the period, but flag it.
    console.warn(`[AutoPay] Debit ${airpayTxnId} arrived for CANCELLED sub=${sub._id} — review for refund`);
  } else {
    update.status = 'active';
  }
  await Subscription.findByIdAndUpdate(sub._id, update);
  Object.assign(sub, update); // keep the in-memory copy current for the next debit in a sync loop
  console.log(`[AutoPay] Renewal applied sub=${sub._id} txn=${airpayTxnId} newEnd=${base.toISOString()}`);
  return true;
}

/**
 * Pulls AirPay's transaction history for a recurring subscription and applies any
 * successful debits we have not seen (covers renewals whose IPN never reached us).
 * @returns {Promise<number>} number of renewals applied
 */
async function syncRenewalsFromAirpay(sub) {
  if (!sub?.isRecurring || !sub.airpaySubscriptionId) return 0;
  const statusData = await getSubscriptionStatus(sub.airpaySubscriptionId);
  let applied = 0;
  for (const debit of successfulDebits(statusData)) {
    if (await applyRenewal(sub, debit)) applied += 1;
  }
  if (statusData.NEXT_TRAN_DATE && statusData.NEXT_TRAN_DATE !== 'NA') {
    await Subscription.findByIdAndUpdate(sub._id, { nextRunDate: String(statusData.NEXT_TRAN_DATE) });
  }
  return applied;
}

module.exports = { applyRenewal, syncRenewalsFromAirpay };
