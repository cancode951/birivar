const express = require('express');
const multer = require('multer');
const authMiddleware = require('../authMiddleware');
const {
  getUserById,
  updateAvatar,
  updateBio,
  updateBanner,
  searchUsers,
  updateProfile,
} = require('../controllers/userController');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

// PATCH /api/users/update-avatar (auth)
router.patch('/update-avatar', authMiddleware, upload.single('avatar'), updateAvatar);

// PATCH /api/users/update-banner (auth)
router.patch('/update-banner', authMiddleware, upload.single('banner'), updateBanner);

// PATCH /api/users/update-bio (auth)
router.patch('/update-bio', authMiddleware, updateBio);

// PATCH /api/users/update-profile (auth) - avatar + banner + text fields
router.patch(
  '/update-profile',
  authMiddleware,
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
  ]),
  updateProfile
);

// GET /api/users/search?q= (auth)
router.get('/search', authMiddleware, searchUsers);

// GET /api/users/:userId
router.get('/:userId', getUserById);

module.exports = router;

