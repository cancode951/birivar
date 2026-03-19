import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Select from 'react-select';
import { useTurkeyData } from '../context/TurkeyDataContext';
import {
  User,
  Building2,
  GraduationCap,
  Crown,
  Sparkles,
  ThumbsUp,
  MessageCircle,
  X,
  Camera,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import imageCompression from 'browser-image-compression';
import toast from 'react-hot-toast';
import CommentThread from '../components/CommentThread';
import Sidebar from '../components/Sidebar';
import PostCardSkeleton from '../components/skeletons/PostCardSkeleton';

const Profile = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentSending, setCommentSending] = useState(false);
  const [replyToCommentId, setReplyToCommentId] = useState(null);
  const [replyTextById, setReplyTextById] = useState({});
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('');
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState('');
  const [bannerSaving, setBannerSaving] = useState(false);
  const [bannerError, setBannerError] = useState('');
  const bannerInputRef = useRef(null);

  // Profili Düzenle (tek panel modal)
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [profileEditSaving, setProfileEditSaving] = useState(false);
  const [profileEditError, setProfileEditError] = useState('');

  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarFile, setEditAvatarFile] = useState(null);
  const [editAvatarPreviewUrl, setEditAvatarPreviewUrl] = useState('');
  const [editBannerFile, setEditBannerFile] = useState(null);
  const [editBannerPreviewUrl, setEditBannerPreviewUrl] = useState('');

  const editAvatarInputRef = useRef(null);
  const editBannerInputRef = useRef(null);

  const [editUniversityOption, setEditUniversityOption] = useState(null); // { value, label, code }
  const [editDepartmentOption, setEditDepartmentOption] = useState(null); // { value, label }

  const [bioDraft, setBioDraft] = useState('');
  const [bioEditing, setBioEditing] = useState(false);
  const [bioSaving, setBioSaving] = useState(false);
  const [bioError, setBioError] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const {
    loading: turkeyLoading,
    error: turkeyError,
    universities,
    departments,
  } = useTurkeyData();

  const api = useMemo(() => {
    const instance = axios.create({ baseURL: '' });
    instance.interceptors.request.use((config) => {
      if (typeof window !== 'undefined') {
        const t = localStorage.getItem('token');
        if (t) config.headers.Authorization = `Bearer ${t}`;
      }
      return config;
    });
    return instance;
  }, []);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setViewer(parsed);
      } catch (e) {
        console.error(e);
      }
    }
  }, [token, navigate]);

  // Profil sahibini belirle: URL'den userId varsa backend'den çek; yoksa viewer = kendi profilimiz
  useEffect(() => {
    if (!token) return;

    const loadProfileUser = async () => {
      try {
        setLoading(true);
        setError('');
        setSelectedPost(null);

        if (userId) {
          const res = await axios.get(`/api/users/${userId}`);
          setUser(res.data);
        } else {
          setUser(viewer);
        }
      } catch (err) {
        console.error(err);
        setError('Profil bilgileri yüklenirken hata oluştu.');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadProfileUser();
  }, [token, userId, viewer]);

  useEffect(() => {
    // Profil değişince draft'ı senkronla
    setBioDraft(String(user?.bio || ''));
    setBioEditing(false);
    setBioError('');
  }, [user?._id]);

  useEffect(() => {
    if (!user?._id) return;

    const fetchUserPosts = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/posts/user/${user._id}`);
        setPosts(res.data || []);
        setError('');
      } catch (err) {
        console.error(err);
        setError('Paylaşımlar yüklenirken hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserPosts();
  }, [user?._id]);

  const tierLabel = { free: 'Ücretsiz', pro: 'Pro', premium: 'Premium' };
  const tierColor = {
    free: 'bg-slate-600 text-slate-200',
    pro: 'bg-sky-600 text-white',
    premium: 'bg-amber-500 text-slate-950',
  };

  const openPost = async (post) => {
    setSelectedPost(post);
    setPdfError('');
    setComments([]);
    setCommentText('');
    setReplyToCommentId(null);
    setReplyTextById({});
    try {
      setCommentsLoading(true);
      const res = await axios.get(`/api/posts/${post._id}/comments`);
      setComments(res.data || []);
    } catch (err) {
      console.error(err);
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  const closePost = () => {
    setSelectedPost(null);
    setComments([]);
    setCommentText('');
    setReplyToCommentId(null);
    setReplyTextById({});
    setCommentsLoading(false);
  };

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    };
  }, [avatarPreviewUrl]);

  useEffect(() => {
    return () => {
      if (bannerPreviewUrl) URL.revokeObjectURL(bannerPreviewUrl);
    };
  }, [bannerPreviewUrl]);

  const onPickAvatar = () => {
    if (!isOwner) return;
    setAvatarError('');
    setAvatarModalOpen(true);
  };

  const triggerAvatarFilePicker = () => {
    if (!isOwner) return;
    setAvatarError('');
    setAvatarModalOpen(false);
    fileInputRef.current?.click();
  };

  const onAvatarFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setAvatarError('');
    setAvatarFile(null);
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    setAvatarPreviewUrl('');

    if (!f) return;
    if (!String(f.type || '').startsWith('image/')) {
      setAvatarError('Lütfen bir görsel dosyası seçin.');
      return;
    }

    (async () => {
      try {
        const compressed = await imageCompression(f, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1024,
          useWebWorker: true,
        });
        setAvatarFile(compressed);
        setAvatarPreviewUrl(URL.createObjectURL(compressed));
      } catch (err) {
        console.error('Avatar compression failed:', err);
        setAvatarFile(f);
        setAvatarPreviewUrl(URL.createObjectURL(f));
      } finally {
        setAvatarModalOpen(false);
      }
    })();
  };

  const onPickBanner = () => {
    if (!isOwner) return;
    setBannerError('');
    bannerInputRef.current?.click();
  };

  const onBannerFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setBannerError('');
    setBannerFile(null);
    if (bannerPreviewUrl) URL.revokeObjectURL(bannerPreviewUrl);
    setBannerPreviewUrl('');

    if (!f) return;
    if (!String(f.type || '').startsWith('image/')) {
      setBannerError('Lütfen bir görsel dosyası seçin.');
      return;
    }

    (async () => {
      try {
        const compressed = await imageCompression(f, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });
        setBannerFile(compressed);
        setBannerPreviewUrl(URL.createObjectURL(compressed));
      } catch (err) {
        console.error('Banner compression failed:', err);
        setBannerFile(f);
        setBannerPreviewUrl(URL.createObjectURL(f));
      }
    })();
  };

  // Profili Düzenle modal: avatar/banner seçim + preview
  const openProfileEdit = () => {
    if (!isOwner) return;
    setProfileEditError('');

    // Draft'ları kullanıcının mevcut değerleriyle başlat
    setEditUsername(String(user?.username || ''));
    setEditBio(String(user?.bio || ''));
    setEditAvatarFile(null);
    setEditBannerFile(null);

    // Object URL temizliği (önceki varsa)
    if (editAvatarPreviewUrl) URL.revokeObjectURL(editAvatarPreviewUrl);
    if (editBannerPreviewUrl) URL.revokeObjectURL(editBannerPreviewUrl);
    setEditAvatarPreviewUrl('');
    setEditBannerPreviewUrl('');

    // Üniversite/Bölüm başlangıç değerleri
    const uniName = user?.university ? String(user.university) : '';
    const matchedUni = Array.isArray(universities)
      ? universities.find((u) => u?.name === uniName)
      : null;

    setEditUniversityOption(
      matchedUni
        ? { value: matchedUni.name, label: matchedUni.name, code: matchedUni.code }
        : uniName
          ? { value: uniName, label: uniName, code: '' }
          : null
    );

    setEditDepartmentOption(
      user?.department ? { value: String(user.department), label: String(user.department) } : null
    );

    setProfileEditOpen(true);
  };

  const closeProfileEdit = () => {
    setProfileEditOpen(false);
    setProfileEditSaving(false);
    setProfileEditError('');

    if (editAvatarPreviewUrl) URL.revokeObjectURL(editAvatarPreviewUrl);
    if (editBannerPreviewUrl) URL.revokeObjectURL(editBannerPreviewUrl);

    setEditAvatarFile(null);
    setEditBannerFile(null);
    setEditAvatarPreviewUrl('');
    setEditBannerPreviewUrl('');
  };

  const onEditAvatarFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    if (editAvatarPreviewUrl) URL.revokeObjectURL(editAvatarPreviewUrl);
    setEditAvatarFile(null);
    setEditAvatarPreviewUrl('');

    if (!f) return;
    setProfileEditError('');

    if (!String(f.type || '').startsWith('image/')) {
      setProfileEditError('Lütfen bir görsel dosyası seçin.');
      return;
    }

    (async () => {
      try {
        const compressed = await imageCompression(f, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1024,
          useWebWorker: true,
        });
        setEditAvatarFile(compressed);
        setEditAvatarPreviewUrl(URL.createObjectURL(compressed));
      } catch (err) {
        console.error('Avatar compression failed:', err);
        // fallback: orijinal dosya
        setEditAvatarFile(f);
        setEditAvatarPreviewUrl(URL.createObjectURL(f));
      }
    })();
  };

  const onEditBannerFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    if (editBannerPreviewUrl) URL.revokeObjectURL(editBannerPreviewUrl);
    setEditBannerFile(null);
    setEditBannerPreviewUrl('');

    if (!f) return;
    setProfileEditError('');

    if (!String(f.type || '').startsWith('image/')) {
      setProfileEditError('Lütfen bir görsel dosyası seçin.');
      return;
    }

    (async () => {
      try {
        const compressed = await imageCompression(f, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });
        setEditBannerFile(compressed);
        setEditBannerPreviewUrl(URL.createObjectURL(compressed));
      } catch (err) {
        console.error('Banner compression failed:', err);
        setEditBannerFile(f);
        setEditBannerPreviewUrl(URL.createObjectURL(f));
      }
    })();
  };

  const saveProfileEdit = async () => {
    if (!isOwner) return;
    setProfileEditError('');

    const cleanUsername = String(editUsername || '').trim();
    if (!cleanUsername) {
      setProfileEditError('İsim alanı zorunludur.');
      return;
    }

    const cleanBio = String(editBio || '');
    if (cleanBio.length > 160) {
      setProfileEditError('Biyografi en fazla 160 karakter olmalı.');
      return;
    }

    try {
      setProfileEditSaving(true);

      const form = new FormData();
      form.append('username', cleanUsername);
      form.append('bio', cleanBio);
      form.append('university', editUniversityOption?.value || '');
      form.append('department', editDepartmentOption?.value || '');

      if (editAvatarFile) form.append('avatar', editAvatarFile);
      if (editBannerFile) form.append('banner', editBannerFile);

      const res = await api.patch('/api/users/update-profile', form);
      const updatedUser = res?.data?.user;
      if (!updatedUser) {
        setProfileEditError(res?.data?.message || 'Profil güncellenemedi.');
        // eslint-disable-next-line no-console
        console.error('update-profile unexpected payload:', res?.data);
        return;
      }

      setUser((prev) => ({ ...(prev || {}), ...updatedUser }));
      setViewer((prev) => ({ ...(prev || {}), ...updatedUser }));

      // localStorage sync
      const raw = localStorage.getItem('user');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          localStorage.setItem(
            'user',
            JSON.stringify({ ...(parsed || {}), ...updatedUser })
          );
        } catch {
          // ignore
        }
      }

      closeProfileEdit();
      toast.success('Profil güncellendi.');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('update-profile failed:', err);
      setProfileEditError(
        err?.response?.data?.message ||
          err?.message ||
          'Profil güncellenemedi.'
      );
      toast.error(err?.response?.data?.message || 'Profil güncellenemedi.');
    } finally {
      setProfileEditSaving(false);
    }
  };

  const editUniversityOptions = useMemo(() => {
    const list = Array.isArray(universities) ? universities : [];
    const copy = [...list]
      .filter((u) => u?.name)
      .sort((a, b) => a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' }));

    return copy.map((u) => ({ value: u.name, label: u.name, code: u.code }));
  }, [universities]);

  const editDepartmentOptions = useMemo(() => {
    if (!editUniversityOption?.code) return [];

    const list = Array.isArray(departments) ? departments : [];
    const filtered = list.filter((d) => d?.universityCode === editUniversityOption.code);
    const names = filtered.map((d) => String(d?.name || '').trim()).filter(Boolean);

    const seen = new Set();
    const unique = [];
    for (const name of names) {
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(name);
    }

    unique.sort((a, b) => a.localeCompare(b, 'tr', { sensitivity: 'base' }));
    return unique.map((name) => ({ value: name, label: name }));
  }, [departments, editUniversityOption]);

  const saveBanner = async () => {
    if (!isOwner) return;
    if (!bannerFile) {
      setBannerError('Lütfen bir görsel seçin.');
      return;
    }
    try {
      setBannerSaving(true);
      setBannerError('');

      const form = new FormData();
      form.append('banner', bannerFile);

      const res = await api.patch('/api/users/update-banner', form);
      const updatedUser = res?.data?.user;
      if (!updatedUser?.profileBanner) {
        setBannerError('Kapak fotoğrafı güncellenemedi.');
        return;
      }

      setUser((prev) => ({ ...(prev || {}), profileBanner: updatedUser.profileBanner }));
      setViewer((prev) => ({ ...(prev || {}), profileBanner: updatedUser.profileBanner }));

      const raw = localStorage.getItem('user');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          localStorage.setItem(
            'user',
            JSON.stringify({ ...(parsed || {}), profileBanner: updatedUser.profileBanner })
          );
        } catch {
          // ignore
        }
      }

      setBannerFile(null);
      if (bannerPreviewUrl) URL.revokeObjectURL(bannerPreviewUrl);
      setBannerPreviewUrl('');
      toast.success('Banner güncellendi.');
    } catch (err) {
      setBannerError(err?.response?.data?.message || 'Kapak fotoğrafı yüklenemedi.');
      toast.error(err?.response?.data?.message || 'Banner güncellenemedi.');
    } finally {
      setBannerSaving(false);
    }
  };

  const saveAvatar = async () => {
    if (!isOwner) return;
    if (!avatarFile) {
      setAvatarError('Lütfen listeden bir görsel seçin.');
      return;
    }
    try {
      setAvatarSaving(true);
      setAvatarError('');

      const form = new FormData();
      form.append('avatar', avatarFile);

      const res = await api.patch('/api/users/update-avatar', form);
      const updatedUser = res?.data?.user;
      if (!updatedUser?.profilePicture) {
        setAvatarError('Avatar güncellenemedi.');
        return;
      }

      setUser((prev) => ({ ...(prev || {}), profilePicture: updatedUser.profilePicture }));
      setViewer((prev) => ({ ...(prev || {}), profilePicture: updatedUser.profilePicture }));

      // localStorage sync (Navbar/Dashboard bu bilgiyi buradan okuyor)
      const raw = localStorage.getItem('user');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          localStorage.setItem(
            'user',
            JSON.stringify({ ...(parsed || {}), profilePicture: updatedUser.profilePicture })
          );
        } catch {
          // ignore
        }
      }

      setAvatarFile(null);
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
      setAvatarPreviewUrl('');
      toast.success('Profil fotoğrafı güncellendi.');
    } catch (err) {
      setAvatarError(err?.response?.data?.message || 'Avatar yüklenemedi.');
      toast.error(err?.response?.data?.message || 'Profil fotoğrafı güncellenemedi.');
    } finally {
      setAvatarSaving(false);
    }
  };

  const startBioEdit = () => {
    if (!isOwner) return;
    setBioError('');
    setBioDraft(String(user?.bio || ''));
    setBioEditing(true);
  };

  const cancelBioEdit = () => {
    setBioError('');
    setBioDraft(String(user?.bio || ''));
    setBioEditing(false);
  };

  const saveBio = async () => {
    if (!isOwner) return;
    const clean = String(bioDraft || '').trim();
    if (clean.length > 160) {
      setBioError('Biyografi en fazla 160 karakter olmalı.');
      return;
    }
    try {
      setBioSaving(true);
      setBioError('');
      const res = await api.patch('/api/users/update-bio', { bio: clean });
      const updatedUser = res?.data?.user;
      if (!updatedUser) {
        setBioError('Biyografi güncellenemedi.');
        return;
      }
      setUser((prev) => ({ ...(prev || {}), bio: updatedUser.bio || '' }));
      setViewer((prev) => ({ ...(prev || {}), bio: updatedUser.bio || '' }));

      const raw = localStorage.getItem('user');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          localStorage.setItem('user', JSON.stringify({ ...(parsed || {}), bio: updatedUser.bio || '' }));
        } catch {
          // ignore
        }
      }
      setBioEditing(false);
      toast.success('Biyografi güncellendi.');
    } catch (err) {
      setBioError(err?.response?.data?.message || 'Biyografi kaydedilemedi.');
      toast.error(err?.response?.data?.message || 'Biyografi güncellenemedi.');
    } finally {
      setBioSaving(false);
    }
  };


  const submitComment = async (parentCommentId = null) => {
    if (!selectedPost?._id) return;
    const text = parentCommentId
      ? (replyTextById[String(parentCommentId)] || '').trim()
      : commentText.trim();
    if (!text) return;
    if (!localStorage.getItem('token')) {
      navigate('/login');
      return;
    }
    try {
      setCommentSending(true);
      const res = await api.post(`/api/posts/${selectedPost._id}/comment`, {
        text,
        parentCommentId,
      });
      console.log('Backend Response:', res.data);
      const newComment = res.data;
      setComments((prev) => [...prev, newComment]);
      if (parentCommentId) {
        setReplyTextById((prev) => ({ ...prev, [String(parentCommentId)]: '' }));
        setReplyToCommentId(null);
      } else {
        setCommentText('');
      }
      setPosts((prev) =>
        prev.map((p) => {
          if (String(p._id) !== String(selectedPost._id)) return p;
          const existing = Array.isArray(p.comments) ? p.comments : [];
          return { ...p, comments: [...existing, newComment._id] };
        })
      );
    } catch (err) {
      console.error('Yorum eklenemedi:', err?.response?.data || err);
    } finally {
      setCommentSending(false);
    }
  };

  const isOwner = viewer?._id && user?._id && String(viewer._id) === String(user._id);

  const tierLimitsText =
    "Free: günlük 5 mesaj, toplam 2 dosya • Pro: sınırsız mesaj, günlük 10 dosya • Premium: sınırsız";

  const getTierLimits = (tier) => {
    if (tier === 'premium') return { dailyMessages: Infinity, dailyFiles: Infinity, totalFiles: Infinity };
    if (tier === 'pro') return { dailyMessages: Infinity, dailyFiles: 10, totalFiles: Infinity };
    return { dailyMessages: 5, dailyFiles: Infinity, totalFiles: 2 };
  };

  const usage = viewer?.aiUsage || {};
  const limits = getTierLimits(viewer?.tier || 'free');
  const remainingMessages =
    limits.dailyMessages === Infinity
      ? Infinity
      : Math.max(0, Number(limits.dailyMessages) - Number(usage.messagesToday || 0));
  const remainingDailyFiles =
    limits.dailyFiles === Infinity
      ? Infinity
      : Math.max(0, Number(limits.dailyFiles) - Number(usage.filesToday || 0));
  const remainingTotalFiles =
    limits.totalFiles === Infinity
      ? Infinity
      : Math.max(0, Number(limits.totalFiles) - Number(usage.totalFiles || 0));

  if (!user && loading) return null;
  if (!user && !loading) return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar user={viewer} title="BiriVar" onMenuClick={() => setDrawerOpen((v) => !v)} />

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
      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        <div className="rounded-xl bg-red-900/40 border border-red-700/60 p-4 text-sm text-red-100">
          {error || 'Profil bulunamadı.'}
        </div>
      </main>
    </div>
  );

  const initial = user.username ? user.username.charAt(0).toUpperCase() : '?';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar user={viewer || user} title="BiriVar" onMenuClick={() => setDrawerOpen((v) => !v)} />

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

      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        {/* Avatar seçme modalı */}
        {isOwner && avatarModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
              onClick={() => setAvatarModalOpen(false)}
              aria-hidden="true"
            />
            <div className="relative w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800">
                <p className="text-sm font-semibold text-slate-100">Profil fotoğrafı</p>
                <p className="text-xs text-slate-400 mt-1">
                  Fotoğrafını nereden eklemek istersin?
                </p>
              </div>
              <div className="p-5 space-y-2">
                <button
                  type="button"
                  onClick={triggerAvatarFilePicker}
                  className="w-full rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-sm font-semibold py-2.5 transition"
                >
                  Cihazdan ekle
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarModalOpen(false)}
                  className="w-full rounded-lg bg-slate-950/60 hover:bg-slate-800/70 text-slate-200 border border-slate-800 text-sm font-semibold py-2.5 transition"
                >
                  İptal
                </button>
                {avatarError && <p className="text-xs text-red-300 pt-1">{avatarError}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Profil kartı */}
        {isOwner && profileEditOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
              onClick={closeProfileEdit}
              aria-hidden="true"
            />

            <div className="relative w-full h-dvh sm:h-auto sm:max-w-2xl bg-slate-900 border border-slate-800 shadow-2xl rounded-none sm:rounded-2xl overflow-hidden flex flex-col">
              <div className="flex items-start justify-between gap-3 p-4 border-b border-slate-800 shrink-0">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-100">Profili Düzenle</p>
                  <p className="text-xs text-slate-400 mt-1">Kapak, fotoğraf, üniversite ve bilgilerini güncelle.</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={closeProfileEdit}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
                    aria-label="Kapat"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={saveProfileEdit}
                    disabled={profileEditSaving}
                    className="inline-flex items-center justify-center rounded-lg bg-sky-500 hover:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 text-sm font-semibold px-4 py-2 transition"
                  >
                    {profileEditSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Yükleniyor...
                      </>
                    ) : (
                      'Kaydet'
                    )}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Banner */}
                <div className="relative h-28 sm:h-36 w-full bg-slate-800 border border-slate-800 rounded-xl overflow-hidden">
                  <img
                    src={editBannerPreviewUrl || user.profileBanner}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-slate-950/20" aria-hidden="true" />

                  <input
                    ref={editBannerInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onEditBannerFileChange}
                  />

                  <button
                    type="button"
                    onClick={() => editBannerInputRef.current?.click()}
                    className="absolute top-3 right-3 inline-flex items-center gap-2 rounded-lg bg-slate-950/70 hover:bg-slate-950/85 border border-slate-800 text-slate-200 text-xs font-semibold px-3 py-2 transition"
                  >
                    <Camera className="w-4 h-4" />
                    Banner
                  </button>
                </div>

                {/* Avatar */}
                <div className="flex items-center justify-center -mt-8">
                  <div className="relative">
                    <div className="h-24 w-24 rounded-full bg-gradient-to-br from-sky-500 to-emerald-400 p-1 shadow-lg">
                      <div className="h-full w-full rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                        <img
                          src={editAvatarPreviewUrl || user.profilePicture}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </div>

                    <input
                      ref={editAvatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onEditAvatarFileChange}
                    />

                    <button
                      type="button"
                      onClick={() => editAvatarInputRef.current?.click()}
                      className="absolute -right-1 -bottom-1 h-9 w-9 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center hover:bg-slate-900 transition"
                      aria-label="Fotoğraf seç"
                    >
                      <Camera className="w-4 h-4 text-slate-200" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">İsim & Soyisim</label>
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      placeholder="Ad Soyad"
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-slate-300">Biyografi</label>
                      <span className="text-[11px] text-slate-500">{(editBio || '').length}/160</span>
                    </div>
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value.slice(0, 160))}
                      rows={4}
                      maxLength={160}
                      placeholder="Kendinden bahset..."
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Üniversite</label>
                      <Select
                        classNamePrefix="sc-select"
                        isSearchable
                        isClearable
                        isLoading={turkeyLoading}
                        options={editUniversityOptions}
                        value={editUniversityOption}
                        onChange={(opt) => {
                          setEditUniversityOption(opt || null);
                          setEditDepartmentOption(null);
                        }}
                        placeholder={turkeyLoading ? 'Yükleniyor...' : 'Üniversite seç'}
                        noOptionsMessage={() => 'Sonuç bulunamadı'}
                        styles={{
                          control: (base, state) => ({
                            ...base,
                            backgroundColor: '#020617',
                            borderColor: state.isFocused ? '#334155' : '#334155',
                            boxShadow: 'none',
                            minHeight: 38,
                          }),
                          menu: (base) => ({ ...base, backgroundColor: '#0b1220', border: '1px solid #1f2937' }),
                          option: (base, state) => ({
                            ...base,
                            backgroundColor: state.isFocused ? '#111827' : '#0b1220',
                            color: '#e2e8f0',
                          }),
                          singleValue: (base) => ({ ...base, color: '#e2e8f0' }),
                          input: (base) => ({ ...base, color: '#e2e8f0' }),
                          placeholder: (base) => ({ ...base, color: '#94a3b8' }),
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Bölüm</label>
                      <Select
                        classNamePrefix="sc-select"
                        isSearchable
                        isClearable
                        isDisabled={!editUniversityOption?.code || turkeyLoading || Boolean(turkeyError)}
                        isLoading={turkeyLoading}
                        options={editDepartmentOptions}
                        value={editDepartmentOption}
                        onChange={(opt) => setEditDepartmentOption(opt || null)}
                        placeholder={
                          turkeyLoading
                            ? 'Yükleniyor...'
                            : !editUniversityOption
                              ? 'Önce üniversite seç'
                              : 'Bölüm seç'
                        }
                        noOptionsMessage={() => 'Sonuç bulunamadı'}
                        styles={{
                          control: (base, state) => ({
                            ...base,
                            backgroundColor: '#020617',
                            borderColor: state.isFocused ? '#334155' : '#334155',
                            boxShadow: 'none',
                            minHeight: 38,
                            opacity: !editUniversityOption ? 0.65 : 1,
                          }),
                          menu: (base) => ({ ...base, backgroundColor: '#0b1220', border: '1px solid #1f2937' }),
                          option: (base, state) => ({
                            ...base,
                            backgroundColor: state.isFocused ? '#111827' : '#0b1220',
                            color: '#e2e8f0',
                          }),
                          singleValue: (base) => ({ ...base, color: '#e2e8f0' }),
                          input: (base) => ({ ...base, color: '#e2e8f0' }),
                          placeholder: (base) => ({ ...base, color: '#94a3b8' }),
                        }}
                      />
                    </div>
                  </div>

                  {profileEditError && <p className="text-xs text-red-300">{profileEditError}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden mb-6">
          {/* Banner */}
          <div className="relative h-28 sm:h-36 w-full bg-slate-800">
            <img
              src={bannerPreviewUrl || user.profileBanner}
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-slate-950/20" aria-hidden="true" />

            {isOwner && (
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onPickBanner}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-950/70 hover:bg-slate-900/80 border border-slate-800 text-slate-200 text-xs font-semibold px-3 py-2 transition"
                >
                  <ImageIcon className="w-4 h-4" />
                  Kapak Fotoğrafını Değiştir
                </button>
              </div>
            )}

            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onBannerFileChange}
            />
          </div>

          {/* İçerik */}
          <div className="p-6">
            {/* Avatar + bilgiler */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="relative shrink-0 -mt-14 sm:-mt-16">
              <button
                type="button"
                onClick={onPickAvatar}
                disabled={!isOwner}
                className="h-20 w-20 rounded-full bg-gradient-to-br from-sky-500 to-emerald-400 flex items-center justify-center text-2xl font-bold text-slate-950 overflow-hidden disabled:cursor-default ring-4 ring-slate-900"
                aria-label={isOwner ? 'Profil fotoğrafını değiştir' : 'Profil fotoğrafı'}
              >
                {avatarPreviewUrl ? (
                  <img src={avatarPreviewUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
                ) : user.profilePicture ? (
                  <img src={user.profilePicture} alt="" className="h-20 w-20 rounded-full object-cover" />
                ) : (
                  initial
                )}
              </button>

              {isOwner && (
                <button
                  type="button"
                  onClick={onPickAvatar}
                  className="absolute -right-1 -bottom-1 h-8 w-8 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center hover:bg-slate-900 transition"
                  aria-label="Fotoğraf seç"
                >
                  <Camera className="w-4 h-4 text-slate-200" />
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onAvatarFileChange}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <User className="w-5 h-5 text-slate-400" />
                {user.username}
              </h1>

              {isOwner && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={openProfileEdit}
                    className="inline-flex items-center justify-center rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold px-4 py-2 transition"
                  >
                    Profili Düzenle
                  </button>
                </div>
              )}

              {!isOwner && user?._id && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/messages?userId=${user._id}`)}
                    className="inline-flex items-center justify-center rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold px-4 py-2 transition"
                  >
                    Mesaj At
                  </button>
                </div>
              )}

              {/* Bio */}
              <div className="mt-2">
                {!bioEditing ? (
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {user.bio && String(user.bio).trim()
                        ? user.bio
                        : isOwner
                          ? 'Kendinden bahset...'
                          : 'Kendinden bahset...'}
                    </p>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={startBioEdit}
                        className="shrink-0 text-xs font-semibold text-sky-300 hover:text-sky-200 transition"
                      >
                        {user.bio ? 'Düzenle' : 'Biyografi ekle'}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      value={bioDraft}
                      onChange={(e) => setBioDraft(e.target.value.slice(0, 160))}
                      rows={3}
                      maxLength={160}
                      placeholder="Kendinden bahset..."
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    />
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] text-slate-500">
                        {(bioDraft || '').length}/160
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={cancelBioEdit}
                          disabled={bioSaving}
                          className="rounded-lg bg-slate-950/60 hover:bg-slate-800/70 disabled:opacity-60 text-slate-200 border border-slate-800 text-xs font-semibold px-3 py-2 transition"
                        >
                          İptal
                        </button>
                        <button
                          type="button"
                          onClick={saveBio}
                          disabled={bioSaving}
                          className="rounded-lg bg-sky-500 hover:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 text-xs font-semibold px-3 py-2 transition"
                        >
                          {bioSaving ? '...' : 'Kaydet'}
                        </button>
                      </div>
                    </div>
                    {bioError && <p className="text-xs text-red-300">{bioError}</p>}
                  </div>
                )}
              </div>

              {user.university && (
                <p className="text-slate-300 flex items-center gap-2 mt-1">
                  <Building2 className="w-4 h-4 text-slate-500" />
                  {user.university}
                </p>
              )}
              {user.department && (
                <p className="text-slate-400 flex items-center gap-2 mt-0.5">
                  <GraduationCap className="w-4 h-4 text-slate-500" />
                  {user.department}
                </p>
              )}
              <div className="mt-2">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${tierColor[user.tier] || tierColor.free}`}
                >
                  <Crown className="w-3.5 h-3.5" />
                  Abonelik: {tierLabel[user.tier] || user.tier}
                </span>
              </div>
            </div>
          </div>

          {isOwner && (bannerFile || bannerPreviewUrl || bannerError) && (
            <div className="px-6 pb-4 -mt-2 flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <button
                type="button"
                onClick={saveBanner}
                disabled={bannerSaving || !bannerFile}
                className="inline-flex items-center justify-center rounded-lg bg-sky-500 hover:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 text-xs font-semibold px-4 py-2 transition"
              >
                {bannerSaving ? 'Kaydediliyor...' : 'Banner Kaydet'}
              </button>
              {bannerError && <p className="text-xs text-red-300">{bannerError}</p>}
              {!bannerError && bannerFile && (
                <p className="text-xs text-slate-400">Seçilen dosya: {bannerFile.name}</p>
              )}
            </div>
          )}

          {isOwner && (avatarFile || avatarPreviewUrl || avatarError) && (
            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <button
                type="button"
                onClick={saveAvatar}
                disabled={avatarSaving || !avatarFile}
                className="inline-flex items-center justify-center rounded-lg bg-sky-500 hover:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 text-xs font-semibold px-4 py-2 transition"
              >
                {avatarSaving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
              {avatarError && <p className="text-xs text-red-300">{avatarError}</p>}
              {!avatarError && avatarFile && (
                <p className="text-xs text-slate-400">Seçilen dosya: {avatarFile.name}</p>
              )}
            </div>
          )}
          </div>
        </div>

        {/* BiriVar AI limitleri - sadece profil sahibi görür */}
        {isOwner && (
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 mb-8">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-200">BiriVar AI hakların</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{tierLimitsText}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
                <p className="text-xs text-slate-400">Mesaj (günlük)</p>
                <p className="text-lg font-bold text-emerald-300">
                  {remainingMessages === Infinity ? 'Sınırsız' : remainingMessages}
                </p>
              </div>
              <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
                <p className="text-xs text-slate-400">Dosya (günlük)</p>
                <p className="text-lg font-bold text-sky-300">
                  {remainingDailyFiles === Infinity ? 'Sınırsız' : remainingDailyFiles}
                </p>
              </div>
              <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
                <p className="text-xs text-slate-400">Dosya (toplam)</p>
                <p className="text-lg font-bold text-slate-200">
                  {remainingTotalFiles === Infinity ? 'Sınırsız' : remainingTotalFiles}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Kullanıcının postları */}
        <section>
          <h2 className="text-lg font-semibold text-slate-200 mb-3">Paylaşımlarım</h2>
          {loading && (
            <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 text-sm text-slate-400">
              Yükleniyor...
            </div>
          )}
          {error && !loading && (
            <div className="rounded-xl bg-red-900/40 border border-red-700/60 p-4 text-sm text-red-100">
              {error}
            </div>
          )}
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <PostCardSkeleton key={`p-sk-${i}`} />
              ))}
            </div>
          )}
          {!loading && !error && posts.length === 0 && (
            <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-6 text-center text-slate-400">
              Henüz paylaşım yok.
            </div>
          )}
          {!loading && !error && posts.length > 0 && (
            <div className="space-y-2">
              {posts.map((post) => (
                <article
                  key={post._id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openPost(post)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') openPost(post);
                  }}
                  className="group rounded-xl bg-slate-900/80 border border-slate-800 p-3 hover:border-slate-700 hover:shadow-[0_0_0_1px_rgba(56,189,248,0.15)] transition cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-500 mb-1">
                        {new Date(post.createdAt).toLocaleString('tr-TR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="text-sm text-slate-100 whitespace-pre-line line-clamp-3">
                        {post.content}
                      </p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <div className="flex gap-1">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-slate-300">
                          {post.category === 'dept' ? 'Bölüm' : 'Üniversite'}
                        </span>
                        {post.author?.university && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-sky-300">
                            {post.author.university}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <ThumbsUp className="w-3.5 h-3.5 text-slate-500" />
                      {post.upvotes?.length ?? 0}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5 text-slate-500" />
                      {post.comments?.length ?? 0}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Detay Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={closePost}
            aria-hidden="true"
          />
          <div className="relative w-full sm:max-w-2xl bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-start justify-between p-4 border-b border-slate-800">
              <div className="min-w-0">
                <p className="text-xs text-slate-400">
                  {new Date(selectedPost.createdAt).toLocaleString('tr-TR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-slate-300">
                    {selectedPost.category === 'dept' ? 'Bölüm' : 'Üniversite'}
                  </span>
                  {selectedPost.author?.university && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-sky-300">
                      {selectedPost.author.university}
                    </span>
                  )}
                  {selectedPost.author?.department && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-emerald-300">
                      {selectedPost.author.department}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={closePost}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
                aria-label="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[90vh]">
              <p className="text-sm text-slate-100 whitespace-pre-line">
                {selectedPost.content}
              </p>

              <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <ThumbsUp className="w-4 h-4 text-slate-500" />
                  {selectedPost.upvotes?.length ?? 0} beğeni
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageCircle className="w-4 h-4 text-slate-500" />
                  {selectedPost.comments?.length ?? 0} yorum
                </span>
              </div>

              <div className="mt-6 border-t border-slate-800 pt-4">
                <h3 className="text-sm font-semibold text-slate-200 mb-2">Yorumlar</h3>
                {commentsLoading ? (
                  <p className="text-xs text-slate-500">Yorumlar yükleniyor...</p>
                ) : (
                  <CommentThread
                    comments={comments}
                    replyingToId={replyToCommentId}
                    onReplyToggle={(commentId) =>
                      setReplyToCommentId((prev) => (prev === commentId ? null : commentId))
                    }
                    replyTextById={replyTextById}
                    onReplyTextChange={(commentId, value) =>
                      setReplyTextById((prev) => ({ ...prev, [commentId]: value }))
                    }
                    onReplySubmit={(commentId) => submitComment(commentId)}
                    onReplyCancel={(commentId) => {
                      setReplyTextById((prev) => ({ ...prev, [commentId]: '' }));
                      setReplyToCommentId(null);
                    }}
                    sendingForPost={commentSending}
                  />
                )}

                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Yorum yaz..."
                    className="flex-1 rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        submitComment(null);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => submitComment(null)}
                    disabled={commentSending || !commentText.trim()}
                    className="rounded-lg bg-sky-500 hover:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 text-xs font-semibold px-3 py-2 transition"
                  >
                    {commentSending ? '...' : 'Gönder'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
