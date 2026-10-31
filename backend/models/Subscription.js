const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  plan: {
    type: String,
    enum: ['free', 'starter', 'growth', 'pro', 'business', 'enterprise', 'custom'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'failed', 'expired', 'cancelled'],
    default: 'pending',
  },
  amount:   { type: Number, required: true },
  currency: { type: String, default: 'INR' },

  // Airpay identifiers
  airpayOrderId:     { type: String },
  airpayTxnId:       { type: String }, // ap_transactionid from Airpay

  // AutoPay (txnsubtype 12) — set from the first successful callback
  isRecurring:          { type: Boolean, default: false },
  airpaySubscriptionId: { type: String },               // AirPay subscription_id
  nextRunDate:          { type: String },               // subscription_next_rundate as sent by AirPay
  airpayUnsubscribe: {                                  // result of Manage Subscription "U" on cancel
    status:  { type: String },
    message: { type: String },
    at:      { type: Date },
  },

  // Activation dates (set only after verified successful payment)
  startDate: { type: Date },
  endDate:   { type: Date },

  // Idempotency / audit
  callbackProcessed:   { type: Boolean, default: false },
  callbackReceivedAt:  { type: Date },
  callbackStatus:      { type: String }, // raw status string from Airpay response

  // Legacy field kept for backward-compat reads
  transactionId: { type: String },
}, { timestamps: true });

subscriptionSchema.index({ userId: 1, status: 1, endDate: -1 });
subscriptionSchema.index({ airpayOrderId: 1 }, { sparse: true });
subscriptionSchema.index({ airpaySubscriptionId: 1 }, { sparse: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
