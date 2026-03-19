const User = require('../models/User');

/**
 * Kullanıcının ilgili limitini 1 düşürür.
 * type: 'ai' | 'analysis'
 */
function consumeLimit(type) {
  return async (req, res, next) => {
    try {
      const uid = req.user?._id;
      if (!uid) return res.status(401).json({ message: 'Yetkisiz erişim.' });

      const user = await User.findById(uid);
      if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });

      const field = type === 'analysis' ? 'analysisLimit' : 'aiMessageLimit';
      const remain = Number(user[field] || 0);
      if (remain <= 0) {
        return res.status(403).json({
          message: 'Limitiniz doldu, bir üst pakete geçmek ister misiniz?',
          limitType: field,
          upgradeRequired: true,
        });
      }

      user[field] = remain - 1;
      await user.save();

      req.limitUser = user;
      req.remainingLimits = {
        aiMessageLimit: Number(user.aiMessageLimit || 0),
        analysisLimit: Number(user.analysisLimit || 0),
      };

      return next();
    } catch (error) {
      console.error('Limit middleware hatası:', error.message);
      return res.status(500).json({ message: 'Sunucu hatası' });
    }
  };
}

module.exports = { consumeLimit };
