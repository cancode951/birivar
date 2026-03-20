const mongoose = require('mongoose');

const { Schema } = mongoose;

const subscriptionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    plan: {
      type: String,
      enum: ['free', 'pro', 'premium'],
      required: true,
      trim: true,
    },
    /** Stripe Checkout Session id — sadece Stripe ödemelerinde set edilir */
    stripeSessionId: {
      type: String,
      sparse: true,
      unique: true,
    },
    /** Iyzico CheckoutForm conversationId */
    iyzicoConversationId: {
      type: String,
      sparse: true,
      unique: true,
    },
    /** Iyzico oturum token (callback eşlemesi) */
    iyzicoPaymentToken: {
      type: String,
      sparse: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'expired', 'failed'],
      default: 'pending',
    },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'TRY' },
    paymentProvider: { type: String, default: 'stripe' },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
