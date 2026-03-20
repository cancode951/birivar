const User = require('../models/User');
const { configCloudinary } = require('../config/cloudinary');
const streamifier = require('streamifier');
const mongoose = require('mongoose');

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET /api/users/:userId
async function getUserById(req, res) {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(String(userId))) {
      return res.status(400).json({ message: 'Geçersiz kullanıcı id.' });
    }

    const user = await User.findById(userId).select(
      'username university department bio profilePicture profileBanner tier'
    );

    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }

    return res.json(user);
  } catch (error) {
    console.error('Kullanıcı bilgisi hatası:', error.message);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
}

// PATCH /api/users/update-avatar (auth) - multer file: avatar
async function updateAvatar(req, res) {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Yetkisiz.' });

    if (!req.file) {
      return res.status(400).json({ message: 'Lütfen bir görsel dosyası seçin.' });
    }

    const mime = String(req.file.mimetype || '');
    if (!mime.startsWith('image/')) {
      return res.status(400).json({ message: 'Sadece görsel dosyaları kabul edilir.' });
    }

    const cloudinary = configCloudinary();

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'birivar/avatars',
          public_id: `user_${userId}_${Date.now()}`,
          resource_type: 'image',
          overwrite: true,
          transformation: [
            { width: 512, height: 512, crop: 'fill', gravity: 'face' },
            { quality: 'auto' },
            { fetch_format: 'auto' },
          ],
        },
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      );

      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    const secureUrl = uploadResult?.secure_url;
    if (!secureUrl) {
      return res.status(500).json({ message: 'Görsel yükleme başarısız oldu.' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { profilePicture: secureUrl },
      { new: true }
    ).select('username university department bio profilePicture profileBanner tier');

    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });

    return res.json({ profilePicture: user.profilePicture, user });
  } catch (error) {
    console.error('Avatar güncelleme hatası:', error?.message || error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
}

// PATCH /api/users/update-bio (auth)
async function updateBio(req, res) {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Yetkisiz.' });

    const bioRaw = typeof req.body?.bio === 'string' ? req.body.bio : '';
    const bio = bioRaw.trim();

    if (bio.length > 160) {
      return res.status(400).json({ message: 'Biyografi en fazla 160 karakter olmalı.' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { bio },
      { new: true }
    ).select('username university department bio profilePicture profileBanner tier');

    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });

    return res.json({ bio: user.bio, user });
  } catch (error) {
    console.error('Bio güncelleme hatası:', error?.message || error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
}

// PATCH /api/users/update-banner (auth) - multer file: banner
async function updateBanner(req, res) {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Yetkisiz.' });

    if (!req.file) {
      return res.status(400).json({ message: 'Lütfen bir görsel dosyası seçin.' });
    }

    const mime = String(req.file.mimetype || '');
    if (!mime.startsWith('image/')) {
      return res.status(400).json({ message: 'Sadece görsel dosyaları kabul edilir.' });
    }

    const cloudinary = configCloudinary();

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'birivar/banners',
          public_id: `banner_${userId}_${Date.now()}`,
          resource_type: 'image',
          overwrite: true,
          transformation: [
            { width: 1400, height: 420, crop: 'fill', gravity: 'auto' },
            { quality: 'auto' },
            { fetch_format: 'auto' },
          ],
        },
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    const secureUrl = uploadResult?.secure_url;
    if (!secureUrl) {
      return res.status(500).json({ message: 'Görsel yükleme başarısız oldu.' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { profileBanner: secureUrl },
      { new: true }
    ).select('username university department bio profilePicture profileBanner tier');

    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });

    return res.json({ profileBanner: user.profileBanner, user });
  } catch (error) {
    console.error('Banner güncelleme hatası:', error?.message || error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
}

// PATCH /api/users/update-profile (auth) - avatar + banner + text fields
async function updateProfile(req, res) {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Yetkisiz.' });

    const usernameRaw = typeof req.body?.username === 'string' ? req.body.username : '';
    const bioRaw = typeof req.body?.bio === 'string' ? req.body.bio : '';
    const universityRaw = typeof req.body?.university === 'string' ? req.body.university : '';
    const departmentRaw = typeof req.body?.department === 'string' ? req.body.department : '';

    const username = usernameRaw.trim();
    if (!username) return res.status(400).json({ message: 'İsim alanı zorunludur.' });

    const bio = bioRaw.trim();
    if (bio && bio.length > 160) {
      return res.status(400).json({ message: 'Biyografi en fazla 160 karakter olmalı.' });
    }

    const update = {
      username,
      bio,
      university: universityRaw.trim(),
      department: departmentRaw.trim(),
    };

    const uploadImage = async ({ file, folder, publicId, transformation }) => {
      const mime = String(file?.mimetype || '');
      if (!mime.startsWith('image/')) {
        throw new Error('Sadece görsel dosyaları kabul edilir.');
      }

      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            public_id: publicId,
            resource_type: 'image',
            overwrite: true,
            transformation,
          },
          (err, result) => {
            if (err) return reject(err);
            resolve(result);
          }
        );

        streamifier.createReadStream(file.buffer).pipe(stream);
      });

      const secureUrl = uploadResult?.secure_url;
      if (!secureUrl) throw new Error('Görsel yükleme başarısız oldu.');
      return secureUrl;
    };

    const avatarFile = req.files?.avatar?.[0];
    const bannerFile = req.files?.banner?.[0];

    // Sadece görsel güncellenmiyorsa Cloudinary env eksikliğinden dolayı patlamasın.
    const shouldUploadImages = Boolean(avatarFile || bannerFile);
    const cloudinary = shouldUploadImages ? configCloudinary() : null;

    if (avatarFile) {
      if (!cloudinary) throw new Error('Cloudinary yapılandırması eksik.');
      const secureUrl = await uploadImage({
        file: avatarFile,
        folder: 'birivar/avatars',
        publicId: `user_${userId}_${Date.now()}`,
        transformation: [
          { width: 512, height: 512, crop: 'fill', gravity: 'face' },
          { quality: 'auto' },
          { fetch_format: 'auto' },
        ],
      });
      update.profilePicture = secureUrl;
    }

    if (bannerFile) {
      if (!cloudinary) throw new Error('Cloudinary yapılandırması eksik.');
      const secureUrl = await uploadImage({
        file: bannerFile,
        folder: 'birivar/banners',
        publicId: `banner_${userId}_${Date.now()}`,
        transformation: [
          { width: 1400, height: 420, crop: 'fill', gravity: 'auto' },
          { quality: 'auto' },
          { fetch_format: 'auto' },
        ],
      });
      update.profileBanner = secureUrl;
    }

    const user = await User.findByIdAndUpdate(userId, update, { new: true }).select(
      'username university department bio profilePicture profileBanner tier'
    );

    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });

    return res.json({ user });
  } catch (error) {
    console.error('Update-profile hatası:', error?.message || error);
    return res.status(500).json({
      message: error?.message || 'Sunucu hatası',
    });
  }
}

