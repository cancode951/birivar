const User = require('./models/User');

function getTodayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getTierLimits(tier) {
  // Free: günlük 5 mesaj, toplam 2 dosya
  // Pro: sınırsız mesaj, günlük 10 dosya
  // Premium: sınırsız mesaj, sınırsız dosya
  if (tier === 'premium') {
    return { dailyMessages: Infinity, dailyFiles: Infinity, totalFiles: Infinity };
  }
  if (tier === 'pro') {
    return { dailyMessages: Infinity, dailyFiles: 10, totalFiles: Infinity };
  }
  return { dailyMessages: 5, dailyFiles: Infinity, totalFiles: 2 };
}

function ensureDailyReset(user) {
  const today = getTodayKey();
  if (!user.aiUsage) user.aiUsage = {};
  if (user.aiUsage.lastResetDate !== today) {
    user.aiUsage.messagesToday = 0;
    user.aiUsage.filesToday = 0;
    user.aiUsage.lastResetDate = today;
  }
}

// POST /api/ai/ask (eski endpoint - geriye uyumluluk)
const askAI = async (req, res) => {
  try {
    const userId = req.user && req.user._id;

    if (!userId) {
      return res.status(401).json({ message: 'Yetkisiz erişim.' });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }

    // Eski endpointi koruyoruz ama yeni limit mantığına bağlıyoruz (free için günlük 5 mesaj)
    ensureDailyReset(user);
    const limits = getTierLimits(user.tier);
    if (user.aiUsage.messagesToday >= limits.dailyMessages) {
      return res.status(403).json({ message: 'Günlük mesaj limitin doldu, Pro\'ya geç' });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    let result = {
      etyoloji: '',
      semptomlar: '',
      tanilar: [],
      amaclar: [],
      girisimler: [],
    };

    if (OPENAI_API_KEY) {
      const { vakaVerisi } = req.body;

      const prompt = `Sana verilen vaka verilerinden; Etyoloji, Semptomlar, NANDA uyumlu Hemşirelik Tanıları, NOC uyumlu Amaçlar ve NIC uyumlu Hemşirelik Girişimleri oluştur. Yanıtı mutlaka şu JSON formatında ver:
{ "etyoloji": "", "semptomlar": "", "tanilar": [], "amaclar": [], "girisimler": [] }

Vaka verisi:
${vakaVerisi || ''}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [
            {
              role: 'system',
              content:
                'Sen klinik hemşirelik bakım planları konusunda uzman bir asistansın. Cevabını sadece geçerli JSON olarak döndür. Açıklama veya ek metin yazma.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.4,
        }),
      });

      const data = await response.json();

      if (response.ok && data.choices && data.choices[0]?.message?.content) {
        try {
          result = JSON.parse(data.choices[0].message.content);
        } catch (e) {
          console.error('AI JSON parse hatası:', e);
        }
      } else {
        console.error('OpenAI hata cevabı:', data);
        const errMsg = data?.error?.message || '';
        const isQuota = errMsg.includes('quota') || data?.error?.code === 'insufficient_quota';
        return res.status(503).json({
          message: isQuota
            ? 'OpenAI kotanız dolmuş veya ödeme gerekli. Lütfen platform.openai.com üzerinden hesabınızı ve faturalandırmayı kontrol edin.'
            : 'AI servisi şu an yanıt veremiyor. Lütfen daha sonra tekrar deneyin.',
        });
      }
    }

    // Sadece başarılı yanıtta mesaj say
    user.aiUsage.messagesToday += 1;
    await user.save();

    return res.json({
      plan: result,
      tier: user.tier,
      remainingDailyAiLimit:
        limits.dailyMessages === Infinity ? Infinity : Math.max(0, limits.dailyMessages - user.aiUsage.messagesToday),
      message: 'AI isteği başarıyla işlendi.',
    });
  } catch (error) {
    console.error('AI isteği sırasında hata:', error.message);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
};

// POST /api/ai/chat
const chat = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ message: 'Yetkisiz erişim.' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });

    ensureDailyReset(user);
    const limits = getTierLimits(user.tier);

    const { message, file } = req.body || {};
    if (!message || !String(message).trim()) {
      return res.status(400).json({ message: 'message alanı zorunludur.' });
    }

    const isFileAttached = !!file;
    if (limits.dailyMessages !== Infinity && user.aiUsage.messagesToday >= limits.dailyMessages) {
      return res.status(403).json({ message: 'Günlük mesaj limitin doldu.' });
    }
    if (isFileAttached) {
      if (limits.dailyFiles !== Infinity && user.aiUsage.filesToday >= limits.dailyFiles) {
        return res.status(403).json({ message: 'Günlük dosya yükleme limitin doldu.' });
      }
      if (limits.totalFiles !== Infinity && user.aiUsage.totalFiles >= limits.totalFiles) {
        return res.status(403).json({ message: 'Toplam dosya yükleme limitin doldu.' });
      }
    }

    const systemPrompt =
      "Sen çok yönlü bir akademik asistansın. Kullanıcının yüklediği dosyaları analiz edebilir, sorularını yanıtlayabilir ve onlara her konuda yardımcı olabilirsin. Yanıtların profesyonel, yapıcı ve bilgilendirici olsun.";

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    let assistantMessage =
      'AI servisi şu an yapılandırılmadı. Mesajın alındı ve UI akışı çalışıyor.';

    if (OPENAI_API_KEY) {
      const contentParts = [
        { type: 'text', text: String(message).trim() },
      ];
      if (file && file.name && file.mimeType && file.base64) {
        contentParts.push({
          type: 'text',
          text: `\n\n[Dosya eklendi: ${file.name} (${file.mimeType})]`,
        });
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: contentParts.map((p) => p.text).join('') },
          ],
          temperature: 0.6,
        }),
      });
      const data = await response.json();
      if (response.ok && data.choices?.[0]?.message?.content) {
        assistantMessage = data.choices[0].message.content.trim();
      } else {
        console.error('OpenAI hata cevabı:', data);
        return res.status(503).json({
          message: data?.error?.message || 'AI servisi şu an yanıt veremiyor.',
        });
      }
    }

    user.aiUsage.messagesToday += 1;
    if (isFileAttached) {
      user.aiUsage.filesToday += 1;
      user.aiUsage.totalFiles += 1;
    }
    await user.save();

    return res.json({
      reply: assistantMessage,
      usage: user.aiUsage,
      limits,
    });
  } catch (error) {
    console.error('AI chat hatası:', error.message);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
};

module.exports = {
  askAI,
  chat,
};

