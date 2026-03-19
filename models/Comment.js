const mongoose = require('mongoose');

const { Schema } = mongoose;

const commentSchema = new Schema(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    parentComment: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Comment', commentSchema);

