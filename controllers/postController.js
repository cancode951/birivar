const Post = require('../models/Post');

/** Anonim bayrağı (boolean veya yanlışlıkla string kayıtlar) */
const ANON_DB_VALUES = [true, 'true', 1, '1'];

function isDocAnonymous(doc) {
  const v = doc?.isAnonymous;
  return ANON_DB_VALUES.includes(v);
}

function sanitizePostForClient(doc) {
  const o = doc && typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  if (isDocAnonymous(o)) {
    o.author = {
      _id: null,
      username: 'Anonim',
      profilePicture: null,
      profileBanner: null,
      university: null,
      department: null,
      bio: null,
    };
    o.university = null;
    o.department = null;
  } else {
    o.aiSuggestion = '';
  }
  return o;
}

/** Herkese açık anonim duvar (kimlik sızmaz) */
async function getAnonymousPosts(req, res) {
  try {
    const limit = Math.min(Number(req.query.limit) || 80, 120);
    const posts = await Post.find({ isAnonymous: { $in: ANON_DB_VALUES } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const safe = posts.map((p) => {
      const o = { ...p };
      o.author = {
        _id: null,
        username: 'Anonim',
        profilePicture: null,
        profileBanner: null,
        university: null,
        department: null,
        bio: null,
      };
      o.university = null;
      o.department = null;
      return o;
    });

    return res.json(safe);
  } catch (error) {
    console.error('Anonim postlar:', error.message);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
}

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripLeadingHash(str) {
  return String(str || '').trim().replace(/^#/, '');
}

const TR_STOPWORDS = new Set([
  've',
  'veya',
  'ile',
  'ama',
  'fakat',
  'ancak',
  'ki',
  'de',
  'da',
  'bu',
  'şu',
  'o',
  'bir',
  'ben',
  'sen',
  'o',
  'biz',
  'siz',
  'onlar',
  'çok',
  'daha',
  'en',
  'gibi',
  'için',
  'neden',
  'nasıl',
  'ne',
  'mi',
  'mı',
  'mu',
  'mü',
  'var',
  'yok',
  'olarak',
  'şey',
  'şeyi',
  'şeyler',
  'kadar',
  'sonra',
  'önce',
  'şimdi',
  'her',
  'hiç',
  'bence',
]);

function tokenizeWords(text) {
  const t = String(text || '')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\p{L}\p{N}#\s_]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return [];
  return t.split(' ').filter(Boolean);
}

function formatCountTR(n) {
  try {
    return new Intl.NumberFormat('tr-TR').format(n);
  } catch {
    return String(n);
  }
}

function normalizeTurkish(str) {
  return String(str || '')
    .trim()
    .toLowerCase()
    .replaceAll('ç', 'c')
    .replaceAll('ğ', 'g')
    .replaceAll('ı', 'i')
    .replaceAll('İ', 'i')
    .replaceAll('ö', 'o')
    .replaceAll('ş', 's')
    .replaceAll('ü', 'u')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// GET /api/posts?university=&department=&q=
async function getPosts(req, res) {
  try {
    const { university, department, q } = req.query;

    const uni = typeof university === 'string' ? university.trim() : '';
    const dept = typeof department === 'string' ? department.trim() : '';
    const query = typeof q === 'string' ? q.trim() : '';

    const filter = {};
    if (query) {
      const bare = stripLeadingHash(query);
      filter.content = new RegExp(`#?${escapeRegExp(bare)}`, 'i');
    }

    const posts = await Post.find(filter)
      .populate('author', 'username university department profilePicture profileBanner bio')
      .sort({ createdAt: -1 });

    const wantUni = uni ? normalizeTurkish(uni) : '';
    const wantDept = dept ? normalizeTurkish(dept) : '';

    const filtered = posts.filter((p) => {
      const anon = isDocAnonymous(p);
      if (wantUni) {
        if (!anon) {
          const pUni = p?.university ?? p?.author?.university ?? '';
          if (normalizeTurkish(pUni) !== wantUni) return false;
        }
      }
      if (wantDept) {
        if (!anon) {
          const pDept = p?.department ?? p?.author?.department ?? '';
          if (normalizeTurkish(pDept) !== wantDept) return false;
        }
      }
      return true;
    });

    return res.json(filtered.map((p) => sanitizePostForClient(p)));
  } catch (error) {
    console.error('Postları çekerken hata:', error.message);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
}

// GET /api/posts/trending?university=&department=
async function getTrending(req, res) {
  try {
    const { university, department } = req.query;

    const filter = {};
    const uni = typeof university === 'string' ? university.trim() : '';
    const dept = typeof department === 'string' ? department.trim() : '';

    if (uni) filter.university = new RegExp(`^${escapeRegExp(uni)}$`, 'i');
    if (dept) filter.department = new RegExp(`^${escapeRegExp(dept)}$`, 'i');

    // Son 7 gün (gündem hissi için)
    const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);

    const rows = await Post.find({
      ...filter,
      createdAt: { $gte: since },
      isAnonymous: { $nin: ANON_DB_VALUES },
    })
      .select('content')
      .sort({ createdAt: -1 })
      .limit(800)
      .lean();

    const hashtagCounts = new Map();
    const wordCounts = new Map();

    for (const r of rows) {
      const parts = tokenizeWords(r?.content);
      for (const p of parts) {
        if (!p) continue;
        if (p.startsWith('#') && p.length >= 3) {
          const tag = `#${stripLeadingHash(p)}`;
          if (tag.length < 3) continue;
          hashtagCounts.set(tag, (hashtagCounts.get(tag) || 0) + 1);
        } else {
          const w = stripLeadingHash(p).toLowerCase();
          if (!w) continue;
          if (w.length < 4) continue;
          if (TR_STOPWORDS.has(w)) continue;
          wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
        }
      }
    }

    const useHashtags = hashtagCounts.size > 0;
    const source = useHashtags ? hashtagCounts : wordCounts;

    const subtitle = uni || dept ? 'Üniversitende popüler' : 'Türkiye tarihinde gündem';

    const items = [...source.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, count]) => ({
        subtitle,
        topic: useHashtags ? key : `#${key}`,
        count,
        countLabel: `${formatCountTR(count)} Paylaşım`,
      }));

    return res.json(items);
  } catch (error) {
    console.error('Trending çekerken hata:', error.message);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
}

module.exports = {
  getPosts,
  getTrending,
  getAnonymousPosts,
  sanitizePostForClient,
};

