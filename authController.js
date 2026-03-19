const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const User = require('./models/User');
const sendEmail = require('./utils/sendEmail');
const { applyPlanLimits } = require('./lib/subscriptionPlans');

const JWT_SECRET = process.env.JWT_SECRET;
const RESET_PASSWORD_SECRET = process.env.RESET_PASSWORD_SECRET || JWT_SECRET;
const FORGOT_COOLDOWN_MS = 60 * 1000;
const forgotAttemptsByIp = new Map();

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET ortam değişkeni tanımlı değil.');
}

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { username, email, password, university, department } = req.body;

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ message: 'username, email ve password alanları zorunludur.' });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ message: 'Bu email veya kullanıcı adı zaten kullanılıyor.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      university,
      department,
      tier: 'free',
      plan: 'free',
      aiMessageLimit: 5,
      analysisLimit: 3,
      aiUsage: { messagesToday: 0, filesToday: 0, totalFiles: 0, lastResetDate: null },
    });

    const userWithoutPassword = user.toObject();
    delete userWithoutPassword.password;

    return res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error('Kayıt sırasında hata:', error.message);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'email ve password alanları zorunludur.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Geçersiz email veya şifre.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Geçersiz email veya şifre.' });
    }

    // İstekte belirtildiği gibi girişte plan limitleri yenilenir
    applyPlanLimits(user, user.plan || user.tier || 'free');
    await user.save();

    const token = jwt.sign(
      {
        id: user._id,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userWithoutPassword = user.toObject();
    delete userWithoutPassword.password;

    return res.json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error('Giriş sırasında hata:', error.message);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'email alanı zorunludur.' });
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const now = Date.now();
    const last = forgotAttemptsByIp.get(ip) || 0;
    if (now - last < FORGOT_COOLDOWN_MS) {
      const waitSec = Math.ceil((FORGOT_COOLDOWN_MS - (now - last)) / 1000);
      return res.status(429).json({
        message: `Cok hizli istek gonderildi. Lutfen ${waitSec} saniye sonra tekrar dene.`,
      });
    }
    forgotAttemptsByIp.set(ip, now);

    const genericMessage =
      'Eger bu e-posta adresi kayitliysa sifre sifirlama linki gonderilecektir.';

    const user = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (!user) {
      // Hesap var/yok bilgisini disariya vermeyelim
      return res.json({ message: genericMessage });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, type: 'password_reset' },
      RESET_PASSWORD_SECRET,
      { expiresIn: '15m' }
    );

    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendBase}/reset-password/${token}`;

    try {
      await sendEmail({
        to: user.email,
        subject: 'BiriVar - Sifre Sifirlama',
        text: `Sifreni sifirlamak icin bu linke tikla: ${resetLink} (15 dakika gecerli). Bu islemi sen yapmadiysan bu mesaji yok sayabilirsin.`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2 style="margin:0 0 8px;">BiriVar Sifre Sifirlama</h2>
            <p style="margin:0 0 10px;">Sifreni sifirlamak icin asagidaki baglantiya tikla:</p>
            <p style="margin:0 0 10px;">
              <a href="${resetLink}" target="_blank" rel="noreferrer">${resetLink}</a>
            </p>
            <p style="margin:0 0 8px;">Bu link <strong>15 dakika</strong> gecerlidir.</p>
            <p style="margin:0;color:#6b7280;">Bu islemi sen yapmadiysan bu mesaji yok sayabilirsin.</p>
          </div>
        `,
      });
    } catch (mailErr) {
      // Kullanıcıya yine genel başarı mesajı dönelim, ayrıntıyı loglayalım
      console.error('Forgot password mail gonderim hatasi:', mailErr.message);
    }

    return res.json({ message: genericMessage });
  } catch (error) {
    console.error('Forgot password hatası:', error.message);
    return res.status(500).json({ message: 'Islem tamamlanamadi. Lutfen daha sonra tekrar dene.' });
  }
};

// POST /api/auth/reset-password/:token
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Token zorunludur.' });
    }
    if (!password || String(password).length < 6) {
      return res.status(400).json({ message: 'Yeni sifre en az 6 karakter olmali.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, RESET_PASSWORD_SECRET);
    } catch {
      return res.status(400).json({ message: 'Gecersiz veya suresi dolmus token.' });
    }

    if (decoded?.type !== 'password_reset' || !decoded?.id) {
      return res.status(400).json({ message: 'Gecersiz token tipi.' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'Kullanici bulunamadi.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(String(password), salt);
    await user.save();

    return res.json({ message: 'Sifre basariyla guncellendi.' });
  } catch (error) {
    console.error('Reset password hatası:', error.message);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
};

