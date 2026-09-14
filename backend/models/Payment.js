const mongoose = require('mongoose');

/**
 * Payment — source of truth for each payment attempt.
 * Created at initiation (PENDING), updated by callback.
 * Idempotency: callbackProcessed prevents duplicate activation.
 */
const paymentSchema = new mongoose.Schema({
  orderId:        { type: String, required: true, unique: true, index: true },
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  plan:           { type: String, required: true },
  amount:         { type: Number, required: true },
  currency:       { type: String, default: 'INR' },

  status: {
    type: String,
    enum: ['PENDING', 'PAID', 'FAILED'],
    default: 'PENDING',
  },

  // Airpay identifiers (set after callback)
  airpayTxnId:  { type: String },
  secureHash:   { type: String },

  // Idempotency
  callbackProcessed:   { type: Boolean, default: false },
  callbackProcessedAt: { type: Date },

  // Audit — store callback status text for debugging (no sensitive fields)
  callbackStatus: { type: String },
}, { timestamps: true });

paymentSchema.index({ userId: 1, status: 1 });
paymentSchema.index({ callbackProcessed: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
