import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { X, MessageCircle, ThumbsUp } from 'lucide-react';
import Navbar from '../components/Navbar';
import CommentThread from '../components/CommentThread';
import Sidebar from '../components/Sidebar';
import toast from 'react-hot-toast';

const api = axios.create({ baseURL: '' });
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const t = localStorage.getItem('token');
    if (t) config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

export default function AnonymousFeed() {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentsByPostId, setCommentsByPostId] = useState({});
  const [commentsOpenForPostId, setCommentsOpenForPostId] = useState(null);
  const [commentTextByPostId, setCommentTextByPostId] = useState({});
  const [commentLoadingPostId, setCommentLoadingPostId] = useState(null);
  const [upvotingPostId, setUpvotingPostId] = useState(null);
  const [commentsLoadingPostId, setCommentsLoadingPostId] = useState(null);
  const [replyToByPostId, setReplyToByPostId] = useState({});
  const [replyTextByKey, setReplyTextByKey] = useState({});

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) {
      navigate('/login');
      return;
    }
    try {
      setCurrentUser(JSON.parse(localStorage.getItem('user') || 'null'));
    } catch {
      setCurrentUser(null);
    }
  }, [navigate]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/posts/anonymous');
      setPosts(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Anonim paylaşımlar yüklenemedi.');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleUpvote = async (postId) => {
    const id = String(postId);
    try {
      setUpvotingPostId(id);
      const res = await api.patch(`/api/posts/${id}/upvote`);
      const { upvotes = [], upvoteCount = 0 } = res.data || {};
      setPosts((prev) =>
        prev.map((p) => (String(p._id) === id ? { ...p, upvotes, upvoteCount } : p))
      );
    } catch {
      toast.error('Beğeni gönderilemedi.');
    } finally {
      setUpvotingPostId(null);
    }
  };

  const fetchComments = async (postId) => {
    const id = String(postId);
    if (commentsOpenForPostId === id) {
      setCommentsOpenForPostId(null);
      return;
    }
    setCommentsOpenForPostId(id);
    setCommentsLoadingPostId(id);
    try {
      const res = await api.get(`/api/posts/${id}/comments`);
      setCommentsByPostId((prev) => ({ ...prev, [id]: res.data || [] }));
    } catch {
      setCommentsByPostId((prev) => ({ ...prev, [id]: [] }));
    } finally {
      setCommentsLoadingPostId(null);
    }
  };

  const handleSubmitComment = async (postId) => {
    const id = String(postId);
    const text = (commentTextByPostId[id] || '').trim();
    if (!text) return;
    try {
      setCommentLoadingPostId(id);
      const res = await api.post(`/api/posts/${id}/comment`, { text });
      setCommentsByPostId((prev) => ({
        ...prev,
        [id]: [...(prev[id] || []), res.data],
      }));
      setCommentTextByPostId((prev) => ({ ...prev, [id]: '' }));
      setPosts((prev) =>
        prev.map((p) =>
          String(p._id) === id
            ? { ...p, comments: [...(p.comments || []), res.data._id] }
            : p
        )
      );
    } catch {
      toast.error('Yorum gönderilemedi.');
    } finally {
      setCommentLoadingPostId(null);
    }
  };

  const submitReply = async (postId, parentCommentId) => {
    const pid = String(postId);
    const key = `${pid}:${parentCommentId}`;
    const text = (replyTextByKey[key] || '').trim();
    if (!text) return;
    try {
      setCommentLoadingPostId(pid);
      const res = await api.post(`/api/posts/${pid}/comment`, {
        text,
        parentCommentId,
      });
      setCommentsByPostId((prev) => ({
        ...prev,
        [pid]: [...(prev[pid] || []), res.data],
      }));
      setReplyTextByKey((prev) => ({ ...prev, [key]: '' }));
      setReplyToByPostId((prev) => ({ ...prev, [pid]: null }));
    } catch {
      toast.error('Yanıt gönderilemedi.');
    } finally {
      setCommentLoadingPostId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar
        user={currentUser}
        title="Anonim dertleşme"
        onMenuClick={() => setDrawerOpen((v) => !v)}
      />

      {drawerOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

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
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 p-4 overflow-y-auto sc-scroll">
          <Sidebar />
        </div>
      </aside>

      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 lg:py-8">
        <div className="lg:flex lg:gap-6">
          <aside className="hidden lg:block shrink-0">
            <Sidebar />
          </aside>

          <main className="flex-1 min-w-0 space-y-4">
            <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-4">
              <h1 className="text-sm font-semibold text-slate-100">Anonim dertleşme</h1>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Kimliği gizli paylaşımlar burada toplanır. Ana akışta başkasının anonim yazısı
                görünmez; yalnızca burada okunabilir. Paylaşım yapan kişiye BiriVar özel bir
                destek mesajı gönderir.
              </p>
            </div>

            {loading && (
              <p className="text-sm text-slate-500">Yükleniyor…</p>
            )}

            {!loading && posts.length === 0 && (
              <p className="text-sm text-slate-500">Henüz anonim paylaşım yok.</p>
            )}

            <div className="space-y-3">
              {posts.map((post) => {
                const postIdStr = String(post._id);
                const isLiked =
                  currentUser?._id &&
                  (post.upvotes || []).some(
                    (uid) => String(uid) === String(currentUser._id)
                  );
                return (
                  <article
                    key={postIdStr}
                    className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-400">Anonim</span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(post.createdAt).toLocaleString('tr-TR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-100 whitespace-pre-line">{post.content}</p>
                    {(post.aiSuggestion || '').trim() && (
                      <div className="mt-3 rounded-lg border border-slate-700/50 bg-slate-950/40 px-3 py-2">
                        <p className="text-[10px] text-slate-500 mb-1">Empatik not</p>
                        <p className="text-xs text-slate-300 whitespace-pre-line">
                          {post.aiSuggestion}
                        </p>
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(post.aiSuggestion || '').trim() && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                          🤖 AI öneri sundu
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                        ❤️ {post.upvoteCount ?? post.upvotes?.length ?? 0} destek
                      </span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-800 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpvote(post._id)}
                        disabled={upvotingPostId === postIdStr}
                        className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm border ${
                          isLiked
                            ? 'border-sky-500/30 text-sky-200'
                            : 'border-slate-700 text-slate-200'
                        }`}
                      >
                        <ThumbsUp className="w-4 h-4" />
                        <span className="text-xs">
                          {post.upvoteCount ?? post.upvotes?.length ?? 0}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fetchComments(post._id)}
                        className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm border border-slate-700 text-slate-200"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-xs">{post.comments?.length ?? 0}</span>
                      </button>
                    </div>

                    {commentsOpenForPostId === postIdStr && (
                      <div className="mt-3 rounded-lg bg-slate-950/60 border border-slate-800 p-3 space-y-2">
                        <div className="max-h-56 overflow-y-auto">
                          {commentsLoadingPostId === postIdStr ? (
                            <p className="text-xs text-slate-500">Yorumlar…</p>
                          ) : (
                            <CommentThread
                              comments={commentsByPostId[postIdStr] || []}
                              replyingToId={replyToByPostId[postIdStr] || null}
                              onReplyToggle={(commentId) =>
                                setReplyToByPostId((prev) => ({
                                  ...prev,
                                  [postIdStr]:
                                    prev[postIdStr] === commentId ? null : commentId,
                                }))
                              }
                              getReplyText={(cid) =>
                                replyTextByKey[`${postIdStr}:${cid}`] || ''
                              }
                              setReplyText={(cid, v) =>
                                setReplyTextByKey((prev) => ({
                                  ...prev,
                                  [`${postIdStr}:${cid}`]: v,
                                }))
                              }
                              onReplySubmit={(cid) => submitReply(postIdStr, cid)}
                              onReplyCancel={() =>
                                setReplyToByPostId((prev) => ({ ...prev, [postIdStr]: null }))
                              }
                              sendingForPost={commentLoadingPostId === postIdStr}
                              currentUserId={currentUser?._id}
                              onMessageUser={(uid) => navigate(`/messages?userId=${uid}`)}
                            />
                          )}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={commentTextByPostId[postIdStr] || ''}
                            onChange={(e) =>
                              setCommentTextByPostId((prev) => ({
                                ...prev,
                                [postIdStr]: e.target.value,
                              }))
                            }
                            placeholder="Yorum yaz…"
                            className="flex-1 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
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
                            disabled={!commentTextByPostId[postIdStr]?.trim()}
                            className="rounded-lg bg-sky-500 text-slate-950 text-xs font-semibold px-3 py-2 disabled:opacity-50"
                          >
                            Gönder
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
