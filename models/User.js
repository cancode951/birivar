const mongoose = require('mongoose');

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    university: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 160,
    },
    profilePicture: {
      type: String,
      default: 'https://ui-avatars.com/api/?background=0f172a&color=38bdf8&name=BV&size=256',
    },
    profileBanner: {
      type: String,
      default: 'https://dummyimage.com/1200x320/0f172a/38bdf8.png&text=BiriVar',
    },
    tier: {
      type: String,
      enum: ['free', 'pro', 'premium'],
      default: 'free',
    },
    // Yeni abonelik alanları (tier ile uyumlu tutulur)
    plan: {
      type: String,
      enum: ['free', 'pro', 'premium'],
      default: 'free',
      index: true,
    },
    aiMessageLimit: {
      type: Number,
      default: 5,
      min: 0,
    },
    analysisLimit: {
      type: Number,
      default: 3,
      min: 0,
    },
    subscriptionEndDate: {
      type: Date,
      default: null,
    },
    // AI Chat kota takibi
    aiUsage: {
      messagesToday: { type: Number, default: 0 },
      filesToday: { type: Number, default: 0 },
      totalFiles: { type: Number, default: 0 },
      lastResetDate: { type: String, default: null }, // YYYY-MM-DD
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);

