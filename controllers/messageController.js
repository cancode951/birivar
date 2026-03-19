const Message = require('../models/Message');
const mongoose = require('mongoose');

// POST /api/messages/send
async function sendMessage(req, res) {
  try {
    const sender = req.user?._id;
    const { receiver, text } = req.body || {};

    if (!sender) return res.status(401).json({ message: 'Yetkisiz.' });
    if (!receiver) return res.status(400).json({ message: 'receiver alanı zorunludur.' });
    if (!text || !String(text).trim()) return res.status(400).json({ message: 'text alanı zorunludur.' });

    const msg = await Message.create({
      sender,
      receiver,
      text: String(text).trim(),
    });

    const populated = await Message.findById(msg._id)
      .populate('sender', 'username profilePicture')
      .populate('receiver', 'username profilePicture')
      .lean();

    const io = req.app.get('io');
    if (io) {
      const receiverRoom = String(receiver);
      const senderRoom = String(sender);
      // Yeni event adı (istenen): receive_message
      io.to(receiverRoom).emit('receive_message', populated);
      io.to(senderRoom).emit('receive_message', populated);

      // Alıcı odaya bağlıysa (socket teslim) gönderene "iletilmiş" tik bilgisi gönder
      // (Tek odada receiver yoksa double gri tik göstermeyelim)
      const room = io.sockets?.adapter?.rooms?.get(receiverRoom);
      const receiverConnected = room && room.size > 0;
      if (receiverConnected) {
        io.to(senderRoom).emit('message_delivered', {
          messageId: String(msg._id),
          receiverId: String(receiver),
        });
      }
      // Geriye uyumluluk
      io.to(receiverRoom).emit('dm:new', populated);
      io.to(senderRoom).emit('dm:new', populated);
    }

    return res.status(201).json(populated);
  } catch (error) {
    console.error('Mesaj gönderme hatası:', error?.message || error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
}

// GET /api/messages/:userId  (iki kişi arasındaki geçmiş)
async function getConversation(req, res) {
  try {
    const me = req.user?._id;
    const other = req.params?.userId;
    if (!me) return res.status(401).json({ message: 'Yetkisiz.' });
    if (!other) return res.status(400).json({ message: 'userId zorunludur.' });

    const messages = await Message.find({
      $or: [
        { sender: me, receiver: other },
        { sender: other, receiver: me },
      ],
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'username profilePicture')
      .populate('receiver', 'username profilePicture')
      .lean();

    return res.json(messages);
  } catch (error) {
    console.error('Mesaj geçmişi hatası:', error?.message || error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
}

// PATCH /api/messages/mark-as-read  body: { userId: otherUserId }
async function markAsRead(req, res) {
  try {
    const me = req.user?._id;
    const other = req.body?.userId;
    if (!me) return res.status(401).json({ message: 'Yetkisiz.' });
    if (!other) return res.status(400).json({ message: 'userId zorunludur.' });

    // Okunmamış mesajların id listesini al (ikonları tekil mesaj bazında maviye çevirmek için)
    const unread = await Message.find({
      sender: other,
      receiver: me,
      isRead: false,
    })
      .select('_id')
      .lean();

    const messageIds = unread.map((d) => String(d._id));

    const result = await Message.updateMany(
      { sender: other, receiver: me, isRead: false },
      { $set: { isRead: true } }
    );

    const io = req.app.get('io');
    if (io && messageIds.length > 0) {
      // Gönderen tarafa: karşı okudu → double mavi tik
      io.to(String(other)).emit('messages_read', {
        readByUserId: String(me),
        messageIds,
      });
    }

    return res.json({ ok: true, modified: result.modifiedCount || 0 });
  } catch (error) {
    console.error('Mark-as-read hatası:', error?.message || error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
}

// GET /api/messages/unread-count
async function getUnreadCount(req, res) {
  try {
    const me = req.user?._id;
    if (!me) return res.status(401).json({ message: 'Yetkisiz.' });
    const count = await Message.countDocuments({ receiver: me, isRead: false });
    return res.json({ count });
  } catch (error) {
    console.error('Unread-count hatası:', error?.message || error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
}

// GET /api/messages/inbox  (konuşma listesi)
async function getInbox(req, res) {
  try {
    const me = req.user?._id;
    if (!me) return res.status(401).json({ message: 'Yetkisiz.' });

    const meId = new mongoose.Types.ObjectId(String(me));

    const rows = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: meId }, { receiver: meId }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $addFields: {
          otherUser: {
            $cond: [{ $eq: ['$sender', meId] }, '$receiver', '$sender'],
          },
        },
      },
      {
        $group: {
          _id: '$otherUser',
          lastMessageAt: { $first: '$createdAt' },
          lastText: { $first: '$text' },
          lastSender: { $first: '$sender' },
          lastReceiver: { $first: '$receiver' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$receiver', meId] }, { $eq: ['$isRead', false] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { lastMessageAt: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          user: {
            _id: '$user._id',
            username: '$user.username',
            profilePicture: '$user.profilePicture',
            profileBanner: '$user.profileBanner',
            bio: '$user.bio',
          },
          lastMessageAt: 1,
          lastText: 1,
          unreadCount: 1,
        },
      },
    ]);

    return res.json(rows);
  } catch (error) {
    console.error('Inbox hatası:', error?.message || error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
}

module.exports = {
  sendMessage,
  getConversation,
  getInbox,
  markAsRead,
  getUnreadCount,
};

