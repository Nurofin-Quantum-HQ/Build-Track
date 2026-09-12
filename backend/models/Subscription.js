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

module.exports = mongoose.model('Subscription', subscriptionSchema);
