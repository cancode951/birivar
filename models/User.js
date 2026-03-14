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
      maxlength: 500,
    },
    profilePicture: {
      type: String,
    },
    tier: {
      type: String,
      enum: ['free', 'pro', 'premium'],
      default: 'free',
    },
    dailyAiLimit: {
      type: Number,
      default: 1,
    },
    dailyPdfLimit: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);

