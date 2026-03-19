const express = require('express');
const authMiddleware = require('../authMiddleware');
const Post = require('../models/Post');
const Comment = require('../models/Comment');

const router = express.Router();

// PATCH /api/posts/:id/upvote - beğeni toggle (varsa çıkar, yoksa ekle)
router.patch('/:id/upvote', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: 'Post bulunamadı.' });
    }

    const upvotes = Array.isArray(post.upvotes) ? [...post.upvotes] : [];
    const hasVoted = upvotes.some((uid) => uid.toString() === userId.toString());

    if (hasVoted) {
      post.upvotes = upvotes.filter((uid) => uid.toString() !== userId.toString());
    } else {
      post.upvotes = [...upvotes, userId];
    }

    await post.save();

    const upvoteCount = Array.isArray(post.upvotes) ? post.upvotes.length : 0;
    const response = {
      upvotes: post.upvotes,
      upvoteCount,
    };
    return res.json(response);
  } catch (error) {
    console.error('Upvote hatası:', error.message);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// POST /api/posts/:id/comment - yorum ekle (text + author = req.user)
router.post('/:id/comment', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { text, parentCommentId } = req.body;
    const author = req.user._id;

    if (!text || !String(text).trim()) {
      return res.status(400).json({ message: 'Yorum metni zorunludur.' });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: 'Post bulunamadı.' });
    }

    if (!Array.isArray(post.comments)) {
      post.comments = [];
    }

    let parentComment = null;
    if (parentCommentId) {
      const parent = await Comment.findById(parentCommentId).select('post');
      if (!parent) {
        return res.status(400).json({ message: 'Parent yorum bulunamadı.' });
      }
      if (parent.post.toString() !== id.toString()) {
        return res.status(400).json({ message: 'Parent yorum bu posta ait değil.' });
      }
      parentComment = parentCommentId;
    }

    const comment = await Comment.create({
      post: id,
      author,
      text: String(text).trim(),
      parentComment,
    });

    post.comments.push(comment._id);
    await post.save();

    const populated = await Comment.findById(comment._id)
      .populate('author', 'username _id')
      .populate({ path: 'parentComment', populate: { path: 'author', select: 'username' } })
      .lean();

    return res.status(201).json(populated);
  } catch (error) {
    console.error('Yorum eklerken hata:', error.message);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;
