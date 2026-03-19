import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Send, Plus, Search, ArrowLeft, X, Check, CheckCheck } from 'lucide-react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { connectSocket } from '../lib/socket';
import { useUnreadMessages } from '../context/UnreadMessagesContext';
import PullToRefresh from 'react-pull-to-refresh';
import { MessageRowSkeleton, ChatBubbleSkeleton } from '../components/skeletons/MessageSkeleton';
import toast from 'react-hot-toast';

const api = axios.create({ baseURL: '' });
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const t = localStorage.getItem('token');
    if (t) config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

function formatTimeTR(date) {
  try {
    return new Date(date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

/** DB'de hâlâ SmartCareDestek olsa bile arayüzde BiriVar */
const SUPPORT_BOT_USERNAMES = new Set(['smartcaredestek', 'birivardestek']);

function displayChatPartnerName(username) {
  if (!username) return 'Kullanıcı';
  if (SUPPORT_BOT_USERNAMES.has(String(username).toLowerCase())) {
    return 'BiriVar Destek';
  }
  return username;
}

function displayChatPartnerInitial(username) {
  if (SUPPORT_BOT_USERNAMES.has(String(username || '').toLowerCase())) {
    return 'B';
  }
  return (username || 'U').charAt(0).toUpperCase();
}

export default function Messages() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preselectUserId = params.get('userId');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [inbox, setInbox] = useState([]); // [{ user, lastText, lastMessageAt }]
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const listEndRef = useRef(null);
  const selectedUserIdRef = useRef('');
  const { refreshUnread } = useUnreadMessages();
  // Mine (gönderdiğim) mesajlarda "iletilme" (double gri tik) için
  const [deliveredMap, setDeliveredMap] = useState({}); // { [messageId]: true }

  const [newModalOpen, setNewModalOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState('');

  const selectedUserId = selectedUser?._id ? String(selectedUser._id) : '';
  selectedUserIdRef.current = selectedUserId;
  const isChatOpen = Boolean(selectedUserId);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch {
        setCurrentUser(null);
      }
    }
  }, [navigate]);

  const loadInbox = async () => {
    try {
      setLoadingInbox(true);
      const res = await api.get('/api/messages/inbox');
      setInbox(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setInbox([]);
    } finally {
      setLoadingInbox(false);
    }
  };

  const refreshInbox = async () => {
    try {
      const res = await api.get('/api/messages/inbox');
      setInbox(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      toast.error('Mesajlar yenilenemedi.');
    }
  };

  useEffect(() => {
    loadInbox();
  }, []);

  const runUserSearch = async (q) => {
    const qq = String(q || '').trim();
    if (!qq) {
      setSearchResults([]);
      return;
    }
    try {
      setSearchLoading(true);
      setSearchError('');
      const res = await api.get('/api/users/search', { params: { q: qq } });
      setSearchResults(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setSearchError(e?.response?.data?.message || 'Arama yapılamadı.');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    if (!newModalOpen) return;
    const t = setTimeout(() => runUserSearch(searchQ), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQ, newModalOpen]);

  const loadConversation = async (otherId) => {
    if (!otherId) return;
    try {
      setLoadingChat(true);
      setError('');
      const res = await api.get(`/api/messages/${otherId}`);
      const data = Array.isArray(res.data) ? res.data : [];
      setMessages(data);

      // Geçmiş konuşmada zaten bulunuyorsa (sender'a ulaştı kabulü),
      // tikleri "iletilmiş" varsayalım (okundu bilgisi ayrı m.isRead ile gelir).
      let meId = '';
      try {
        const u = JSON.parse(localStorage.getItem('user') || 'null');
        meId = u?._id ? String(u._id) : '';
      } catch {
        meId = '';
      }
      if (meId) {
        setDeliveredMap((prev) => {
          const next = { ...prev };
          data.forEach((m) => {
            const mid = String(m?._id ?? '');
            if (!mid) return;
            const senderId = String(m?.sender?._id ?? m?.sender ?? '');
            if (senderId === meId) next[mid] = true;
          });
          return next;
        });
      }
      // Sohbet açılınca karşı tarafın gönderdiği mesajları okundu yap
      await api.patch('/api/messages/mark-as-read', { userId: otherId });
      refreshUnread();
      setInbox((prev) =>
        prev.map((row) =>
          String(row.user?._id) === String(otherId) ? { ...row, unreadCount: 0 } : row
        )
      );
    } catch (e) {
      setError(e?.response?.data?.message || 'Mesajlar yüklenemedi.');
      setMessages([]);
    } finally {
      setLoadingChat(false);
    }
  };

  // URL ile preselect (profilde Mesaj At)
  useEffect(() => {
    if (!preselectUserId) return;
    const found = inbox.find((x) => String(x.user?._id) === String(preselectUserId));
    if (found?.user) {
      setSelectedUser(found.user);
      loadConversation(found.user._id);
      return;
    }
    // inbox'ta yoksa minimum user objesiyle seç (isim sonradan listeye girer)
    setSelectedUser({ _id: preselectUserId, username: 'Kullanıcı' });
    loadConversation(preselectUserId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectUserId, inbox]);

  // Açık sohbet / mesaj sayısı değişince en alta kaydır
  useEffect(() => {
    if (!selectedUserId || loadingChat) return;
    const t = window.setTimeout(() => {
      listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => window.clearTimeout(t);
  }, [messages.length, selectedUserId, loadingChat]);

  // Socket: selectedUserId ref ile güncel sohbet (yeniden abonelikten kaçın)
  useEffect(() => {
    if (!currentUser?._id) return;
    const meId = String(currentUser._id);
    const s = connectSocket({ userId: currentUser._id });
    s.emit('join_dm', meId);

    const onNew = (raw) => {
      const msg = raw && typeof raw === 'object' ? { ...raw } : raw;
      if (!msg?._id) return;
      const senderId = String(msg?.sender?._id ?? msg?.sender ?? '');
      const receiverId = String(msg?.receiver?._id ?? msg?.receiver ?? '');
      const other =
        senderId === meId
          ? typeof msg.receiver === 'object'
            ? msg.receiver
            : { _id: receiverId }
          : typeof msg.sender === 'object'
            ? msg.sender
            : { _id: senderId };
      if (!other?._id) return;

      const oid = String(other._id);
      const openId = selectedUserIdRef.current ? String(selectedUserIdRef.current) : '';
      const chatOpen = openId && oid === openId;
      const isIncomingToMe = receiverId === meId && senderId !== meId;

      setInbox((prev) => {
        const rest = prev.filter((x) => String(x.user?._id) !== oid);
        const prevRow = prev.find((x) => String(x.user?._id) === oid);
        let unread = Number(prevRow?.unreadCount) || 0;
        if (isIncomingToMe) {
          unread = chatOpen ? 0 : unread + 1;
        }
        const userObj =
          typeof other === 'object' && other.username != null
            ? other
            : { ...prevRow?.user, _id: other._id, username: prevRow?.user?.username || 'Kullanıcı' };
        return [
          {
            user: userObj,
            lastText: msg?.text || '',
            lastMessageAt: msg?.createdAt,
            unreadCount: unread,
          },
          ...rest,
        ];
      });

      if (chatOpen) {
        setMessages((prev) => {
          const mid = String(msg._id);
          if (prev.some((m) => String(m._id) === mid)) return prev;
          return [...prev, msg];
        });
        if (isIncomingToMe) {
          api.patch('/api/messages/mark-as-read', { userId: openId }).catch(() => {});
          refreshUnread();
        }
      } else if (isIncomingToMe) {
        refreshUnread();
      }
    };

    const onMessagesReadRefined = ({ readByUserId, messageIds } = {}) => {
      const openId = selectedUserIdRef.current ? String(selectedUserIdRef.current) : '';
      if (!openId) return;
      if (!readByUserId || String(readByUserId) !== openId) return;
      if (!Array.isArray(messageIds) || messageIds.length === 0) return;
      const idSet = new Set(messageIds.map((x) => String(x)));

      setMessages((prev) => prev.map((m) => (idSet.has(String(m?._id)) ? { ...m, isRead: true } : m)));
      setDeliveredMap((prev) => {
        const next = { ...prev };
        messageIds.forEach((id) => {
          const mid = String(id);
          if (mid) next[mid] = true;
        });
        return next;
      });
    };

    const onDelivered = ({ messageId } = {}) => {
      if (!messageId) return;
      const mid = String(messageId);
      setDeliveredMap((prev) => (prev[mid] ? prev : { ...prev, [mid]: true }));
    };

    s.on('receive_message', onNew);
    s.on('messages_read', onMessagesReadRefined);
    s.on('message_delivered', onDelivered);
    return () => {
      s.off('receive_message', onNew);
      s.off('messages_read', onMessagesReadRefined);
      s.off('message_delivered', onDelivered);
    };
  }, [currentUser?._id, refreshUnread]);

  const send = async () => {
    if (!selectedUserId) return;
    const clean = text.trim();
    if (!clean) return;
    if (sending) return;

    try {
      setSending(true);
      setError('');
      setText('');

      const res = await api.post('/api/messages/send', {
        receiver: selectedUserId,
        text: clean,
      });

      // Socket zaten receive_message ile gelecek; ama hızlı UX için ekleyelim (duplicate'i engellemek için id kontrolü)
      const msg = res.data;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?._id && msg?._id && String(last._id) === String(msg._id)) return prev;
        return [...prev, msg];
      });
      requestAnimationFrame(() => listEndRef.current?.scrollIntoView({ behavior: 'smooth' }));
      toast.success('Mesaj gönderildi.');
    } catch (e) {
      setError(e?.response?.data?.message || 'Mesaj gönderilemedi.');
      setText(clean);
      toast.error(e?.response?.data?.message || 'Mesaj gönderilemedi.');
    } finally {
      setSending(false);
    }
  };

  const headerUser = useMemo(() => {
    const u = selectedUser;
    if (!u) return null;
    return {
      name: displayChatPartnerName(u.username),
      avatar: u.profilePicture || '',
    };
  }, [selectedUser]);

  const chatPanelHeight = 'h-[calc(100vh-160px)] max-h-[calc(100vh-160px)]';

  return (
    <div className="h-dvh max-h-dvh flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      <Navbar
        user={currentUser}
        title="BiriVar"
        onMenuClick={() => setDrawerOpen((v) => !v)}
      />

      {/* Mobil drawer overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobil drawer */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full w-[80vw] max-w-[80vw] bg-slate-900 border-r border-slate-800 shadow-xl transition-transform duration-300 ease-out lg:hidden flex flex-col ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <span className="text-sm font-semibold text-slate-200">Menü</span>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
            aria-label="Menüyü kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div
          className="flex-1 p-4 overflow-y-auto sc-scroll"
          onClick={(e) => {
            if (e.target?.closest?.('a')) setDrawerOpen(false);
          }}
        >
          <Sidebar />
        </div>
      </aside>

      <div className="flex-1 min-h-0 flex flex-col px-3 sm:px-4 pb-3 pt-2">
        <div className="max-w-7xl mx-auto w-full flex-1 min-h-0 flex flex-col lg:flex-row lg:gap-4 lg:items-stretch">
          <aside className="hidden lg:block shrink-0 min-h-0 overflow-y-auto messages-scrollbar pr-1">
            <Sidebar />
          </aside>

          <main
            className={`rounded-xl bg-slate-900/50 border border-gray-800 backdrop-blur-md overflow-hidden flex-1 min-w-0 min-h-0 flex flex-col ${chatPanelHeight}`}
          >
            <div className="grid grid-cols-1 md:grid-cols-[minmax(260px,320px),minmax(0,1fr)] flex-1 min-h-0">
              {/* Sol: konuşmalar */}
              <section
                className={`flex flex-col min-h-0 border-b md:border-b-0 md:border-r border-gray-800 ${
                  isChatOpen ? 'hidden md:flex' : 'flex'
                }`}
              >
                <div className="shrink-0 px-4 py-3 border-b border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-200">Mesajlar</h2>
                      <p className="text-xs text-slate-400">Konuşmaların</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQ('');
                        setSearchResults([]);
                        setSearchError('');
                        setNewModalOpen(true);
                      }}
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-950/60 hover:bg-slate-800/70 border border-slate-800 text-slate-200 text-xs font-semibold px-3 py-2 transition"
                      title="Yeni mesaj"
                    >
                      <Plus className="w-4 h-4" />
                      Yeni
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto messages-scrollbar p-2">
                  <PullToRefresh onRefresh={refreshInbox}>
                    <div className="space-y-1">
                      {loadingInbox && (
                        <>
                          {Array.from({ length: 6 }).map((_, i) => (
                            <MessageRowSkeleton key={`inbox-sk-${i}`} />
                          ))}
                        </>
                      )}

                      {!loadingInbox && inbox.length === 0 && (
                        <p className="text-xs text-slate-500 px-2 py-2">
                          Henüz konuşma yok. Bir profilden “Mesaj At” ile başlat.
                        </p>
                      )}

                      {!loadingInbox && inbox.length > 0 && inbox.map((row) => {
                        const u = row.user;
                        const active = selectedUserId && String(u?._id) === String(selectedUserId);
                        return (
                          <button
                            key={String(u?._id)}
                            type="button"
                            onClick={() => {
                              setSelectedUser(u);
                              loadConversation(u._id);
                            }}
                            className={`w-full text-left rounded-lg border px-3 py-2 transition ${
                              active
                                ? 'bg-sky-500/10 border-sky-500/40'
                                : 'bg-slate-950/50 border-slate-800 hover:bg-slate-800/40'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center text-xs font-semibold text-slate-300">
                                {u?.profilePicture ? (
                                  <img src={u.profilePicture} alt="" className="h-9 w-9 object-cover" />
                                ) : (
                                  displayChatPartnerInitial(u?.username)
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-100 truncate">
                                  {displayChatPartnerName(u?.username)}
                                </p>
                                {row.lastText && (
                                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{row.lastText}</p>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                {row.lastMessageAt && (
                                  <p className="text-[11px] text-slate-500">{formatTimeTR(row.lastMessageAt)}</p>
                                )}
                                {Number(row.unreadCount) > 0 && (
                                  <span
                                    className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
                                    aria-label="Okunmamış"
                                  >
                                    {Number(row.unreadCount) > 99 ? '99+' : row.unreadCount}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </PullToRefresh>
                </div>
              </section>

              {/* Sağ: sohbet — sabit yükseklik, içerik scroll, input altta */}
              <section
                className={`flex flex-col min-h-0 overflow-hidden min-h-0 ${
                  isChatOpen ? 'flex' : 'hidden md:flex'
                }`}
              >
                <div className="shrink-0 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    {headerUser ? (
                      <>
                        {/* Mobil: geri */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUser(null);
                            setMessages([]);
                            setError('');
                          }}
                          className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-200 hover:bg-slate-800/60 transition"
                          aria-label="Geri"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div className="h-9 w-9 rounded-full bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center text-xs font-semibold text-slate-300">
                          {headerUser.avatar ? (
                            <img src={headerUser.avatar} alt="" className="h-9 w-9 object-cover" />
                          ) : (
                            headerUser.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-200 truncate">{headerUser.name}</p>
                          <p className="text-[11px] text-slate-500">Sohbet</p>
                        </div>
                      </>
                    ) : (
                      <div>
                        <p className="text-sm font-semibold text-slate-200">Bir konuşma seç</p>
                        <p className="text-[11px] text-slate-500">Soldan bir kişi seçerek başla</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto messages-scrollbar p-4 space-y-2 bg-slate-950/30">
                  {error && <p className="text-xs text-red-300 mb-2">{error}</p>}
                  {loadingChat ? (
                    <div className="space-y-2">
                      <ChatBubbleSkeleton />
                      <ChatBubbleSkeleton mine />
                      <ChatBubbleSkeleton />
                      <ChatBubbleSkeleton mine />
                    </div>
                  ) : !selectedUser ? (
                    <div className="text-sm text-slate-400">Sohbet başlatmak için bir kişi seç.</div>
                  ) : messages.length === 0 ? (
                    <div className="text-sm text-slate-400">İlk mesajını gönder.</div>
                  ) : (
                    messages.map((m) => {
                      const mine = String(m?.sender?._id) === String(currentUser?._id);
                      const msgId = String(m?._id ?? '');
                      const isRead = Boolean(m?.isRead);
                      const isDelivered = Boolean(deliveredMap[msgId]);
                      const tickTooltip = isRead ? 'Okundu' : isDelivered ? 'İletildi' : '';

                      const avatarUrl = mine ? currentUser?.profilePicture : m?.sender?.profilePicture;
                      return (
                        <div key={m._id || `${m.createdAt}:${m.text}`} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`flex items-end gap-2 max-w-[92%] ${mine ? 'flex-row-reverse' : ''}`}>
                            <div className="h-7 w-7 rounded-full bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center text-[10px] font-semibold text-slate-300 shrink-0">
                              {avatarUrl ? (
                                <img src={avatarUrl} alt="" className="h-7 w-7 object-cover" />
                              ) : (
                                mine
                                  ? (currentUser?.username || 'U').charAt(0).toUpperCase()
                                  : displayChatPartnerInitial(m?.sender?.username)
                              )}
                            </div>
                            <div
                              className={`max-w-[80%] rounded-3xl px-4 py-2 text-sm border backdrop-blur-md ${
                                mine
                                  ? 'bg-sky-500/15 border-sky-500/30 text-slate-100'
                                  : 'bg-slate-900/50 border-gray-800 text-slate-100'
                              }`}
                            >
                              <p className="whitespace-pre-line">{m.text}</p>
                              <div className="mt-1 flex items-center justify-end gap-2">
                                <p className="text-[10px] text-slate-400">{formatTimeTR(m.createdAt)}</p>
                                {mine && msgId && (
                                  <div className="relative group flex items-center justify-center shrink-0">
                                    {isRead ? (
                                      <CheckCheck size={16} className="text-sky-400" />
                                    ) : isDelivered ? (
                                      <CheckCheck size={16} className="text-slate-300" />
                                    ) : (
                                      <Check size={16} className="text-slate-500" />
                                    )}

                                    {tickTooltip && (
                                      <div className="absolute bottom-full right-0 mb-1 px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[10px] text-slate-100 opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap">
                                        {tickTooltip}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={listEndRef} className="h-px shrink-0" aria-hidden />
                </div>

                <div className="shrink-0 z-20 p-3 border-t border-gray-800/90 bg-slate-900/70 backdrop-blur-xl supports-[backdrop-filter]:bg-slate-900/55">
                  <div className="flex gap-2">
                    <input
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      disabled={!selectedUserId}
                      placeholder={selectedUserId ? 'Mesaj yaz...' : 'Önce bir kişi seç...'}
                      className="flex-1 rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-60"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          send();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={send}
                      disabled={!selectedUserId || sending || !text.trim()}
                      className="px-3 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 text-sm font-semibold transition inline-flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Gönder
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>

      {/* Yeni mesaj modalı */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setNewModalOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800">
              <p className="text-sm font-semibold text-slate-100">Yeni mesaj</p>
              <p className="text-xs text-slate-400 mt-1">Kullanıcı adına göre ara</p>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 rounded-lg bg-slate-950 border border-slate-800 px-3 py-2">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="Örn: caner"
                  className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                  autoFocus
                />
              </div>

              {searchError && <p className="mt-2 text-xs text-red-300">{searchError}</p>}
              {searchLoading && <p className="mt-2 text-xs text-slate-500">Aranıyor...</p>}

              <div className="mt-3 max-h-72 overflow-y-auto space-y-1">
                {!searchLoading && searchQ.trim() && searchResults.length === 0 && (
                  <p className="text-xs text-slate-500 px-1 py-2">Sonuç bulunamadı.</p>
                )}
                {searchResults.map((u) => (
                  <button
                    key={String(u._id)}
                    type="button"
                    onClick={() => {
                      setSelectedUser(u);
                      setNewModalOpen(false);
                      loadConversation(u._id);
                    }}
                    className="w-full text-left rounded-lg border px-3 py-2 bg-slate-950/50 border-slate-800 hover:bg-slate-800/40 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center text-xs font-semibold text-slate-300">
                        {u?.profilePicture ? (
                          <img src={u.profilePicture} alt="" className="h-9 w-9 object-cover" />
                        ) : (
                          displayChatPartnerInitial(u?.username)
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-100 truncate">
                          {displayChatPartnerName(u?.username)}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {u?.bio && String(u.bio).trim() ? u.bio : 'Kendinden bahset...'}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setNewModalOpen(false)}
                  className="rounded-lg bg-slate-950/60 hover:bg-slate-800/70 text-slate-200 border border-slate-800 text-sm font-semibold px-4 py-2 transition"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