// GET /api/users/search?q= (auth)
async function searchUsers(req, res) {
  try {
    const me = req.user?._id;
    if (!me) return res.status(401).json({ message: 'Yetkisiz.' });

    const q = typeof req.query?.q === 'string' ? req.query.q.trim() : '';
    if (!q) return res.json([]);

    const users = await User.find({
      username: new RegExp(escapeRegExp(q), 'i'),
      _id: { $ne: me },
    })
      .select('username profilePicture profileBanner bio')
      .limit(12)
      .lean();

    return res.json(users);
  } catch (error) {
    console.error('User search hatası:', error?.message || error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
}

// GET /api/users/referral/me
async function getReferralStatus(req, res) {
  try {
    const uid = req.user?._id;
    if (!uid) return res.status(401).json({ message: 'Yetkisiz.' });

    const user = await User.findById(uid).select(
      'referralCode referredCount referralRewardsGranted referralRewardPendingToast plan subscriptionEndDate'
    );
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });

    if (!user.referralCode) {
      user.referralCode = Math.random().toString(36).slice(2, 8).toUpperCase();
      await user.save();
    }

    const count = Number(user.referredCount || 0);
    const inCycle = count % 3;
    // Çevrim içi doluluk: 0 davette 0; 1–2 davette mod; her 3'te tam dolu (3, 6, 9…)
    const progress = inCycle === 0 && count > 0 ? 3 : inCycle;
    const remainingForNext = progress === 3 ? 0 : 3 - progress;
    const rewardUnlocked = Boolean(user.referralRewardPendingToast);

    if (user.referralRewardPendingToast) {
      user.referralRewardPendingToast = false;
      await user.save();
    }

    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
    const link = `${frontendBase}/register?ref=${user.referralCode}`;

    return res.json({
      referralCode: user.referralCode,
      referralLink: link,
      referredCount: count,
      progress,
      remainingForNext,
      rewardUnlocked,
      plan: user.plan || 'free',
      subscriptionEndDate: user.subscriptionEndDate || null,
    });
  } catch (error) {
    console.error('Referral status hatası:', error?.message || error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
}

module.exports = {
  getUserById,
  updateAvatar,
  updateBio,
  updateBanner,
  searchUsers,
  updateProfile,
  getReferralStatus,
};

