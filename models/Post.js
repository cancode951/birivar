const mongoose = require('mongoose');

const { Schema } = mongoose;

const postSchema = new Schema(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Filtreleme için post üzerinde denormalize alanlar
    university: { type: String, default: null, index: true },
    department: { type: String, default: null, index: true },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    mediaUrl: {
      type: String,
    },
    upvotes: [
      { type: Schema.Types.ObjectId, ref: 'User' },
    ],
    category: {
      type: String,
      enum: ['uni', 'dept'],
      required: true,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    /** Kısa empatik AI yanıtı (paylaşım sonrası üretilir) */
    aiSuggestion: {
      type: String,
      default: '',
    },
    comments: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Comment',
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Post', postSchema);

