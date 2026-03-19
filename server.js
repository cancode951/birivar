const express = require('express');
const cors = require('cors');
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const authMiddleware = require('./authMiddleware');
const optionalAuth = authMiddleware.optionalAuth;

// Modeller
const Post = require('./models/Post');
const Comment = require('./models/Comment');
const User = require('./models/User');
const {
  getPosts,
  getTrending,
  getAnonymousPosts,
  sanitizePostForClient,
} = require('./controllers/postController');
const { generateEmpathyReply, generateAnonymousDmMessage } = require('./lib/postEmpathyAi');
const {
  deliverSupportDm,
  migrateLegacySupportBotUsername,
} = require('./lib/supportBot');
const { consumeLimit } = require('./middleware/planLimits');

// Route dosyaları
const authRoutes = require('./authRoutes');
const aiRoutes = require('./aiRoutes');
const postRoutes = require('./routes/postRoutes');
const userRoutes = require('./routes/userRoutes');
const messageRoutes = require('./routes/messageRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const { stripeWebhook } = require('./controllers/subscriptionController');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH'],
  },
});
app.set('io', io);

// Middleware
app.use(cors());
// Stripe webhook raw body ister (json parse öncesi)
app.post('/api/subscriptions/webhook', express.raw({ type: 'application/json' }), stripeWebhook);
app.use(express.json());

// Veritabanına bağlan, bot kullanıcı adını güncelle, sonra dinle

// Basit test rotası
app.get('/', (req, res) => {
  res.json({ message: 'BiriVar API çalışıyor' });
});

// AUTH & AI ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// Socket.io: kullanıcı odası (room) = userId
io.on('connection', (socket) => {
  try {
    const userId = socket.handshake?.query?.userId;
    if (userId) {
      socket.join(String(userId));
    }
    // Handshake'ta userId yoksa veya yeniden giriş: istemci odasına katılsın
    socket.on('join_dm', (uid) => {
      if (uid) socket.join(String(uid));
    });
  } catch (e) {
    // ignore
  }
});

// POST ROUTES

// GET /api/posts — anonim paylaşımlar sadece yazarına (token ile); diğerleri ana akışta görmez
app.get('/api/posts', optionalAuth, getPosts);

// Anonim dertleşme duvarı (giriş gerekli; yanıtta kimlik yok)
app.get('/api/posts/anonymous', authMiddleware, getAnonymousPosts);

// GET /api/posts/trending - gündemdeki konular (post içeriklerinden)
app.get('/api/posts/trending', getTrending);

