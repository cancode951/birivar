import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { Gift, Star, Copy, MessageCircle } from 'lucide-react';

const api = axios.create({ baseURL: '' });
api.interceptors.request.use((config) => {
  const t = localStorage.getItem('token');
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export default function ReferralCard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/users/referral/me');
        if (!alive) return;
        setData(res.data || null);
      } catch (e) {
        if (!alive) return;
        setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!data?.rewardUnlocked) return;
    try {
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.65 },
      });
    } catch {}
    toast.success('Tebrikler, 1 Haftalik Premium Tanimlandi!');
  }, [data?.rewardUnlocked]);

  const progressWidth = useMemo(() => {
    const p = Number(data?.progress || 0);
    return `${Math.min(100, (p / 3) * 100)}%`;
  }, [data?.progress]);

  const copyLink = async () => {
    if (!data?.referralLink) return;
    try {
      setCopying(true);
      await navigator.clipboard.writeText(data.referralLink);
      toast.success('Davet linkin kopyalandi.');
    } catch {
      toast.error('Link kopyalanamadi.');
    } finally {
      setCopying(false);
    }
  };

  const shareWhatsApp = () => {
    if (!data?.referralLink) return;
    const text = encodeURIComponent(
      `BiriVar'a katil! Benim davet linkim: ${data.referralLink}\n3 arkadas davet ederek Premium odul kazanabilirsin.`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 mb-8">
        <p className="text-sm text-slate-400">Davet paneli yukleniyor...</p>
      </div>
    );
  }

  if (!data) return null;

  const remain = Number(data.remainingForNext || 0);
  const totalRef = Number(data.referredCount || 0);
  const progressText =
    remain === 0 && totalRef > 0
      ? `Bu hedef tamam! (${totalRef} toplam davet) Premium odulun tanimlandi.`
      : `${data.progress}/3 — ${remain} kisi daha davet edersen 1 haftalik Premium kazanirsin.`;

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 mb-8">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl bg-amber-500/15 flex items-center justify-center">
          <Gift className="w-6 h-6 text-amber-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-200">Arkadaslarini Davet Et</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            3 arkadasini davet et, 1 hafta ucretsiz Premium kazan.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-slate-950/60 border border-slate-800 p-3">
        <p className="text-xs text-slate-400 mb-2">Senin referans linkin</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            readOnly
            value={data.referralLink}
            className="flex-1 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-200"
          />
          <button
            type="button"
            onClick={copyLink}
            disabled={copying}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-60 text-slate-950 text-xs font-semibold px-3 py-2 transition"
          >
            <Copy className="w-4 h-4" />
            {copying ? 'Kopyalaniyor...' : 'Linkini Kopyala'}
          </button>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs text-slate-300 mb-2 inline-flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-amber-300" />
          {progressText}
        </p>
        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-sky-500 to-emerald-400" style={{ width: progressWidth }} />
        </div>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={shareWhatsApp}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 text-xs font-semibold px-3 py-2 transition"
        >
          <MessageCircle className="w-4 h-4" />
          WhatsApp'ta Paylas
        </button>
      </div>
    </div>
  );
}
