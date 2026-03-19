const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Message = require('../models/Message');

let cachedBotId = null;

/** Sunucu açılışında veya ilk DM öncesi: eski SmartCareDestek → BiriVarDestek */
async function migrateLegacySupportBotUsername() {
  const hasNew = await User.exists({ username: 'BiriVarDestek' });
  if (hasNew) return;
  const legacy = await User.findOne({ username: 'SmartCareDestek' });
  if (!legacy) return;
  legacy.username = 'BiriVarDestek';
  legacy.bio = 'BiriVar otomatik destek (yapay zekâ). Bu hesaba yanıt gerekmez.';
  try {
    await legacy.save();
    console.log(
      '[BiriVar] Destek hesabı BiriVarDestek olarak güncellendi (eski: SmartCareDestek).'
    );
  } catch (e) {
    console.error('[BiriVar] Bot kullanıcı adı güncellenemedi:', e.message);
  }
}

async function getSupportBotUserId() {
  if (cachedBotId) return cachedBotId;
  const envId =
    process.env.BIRIVAR_BOT_USER_ID || process.env.SMARTCARE_BOT_USER_ID;
  if (envId && mongoose.Types.ObjectId.isValid(envId)) {
    cachedBotId = String(envId);
    return cachedBotId;
  }
  await migrateLegacySupportBotUsername();

  let bot = await User.findOne({ username: 'BiriVarDestek' }).select('_id').lean();
  if (!bot) {
    bot = await User.findOne({ username: 'SmartCareDestek' }).select('_id').lean();
  }
  if (!bot) {
    const hash = await bcrypt.hash(`bot-${Date.now()}-${Math.random()}`, 10);
    const created = await User.create({
      username: 'BiriVarDestek',
      email: `birivar-destek-${Date.now()}@internal.birivar`,
      password: hash,
      bio: 'BiriVar otomatik destek (yapay zekâ). Bu hesaba yanıt gerekmez.',
    });
    bot = { _id: created._id };
    console.log('[BiriVar] BiriVarDestek bot kullanıcısı oluşturuldu.');
  }
  cachedBotId = String(bot._id);
  return cachedBotId;
}

async function deliverSupportDm(app, receiverId, text) {
  const body = String(text || '').trim().slice(0, 4000);
  if (!body || !mongoose.Types.ObjectId.isValid(String(receiverId))) return;

  const botId = await getSupportBotUserId();
  const msg = await Message.create({
    sender: botId,
    receiver: receiverId,
    text: body,
  });

  const populated = await Message.findById(msg._id)
    .populate('sender', 'username profilePicture')
    .populate('receiver', 'username profilePicture')
    .lean();

  const io = app.get('io');
  if (io) {
    const r = String(receiverId);
    const b = String(botId);
    io.to(r).emit('receive_message', populated);
    io.to(b).emit('receive_message', populated);
    io.to(r).emit('dm:new', populated);
    io.to(b).emit('dm:new', populated);
    const room = io.sockets?.adapter?.rooms?.get(r);
    if (room && room.size > 0) {
      io.to(b).emit('message_delivered', {
        messageId: String(msg._id),
        receiverId: r,
      });
    }
  }
}

module.exports = {
  getSupportBotUserId,
  deliverSupportDm,
  migrateLegacySupportBotUsername,
};