// GET /api/posts/user/:userId - bir kullanıcının postları (anonim paylaşımlar başkasının profilinde görünmez)
app.get('/api/posts/user/:userId', optionalAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const q = { author: userId };
    const viewerId = req.user?._id ? String(req.user._id) : '';
    if (!viewerId || viewerId !== String(userId)) {
      q.isAnonymous = { $nin: [true, 'true', 1, '1'] };
    }
    const posts = await Post.find(q)
      .populate('author', 'username university department profilePicture profileBanner bio')
      .populate('comments')
      .sort({ createdAt: -1 });

    const isOwner = viewerId && viewerId === String(userId);
    const out = posts.map((p) =>
      isOwner ? (p.toObject ? p.toObject() : p) : sanitizePostForClient(p)
    );
    res.json(out);
  } catch (error) {
    console.error('Kullanıcı postları çekerken hata:', error.message);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// POST /api/posts - sadece giriş yapmış kullanıcı post atabilir
app.post('/api/posts', authMiddleware, async (req, res) => {
  try {
    const { content, mediaUrl, category, isAnonymous, anonymous } = req.body;

    if (!content || !category) {
      return res
        .status(400)
        .json({ message: 'content ve category alanları zorunludur.' });
    }

    const rawAnon = isAnonymous ?? anonymous;
    const anon =
      rawAnon === true ||
      rawAnon === 1 ||
      rawAnon === '1' ||
      (typeof rawAnon === 'string' && rawAnon.toLowerCase() === 'true');

    const newPost = new Post({
      author: req.user._id,
      university: anon
        ? null
        : req.user.university
          ? String(req.user.university).trim()
          : null,
      department: anon
        ? null
        : req.user.department
          ? String(req.user.department).trim()
          : null,
      content,
      mediaUrl,
      category,
      isAnonymous: anon,
      aiSuggestion: '',
    });

    const savedPost = await newPost.save();

    let aiSuggestion = '';
    if (anon) {
      try {
        aiSuggestion = await generateEmpathyReply(content);
      } catch (e) {
        console.error('Empati AI:', e.message);
      }
      savedPost.aiSuggestion = aiSuggestion || '';
      await savedPost.save();
    }

    const populatedPost = await savedPost.populate(
      'author',
      'username profilePicture profileBanner university department bio'
    );

    res.status(201).json(sanitizePostForClient(populatedPost));

    if (anon) {
      const receiverId = req.user._id;
      const empathy = aiSuggestion || '';
      const postContent = content;
      setImmediate(() => {
        (async () => {
          try {
            const dmText = await generateAnonymousDmMessage(postContent, empathy);
            await deliverSupportDm(app, receiverId, dmText);
          } catch (e) {
            console.error('Anonim destek DM:', e?.message || e);
          }
        })();
      });
    }
  } catch (error) {
    console.error('Post oluştururken hata:', error.message);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET /api/posts/:id/comments (postRoutes'tan önce olmalı)
app.get('/api/posts/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const comments = await Comment.find({ post: id })
      .populate('author', 'username _id')
      .populate({ path: 'parentComment', populate: { path: 'author', select: 'username _id' } })
      .sort({ createdAt: 1 })
      .lean();

    res.json(comments);
  } catch (error) {
    console.error('Yorumlar çekerken hata:', error.message);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Post route'ları: PATCH /:id/upvote, POST /:id/comment
app.use('/api/posts', postRoutes);

// POST /api/posts/:id/analyze - post + yorumları AI ile analiz edip özet üret
app.post('/api/posts/:id/analyze', authMiddleware, consumeLimit('analysis'), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }

    const post = await Post.findById(id).populate(
      'author',
      'username university department'
    );
    if (!post) {
      return res.status(404).json({ message: 'Post bulunamadı.' });
    }

    const comments = await Comment.find({ post: id })
      .populate('author', 'username')
      .sort({ createdAt: 1 });

    const discussionText = [
      `Post Başlığı / İçeriği: ${post.content}`,
      `Yazar: ${post.author?.username || 'Anonim'} / ${
        post.author?.university || 'Üniversite yok'
      } - ${post.author?.department || 'Bölüm yok'}`,
      '',
      'Yorumlar:',
      ...comments.map((c, index) => {
        const authorName = c.author?.username || 'Anonim';
        return `${index + 1}. (${authorName}) ${c.text}`;
      }),
    ].join('\n');

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    let summary =
      'AI entegrasyonu için OPENAI_API_KEY tanımlanmadığı için örnek bir akademik özet döndürülüyor.';

    if (OPENAI_API_KEY) {
      const prompt = `Aşağıdaki üniversite odaklı sosyal platform tartışmasını oku ve akademik bir üslup ile kısa ama derinlikli bir "Akademik Özet" hazırla.\n\nOdak noktaları:\n- Ana problem / soru\n- Öne çıkan argümanlar ve karşı argümanlar\n- Uzman bakış açısıyla çıkarılabilecek dersler\n- Kısa sonuç paragrafı\n\nMetin:\n${discussionText}`;

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
                'Sen akademik yazım kurallarına hakim, öz ve net özetler çıkaran bir asistansın. Cevabını Türkçe ver.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
        }),
      });

      const data = await response.json();

      if (response.ok && data.choices && data.choices[0]?.message?.content) {
        summary = data.choices[0].message.content.trim();
      } else {
        console.error('OpenAI hata cevabı:', data);
      }
    }

    return res.json({
      summary,
      postId: post._id,
      remainingAnalysisLimit: req.remainingLimits?.analysisLimit ?? user.analysisLimit,
      title: 'AI Tartışma Akademik Özeti',
    });
  } catch (error) {
    console.error('Post analizi sırasında hata:', error.message);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
});

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectDB();
    await migrateLegacySupportBotUsername();
    server.listen(PORT, () => {
      console.log(`Sunucu ${PORT} portunda çalışıyor (BiriVar)`);
    });
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();

