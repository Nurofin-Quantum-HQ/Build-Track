const mongoose = require('mongoose');
const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  plan: {
    type: String,
    enum: ['starter', 'growth', 'pro', 'business', 'enterprise'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'failed', 'expired', 'cancelled'],
    default: 'pending',
  },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  airpayOrderId: { type: String },
  transactionId: { type: String },
  startDate: { type: Date },
  endDate: { type: Date },
}, { timestamps: true });
subscriptionSchema.index({ userId: 1, status: 1, endDate: -1 });
subscriptionSchema.index({ airpayOrderId: 1 }, { sparse: true });
module.exports = mongoose.model('Subscription', subscriptionSchema);
