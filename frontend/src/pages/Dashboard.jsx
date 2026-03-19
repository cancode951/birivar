import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Menu, X, MessageCircle, ThumbsUp, Share2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import CommentThread from '../components/CommentThread';
import Sidebar from '../components/Sidebar';
import TrendingPanel from '../components/TrendingPanel';
import { useTurkeyData } from '../context/TurkeyDataContext';
import { useLocalStorageBoolean } from '../lib/uiPrefs';
import PullToRefresh from 'react-pull-to-refresh';
import PostCardSkeleton from '../components/skeletons/PostCardSkeleton';
import toast from 'react-hot-toast';

// Token'ı her istekte ekleyen API instance (proxy ile backend'e gider)
const api = axios.create({ baseURL: '' });
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const t = localStorage.getItem('token');
    if (t) config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

const Dashboard = () => {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const { selectedUniversity, selectedDepartment, feedQuery } = useTurkeyData();
  const [trendingHidden, setTrendingHidden] = useLocalStorageBoolean('sc_trending_hidden', false);

  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [postsError, setPostsError] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  /** Varsayılan: anonim paylaşım açık */
  const [postAnonymous, setPostAnonymous] = useState(true);
  const [creatingPost, setCreatingPost] = useState(false);

  // AI işlemleri artık Chat üzerinden
  const [commentsByPostId, setCommentsByPostId] = useState({});
  const [commentsOpenForPostId, setCommentsOpenForPostId] = useState(null);
  const [commentTextByPostId, setCommentTextByPostId] = useState({});
  const [commentLoadingPostId, setCommentLoadingPostId] = useState(null);
  const [upvotingPostId, setUpvotingPostId] = useState(null);
  const [commentsLoadingPostId, setCommentsLoadingPostId] = useState(null);
  const [replyToByPostId, setReplyToByPostId] = useState({});
  const [replyTextByKey, setReplyTextByKey] = useState({});

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  // İlk mount: auth check + başlangıç dailyAiLimit al
  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setCurrentUser(parsed);
      } catch (e) {
        console.error('Kullanıcı bilgisi parse edilemedi:', e);
      }
    }
  }, [token, navigate]);

  // Postları çek
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoadingPosts(true);
        const res = await api.get('/api/posts', {
          params: {
            university: selectedUniversity?.name || undefined,
            department: selectedDepartment || undefined,
            q: feedQuery?.trim() || undefined,
          },
        });
        setPosts(res.data || []);
        setPostsError('');
      } catch (err) {
        console.error(err);
        setPostsError('Postlar yüklenirken bir hata oluştu.');
      } finally {
        setLoadingPosts(false);
      }
    };

    fetchPosts();
  }, [selectedUniversity, selectedDepartment, feedQuery]);

  const refreshPosts = async () => {
    try {
      const res = await api.get('/api/posts', {
        params: {
          university: selectedUniversity?.name || undefined,
          department: selectedDepartment || undefined,
          q: feedQuery?.trim() || undefined,
        },
      });
      setPosts(res.data || []);
      setPostsError('');
    } catch (err) {
      console.error(err);
      setPostsError('Postlar yüklenirken bir hata oluştu.');
      toast.error('Akış yenilenemedi.');
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    if (!token) {
      navigate('/login');
      return;
    }

    try {
      setCreatingPost(true);
      const res = await api.post('/api/posts', {
        content: newPostContent.trim(),
        mediaUrl: null,
        category: 'uni',
        isAnonymous: postAnonymous,
      });

      const createdPost = res.data;
      setPosts((prev) => [createdPost, ...prev]);
      setNewPostContent('');
      toast.success('Paylaşım gönderildi.');
    } catch (err) {
      console.error('Post oluşturma hatası:', err);
      toast.error(err?.response?.data?.message || 'Paylaşım gönderilemedi.');
    } finally {
      setCreatingPost(false);
    }
  };

  const getAuthHeaders = () => {
    const t = localStorage.getItem('token');
    return t ? { Authorization: `Bearer ${t}` } : {};
  };

  const handleUpvote = async (postId) => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
      return;
    }
    if (upvotingPostId) return;
    const id = String(postId);
    try {
      setUpvotingPostId(id);
      const res = await api.patch(`/api/posts/${id}/upvote`);
      console.log('Backend Response:', res.data);
      const { upvotes = [], upvoteCount = 0 } = res.data || {};
      setPosts((prev) =>
        prev.map((p) =>
          String(p._id) === id ? { ...p, upvotes, upvoteCount } : p
        )
      );
    } catch (err) {
      console.error('Upvote hatası:', err?.response?.data || err);
    } finally {
      setUpvotingPostId(null);
    }
  };

  const fetchComments = async (postId) => {
    const id = String(postId);
    const isAlreadyOpen = commentsOpenForPostId === id || commentsOpenForPostId === postId;
    if (isAlreadyOpen) {
      setCommentsOpenForPostId(null);
      return;
    }
    setCommentsOpenForPostId(id);
    setCommentsLoadingPostId(id);
    try {
      const res = await api.get(`/api/posts/${id}/comments`);
      setCommentsByPostId((prev) => ({ ...prev, [id]: res.data || [] }));
    } catch (err) {
      console.error('Yorumlar yüklenemedi:', err?.response?.data || err);
      setCommentsByPostId((prev) => ({ ...prev, [id]: [] }));
    } finally {
      setCommentsLoadingPostId(null);
    }
  };

  const handleSubmitComment = async (postId) => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
      return;
    }
    const id = String(postId);
    let text = (commentTextByPostId[id] ?? commentTextByPostId[postId] ?? '').trim();
    if (!text && typeof document !== 'undefined') {
      const input = document.querySelector(`input[data-comment-for="${id}"]`);
      if (input && input.value) text = String(input.value).trim();
    }
    if (!text) return;
    try {
      setCommentLoadingPostId(id);
      const res = await api.post(`/api/posts/${id}/comment`, { text });
      console.log('Backend Response:', res.data);
      const newComment = res.data;
      setCommentsByPostId((prev) => ({
        ...prev,
        [id]: [...(prev[id] || prev[postId] || []), newComment],
      }));
      setCommentTextByPostId((prev) => ({ ...prev, [id]: '', [postId]: '' }));
      setPosts((prev) =>
        prev.map((p) => {
          if (String(p._id) !== id) return p;
          const comments = Array.isArray(p.comments) ? p.comments : [];
          return { ...p, comments: [...comments, newComment._id] };
        })
      );
    } catch (err) {
      console.error('Yorum eklenemedi:', err?.response?.data || err);
    } finally {
      setCommentLoadingPostId(null);
    }
  };

  const submitReply = async (postId, parentCommentId) => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
      return;
    }
    const pid = String(postId);
    const cid = String(parentCommentId);
    const key = `${pid}:${cid}`;
    const text = (replyTextByKey[key] || '').trim();
    if (!text) return;
    try {
      setCommentLoadingPostId(pid);
      const res = await api.post(`/api/posts/${pid}/comment`, {
        text,
        parentCommentId: cid,
      });
      console.log('Backend Response:', res.data);
      const newComment = res.data;
      setCommentsByPostId((prev) => ({
        ...prev,
        [pid]: [...(prev[pid] || []), newComment],
      }));
      setPosts((prev) =>
        prev.map((p) => {
          if (String(p._id) !== pid) return p;
          const comments = Array.isArray(p.comments) ? p.comments : [];
          return { ...p, comments: [...comments, newComment._id] };
        })
      );
      setReplyTextByKey((prev) => ({ ...prev, [key]: '' }));
      setReplyToByPostId((prev) => ({ ...prev, [pid]: null }));
    } catch (err) {
      console.error('Yanıt eklenemedi:', err?.response?.data || err);
    } finally {
      setCommentLoadingPostId(null);
    }
  };


  // Sidebar bileşenini burada inline component olarak tanımlamıyoruz;
  // aksi halde her render'da yeniden mount olup input focus'u kaybedebilir.

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
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
          <span className="text-sm font-semibold text-slate-200">Kategoriler</span>
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
            // Drawer içindeki linklere tıklayınca kapat
            if (e.target?.closest?.('a')) setDrawerOpen(false);
          }}
        >
          <Sidebar />
        </div>
      </aside>

      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 lg:py-8">
        <div className="lg:flex lg:gap-6">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block shrink-0">
            <Sidebar />
          </aside>

          <main className="space-y-4 flex-1 min-w-0">
            <form
              onSubmit={handleCreatePost}
              className="rounded-xl bg-slate-900/50 border border-slate-700/80 backdrop-blur-md p-4 shadow-sm ring-1 ring-sky-500/10"
            >
              <p className="text-xs font-medium text-sky-300/90 mb-2">İçini dök…</p>
              <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">
                Anonim paylaşımlar ana akışta ve{' '}
                <span className="text-slate-400">Anonim dertleşme</span> sayfasında görünür; kimlik
                gösterilmez. Paylaşımdan sonra sana özel bir destek mesajı gelir.
              </p>
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-sky-500 to-emerald-400 flex items-center justify-center text-xs font-semibold text-slate-950 overflow-hidden shrink-0">
                  {currentUser?.profilePicture ? (
                    <img
                      src={currentUser.profilePicture}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    'BV'
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  <textarea
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder="Burada yargılanmadan yazabilirsin. Dert, stres, küçük bir sevinç…"
                    rows={3}
                    className="w-full resize-y min-h-[4.5rem] rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/70 focus:border-sky-500/70"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="inline-flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={postAnonymous}
                        onChange={(e) => setPostAnonymous(e.target.checked)}
                        className="rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500/50"
                      />
                      Anonim paylaş
                    </label>
                    <button
                      type="submit"
                      disabled={!newPostContent.trim() || creatingPost}
                      className="inline-flex items-center gap-1 rounded-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 text-xs font-semibold px-4 py-2 transition"
                    >
                      {creatingPost ? 'Gönderiliyor…' : 'Paylaş'}
                    </button>
                  </div>
                </div>
              </div>
            </form>

            <section className="space-y-3">
              <PullToRefresh onRefresh={refreshPosts}>
                <div className="space-y-3">
                  {loadingPosts && (
                    <>
                      {Array.from({ length: 4 }).map((_, i) => (
                        <PostCardSkeleton key={`sk-${i}`} />
                      ))}
                    </>
                  )}

                  {postsError && !loadingPosts && (
                    <div className="rounded-xl bg-red-900/40 border border-red-700/60 p-4 text-sm text-red-100">
                      {postsError}
                    </div>
                  )}

                  {!loadingPosts && !postsError && posts.length === 0 && (
                    <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 text-sm text-slate-400">
                      Henüz hiç paylaşım yok. İlk paylaşımı sen yap! 🚀
                    </div>
                  )}

                  {posts.map((post) => {
                const postIdStr = String(post._id);
                const isLiked =
                  currentUser?._id &&
                  (post.upvotes || []).some((uid) => String(uid) === String(currentUser._id));
                return (
                <article
                  key={postIdStr}
                  className="rounded-2xl bg-slate-900/60 border border-gray-800 backdrop-blur-md p-4 hover:border-slate-700 transition shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative group">
                          <div className="flex items-center gap-2">
                            <div className="h-10 w-10 rounded-full bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center text-xs font-semibold text-slate-300">
                              {post.author?.profilePicture ? (
                                <img
                                  src={post.author.profilePicture}
                                  alt=""
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              ) : (
                                (post.author?.username || 'A').charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              {post.author?._id ? (
                                <Link
                                  to={`/profile/${post.author._id}`}
                                  className="text-sm font-semibold text-slate-100 hover:text-sky-300 transition truncate block"
                                >
                                  {post.author?.username || 'Anonim'}
                                </Link>
                              ) : (
                                <span className="text-sm font-semibold text-slate-100 truncate block">
                                  {post.author?.username || 'Anonim'}
                                </span>
                              )}
                              <p className="text-[11px] text-slate-500 truncate">
                                {post.author?.university || ''}
                                {post.author?.department ? ` • ${post.author.department}` : ''}
                                {' '}
                                •{' '}
                                {new Date(post.createdAt || Date.now()).toLocaleString('tr-TR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  day: '2-digit',
                                  month: '2-digit',
                                })}
                              </p>
                            </div>
                          </div>

                          {/* Hover profil kartı (tooltip) */}
                          <div className="hidden lg:block absolute left-0 top-full mt-2 w-80 z-20 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition">
                            <div className="rounded-xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
                              {/* Banner */}
                              <div className="relative h-16 w-full bg-slate-800">
                                <img
                                  src={
                                    post.author?.profileBanner ||
                                    'https://dummyimage.com/1200x320/0f172a/38bdf8.png&text=BiriVar'
                                  }
                                  alt=""
                                  className="h-16 w-full object-cover"
                                />
                                <div className="absolute inset-0 bg-slate-950/20" aria-hidden="true" />
                                <div className="absolute left-3 -bottom-5 flex items-center gap-2">
                                  <div className="h-10 w-10 rounded-full bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center text-xs font-semibold text-slate-300 ring-2 ring-slate-900">
                                    {post.author?.profilePicture ? (
                                      <img
                                        src={post.author.profilePicture}
                                        alt=""
                                        className="h-10 w-10 rounded-full object-cover"
                                      />
                                    ) : (
                                      (post.author?.username || 'A').charAt(0).toUpperCase()
                                    )}
                                  </div>
                                  <p className="text-sm font-semibold text-slate-100 drop-shadow-sm">
                                    {post.author?.username || 'Anonim'}
                                  </p>
                                </div>
                              </div>

                              <div className="p-3 pt-7">
                                <p className="text-xs text-slate-400 truncate">
                                  {post.author?.university || '—'}
                                  {post.author?.department ? ` • ${post.author.department}` : ''}
                                </p>
                                <p className="mt-2 text-xs text-slate-400 leading-relaxed line-clamp-2">
                                  {post.author?.bio && String(post.author.bio).trim()
                                    ? post.author.bio
                                    : 'Kendinden bahset...'}
                                </p>
                                <div className="mt-3 flex justify-end">
                                  {post.author?._id && (
                                    <Link
                                      to={`/profile/${post.author._id}`}
                                      className="text-xs font-semibold text-sky-300 hover:text-sky-200 transition"
                                    >
                                      Profili görüntüle
                                    </Link>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-wrap gap-1 justify-end">
                      {post.isAnonymous && (
                        <span className="text-[10px] px-2 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-400">
                          Anonim
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-1 rounded-full bg-slate-950/60 border border-slate-800 text-slate-300">
                        {post.category === 'dept' ? 'Bölüm' : 'Üniversite'}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-slate-100 whitespace-pre-line">
                    {post.content}
                  </p>

                  {post.mediaUrl && (
                    <div className="mt-3">
                      <a
                        href={post.mediaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center text-xs text-sky-300 hover:text-sky-200 underline"
                      >
                        Medyayı aç
                      </a>
                    </div>
                  )}

                  {(() => {
                    const anonPost =
                      post.isAnonymous === true ||
                      post.isAnonymous === 'true' ||
                      post.isAnonymous === 1;
                    const empathy =
                      anonPost && (post.aiSuggestion || '').trim() ? post.aiSuggestion : '';
                    return empathy ? (
                      <div className="mt-3 rounded-lg border border-slate-700/50 bg-slate-950/40 px-3 py-2.5">
                        <p className="text-[10px] font-medium text-slate-500 mb-1.5">
                          Empatik not
                        </p>
                        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                          {empathy}
                        </p>
                      </div>
                    ) : null;
                  })()}

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(() => {
                      const anonPost =
                        post.isAnonymous === true ||
                        post.isAnonymous === 'true' ||
                        post.isAnonymous === 1;
                      const showAi =
                        anonPost && (post.aiSuggestion || '').trim();
                      return showAi ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/60 text-slate-400 border border-slate-700/50">
                          🤖 AI öneri sundu
                        </span>
                      ) : null;
                    })()}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/60 text-slate-400 border border-slate-700/50">
                      ❤️ {post.upvoteCount ?? post.upvotes?.length ?? 0} destek
                    </span>
                  </div>

                  {/* Aksiyon bar (sosyal medya tarzı) */}
                  <div className="mt-4 pt-3 border-t border-slate-800/70 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpvote(post._id)}
                      disabled={upvotingPostId === postIdStr}
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm border transition backdrop-blur-md ${
                        isLiked
                          ? 'bg-sky-500/15 border-sky-500/30 text-sky-200'
                          : 'bg-slate-950/40 border-slate-800 text-slate-200 hover:bg-slate-900/60 hover:border-sky-500/40 hover:text-sky-200'
                      } disabled:opacity-50`}
                      title="Beğen"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span className="text-xs font-semibold">
                        {post.upvoteCount ?? post.upvotes?.length ?? 0}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fetchComments(post._id)}
                      className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm border bg-slate-950/40 border-slate-800 text-slate-200 hover:bg-slate-900/60 hover:border-slate-700 transition backdrop-blur-md"
                      title="Yorumlar"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="text-xs font-semibold">{post.comments?.length ?? 0}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        try {
                          if (post.author?._id) {
                            navigator.clipboard?.writeText(
                              `${window.location.origin}/profile/${post.author._id}`
                            );
                            toast.success('Profil linki kopyalandı.');
                          } else {
                            navigator.clipboard?.writeText(`${window.location.origin}/`);
                            toast.success('Ana sayfa linki kopyalandı.');
                          }
                        } catch {
                          toast.error('Kopyalanamadı.');
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm border bg-slate-950/40 border-slate-800 text-slate-200 hover:bg-slate-900/60 hover:border-slate-700 transition backdrop-blur-md"
                      title="Paylaş (link kopyala)"
                    >
                      <Share2 className="w-4 h-4" />
                      <span className="hidden sm:inline text-xs font-semibold">Paylaş</span>
                    </button>
                  </div>

                  {/* Yorumlar alanı */}
                  {(commentsOpenForPostId === postIdStr || commentsOpenForPostId === post._id) && (
                    <div className="mt-3 space-y-3 rounded-lg bg-slate-950/60 border border-slate-800 p-3">
                      <div className="space-y-1.5 max-h-64 overflow-y-auto">
                        {commentsLoadingPostId === postIdStr ? (
                          <p className="text-xs text-slate-500">Yorumlar yükleniyor...</p>
                        ) : (
                          <CommentThread
                            comments={commentsByPostId[postIdStr] || commentsByPostId[post._id] || []}
                            replyingToId={replyToByPostId[postIdStr] || null}
                            onReplyToggle={(commentId) =>
                              setReplyToByPostId((prev) => ({
                                ...prev,
                                [postIdStr]:
                                  prev[postIdStr] === commentId ? null : commentId,
                              }))
                            }
                            getReplyText={(commentId) => replyTextByKey[`${postIdStr}:${commentId}`] || ''}
                            setReplyText={(commentId, value) =>
                              setReplyTextByKey((prev) => ({
                                ...prev,
                                [`${postIdStr}:${commentId}`]: value,
                              }))
                            }
                            onReplySubmit={(commentId) => submitReply(postIdStr, commentId)}
                            onReplyCancel={(commentId) => {
                              setReplyTextByKey((prev) => ({
                                ...prev,
                                [`${postIdStr}:${commentId}`]: '',
                              }));
                              setReplyToByPostId((prev) => ({ ...prev, [postIdStr]: null }));
                            }}
                            sendingForPost={commentLoadingPostId === postIdStr}
                            currentUserId={currentUser?._id}
                            onMessageUser={(uid) => navigate(`/messages?userId=${uid}`)}
                          />
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          data-comment-for={postIdStr}
                          value={commentTextByPostId[postIdStr] ?? commentTextByPostId[post._id] ?? ''}
                          onChange={(e) =>
                            setCommentTextByPostId((prev) => ({
                              ...prev,
                              [postIdStr]: e.target.value,
                              [post._id]: e.target.value,
                            }))
                          }
                          placeholder="Yorum yaz..."
                          className="flex-1 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSubmitComment(post._id);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSubmitComment(post._id)}
                          disabled={
                            commentLoadingPostId === postIdStr ||
                            !(commentTextByPostId[postIdStr] ?? commentTextByPostId[post._id] ?? '').trim()
                          }
                          className="rounded-lg bg-sky-500 hover:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 text-xs font-semibold px-3 py-2 transition"
                        >
                          {commentLoadingPostId === postIdStr ? '...' : 'Gönder'}
                        </button>
                      </div>
                    </div>
                  )}
                </article>
                );
                  })}
                </div>
              </PullToRefresh>
            </section>
          </main>

          {/* Desktop sağ panel: kullanıcı kapatabilir */}
          {!trendingHidden && (
          <aside className="hidden lg:block space-y-4 shrink-0 w-[300px] lg:sticky lg:top-20 self-start">
            <div className="relative">
              <button
                type="button"
                onClick={() => setTrendingHidden(true)}
                className="absolute right-3 top-3 text-xs text-slate-400 hover:text-slate-200"
                title="Sağ paneli kapat"
              >
                Kapat
              </button>
              <TrendingPanel />
            </div>
            <div className="rounded-xl bg-slate-900/50 border border-gray-800 backdrop-blur-md p-4">
              <h2 className="text-sm font-semibold text-slate-100 mb-1">BiriVar AI</h2>
              <p className="text-xs text-slate-400">Tüm AI işlemleri sohbet ekranında.</p>
              <Link
                to="/chat"
                className="mt-3 inline-flex items-center justify-center w-full rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold py-2 transition"
              >
                Sohbete Git
              </Link>
            </div>
          </aside>
          )}

          {trendingHidden && (
            <div className="hidden lg:block shrink-0">
              <button
                type="button"
                onClick={() => setTrendingHidden(false)}
                className="rounded-lg bg-slate-900/50 border border-gray-800 backdrop-blur-md px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800/60 transition"
              >
                Sağ paneli aç
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

