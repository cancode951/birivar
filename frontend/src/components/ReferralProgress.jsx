import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Check, Loader2, Target } from 'lucide-react';

const api = axios.create({ baseURL: '' });
api.interceptors.request.use((config) => {
  const t = localStorage.getItem('token');
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

/** API yanıtı gelmezse kırmızı hata yerine 0/3 göster */
const EMPTY_REFERRAL = {
  referredCount: 0,
  progress: 0,
  remainingForNext: 3,
  referralCode: '',
  referralLink: '',
  rewardUnlocked: false,
};

function mergeReferralPayload(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  return {
    ...EMPTY_REFERRAL,
    ...o,
    referredCount: Number(o.referredCount ?? 0),
    progress: Math.min(3, Math.max(0, Number(o.progress ?? 0))),
    remainingForNext: Math.min(3, Math.max(0, Number(o.remainingForNext ?? 3))),
  };
}

/**
 * Referans hedefine (3 kişi) göre canlı ilerleme: adım noktaları + ilerleme çubuğu.
 * @param {{ compact?: boolean, className?: string }} props
 */
export default function ReferralProgress({ compact = false, className = '' }) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const [loading, setLoading] = useState(!!token);
  const [data, setData] = useState(() => mergeReferralPayload(null));

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/users/referral/me');
        if (!alive) return;
        setData(mergeReferralPayload(res.data));
      } catch {
        if (!alive) return;
        setData(mergeReferralPayload(null));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  const p = Math.min(3, Math.max(0, Number(data?.progress ?? 0)));

  const steps = useMemo(() => {
    return [1, 2, 3].map((i) => ({
      n: i,
      done: p >= i,
      current: p === i - 1 && p < 3,
    }));
  }, [p]);

  const barWidth = `${(p / 3) * 100}%`;

  const subtitle = useMemo(() => {
    const total = Number(data.referredCount ?? 0);
    const remain = Number(data.remainingForNext ?? 0);
    if (remain === 0 && total > 0 && p === 3) {
      return 'Bu döngü tamamlandı — Premium ödülün hesabına tanımlandı.';
    }
    if (total === 0) {
      return 'Henüz kimseyi davet etmedin. Linkini paylaşarak ilerlemeyi buradan takip edebilirsin.';
    }
    return `${p}/3 kişi — ${remain} kişi daha Premium ödülü için yeterli.`;
  }, [data, p]);

  if (!token) {
    return (
      <div
        className={`rounded-xl border border-slate-700 bg-slate-900/50 p-4 ${className}`}
      >
        <p className="text-xs text-slate-400">
          İlerlemeni görmek için{' '}
          <Link to="/login" className="text-sky-400 hover:underline">
            giriş yap
          </Link>
          .
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className={`rounded-xl border border-slate-700 bg-slate-900/50 p-4 flex items-center gap-2 ${className}`}
      >
        <Loader2 className="w-4 h-4 text-sky-400 animate-spin shrink-0" />
        <span className="text-xs text-slate-400">İlerleme yükleniyor…</span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-slate-700 bg-slate-900/60 ${compact ? 'p-3' : 'p-4'} ${className}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="h-8 w-8 rounded-lg bg-sky-500/15 flex items-center justify-center shrink-0">
          <Target className="w-4 h-4 text-sky-400" />
        </div>
        <div className="min-w-0">
          <p className={`font-semibold text-slate-100 ${compact ? 'text-xs' : 'text-sm'}`}>
            Davet ilerlemesi
          </p>
          <p className={`text-slate-500 ${compact ? 'text-[10px]' : 'text-xs'} mt-0.5`}>
            Toplam davet: <span className="text-slate-300">{data.referredCount}</span>
          </p>
        </div>
      </div>

      <div className="flex justify-between gap-2 mb-2">
        {steps.map((s) => (
          <div key={s.n} className="flex flex-col items-center flex-1 min-w-0">
            <div
              className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold border-2 transition shrink-0 ${
                s.done
                  ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                  : s.current
                    ? 'bg-sky-500/20 border-sky-500 text-sky-300 ring-2 ring-sky-500/30'
                    : 'bg-slate-800 border-slate-600 text-slate-500'
              }`}
            >
              {s.done ? <Check className="w-4 h-4" /> : s.n}
            </div>
            <span className={`mt-1.5 text-center ${compact ? 'text-[9px]' : 'text-[10px]'} text-slate-500`}>
              {s.n}. davet
            </span>
          </div>
        ))}
      </div>

      <div className="h-2 rounded-full bg-slate-800 overflow-hidden mb-3">
        <div
          className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-500"
          style={{ width: barWidth }}
        />
      </div>

      <p className={`text-slate-400 leading-relaxed ${compact ? 'text-[11px]' : 'text-xs'}`}>
        {subtitle}
      </p>
    </div>
  );
}
