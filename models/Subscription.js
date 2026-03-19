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
      required: true,
      trim: true,
    },
    stripeSessionId: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['active', 'expired'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);

