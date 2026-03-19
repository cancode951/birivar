const jwt = require('jsonwebtoken');
require('dotenv').config();

const User = require('./models/User');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET ortam değişkeni tanımlı değil.');
}

/** Token varsa req.user doldurur; yoksa veya geçersizse 401 dönmez, devam eder. */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (user) req.user = user;
  } catch {
    // yoksay
  }
  next();
};

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Yetkisiz erişim. Token bulunamadı.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Geçersiz token.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth hatası:', error.message);
    return res.status(401).json({ message: 'Geçersiz veya süresi dolmuş token.' });
  }
};

module.exports = authMiddleware;
module.exports.optionalAuth = optionalAuth;

