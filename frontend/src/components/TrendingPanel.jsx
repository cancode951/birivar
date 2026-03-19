import React, { useEffect, useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import axios from 'axios';
import { useTurkeyData } from '../context/TurkeyDataContext';
import { useLocation, useNavigate } from 'react-router-dom';

function stripLeadingHash(str) {
  return String(str || '').trim().replace(/^#/, '');
}

export default function TrendingPanel({ title = 'Gündemdeki Konular' }) {
  const { selectedUniversity, selectedDepartment, setFeedQuery } = useTurkeyData();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const params = useMemo(
    () => ({
      university: selectedUniversity?.name || undefined,
      department: selectedDepartment || undefined,
    }),
    [selectedUniversity, selectedDepartment]
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await axios.get('/api/posts/trending', { params });
        if (!cancelled) setItems(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        const status = e?.response?.status;
        const msg = e?.response?.data?.message;
        // En sık sebep: backend restart edilmedi (404) veya sunucu kapalı (Network Error)
        console.error('Trending fetch failed:', {
          status,
          data: e?.response?.data,
          message: e?.message,
        });

        if (cancelled) return;
        if (status === 404) {
          setError('Gündem endpointi bulunamadı (404). Backend’i yeniden başlat.');
          return;
        }
        if (status) {
          setError(`Gündem yüklenemedi (${status}${msg ? `: ${msg}` : ''}).`);
          return;
        }
        setError('Gündem yüklenemedi (sunucuya ulaşılamadı).');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [params]);

  return (
    <div className="rounded-xl bg-slate-900/80 border border-slate-800 overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
        <TrendingUp className="w-4 h-4 text-slate-400" />
      </div>

      <div className="border-t border-gray-800">
        {loading && (
          <div className="px-4 py-3 text-xs text-slate-500">Yükleniyor...</div>
        )}
        {!loading && error && (
          <div className="px-4 py-3 text-xs text-red-300">{error}</div>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="px-4 py-3 text-xs text-slate-500">Şu an gündem bulunamadı.</div>
        )}

        {!loading &&
          !error &&
          items.map((it, idx) => (
            <button
              key={`${it.topic || 'topic'}:${idx}`}
              type="button"
              onClick={() => {
                setFeedQuery(stripLeadingHash(it.topic || ''));
                // Explore sayfasında tıklanınca kullanıcı akışı görmek ister
                if (pathname !== '/dashboard') navigate('/dashboard');
              }}
              className="w-full text-left px-4 py-3 border-b border-gray-800 hover:bg-gray-800/50 transition"
              title="Akışı filtrele"
            >
              <p className="text-[11px] text-slate-500">{it.subtitle || 'Türkiye tarihinde gündem'}</p>
              <p className="text-sm font-semibold text-slate-100 mt-0.5">{it.topic || '#'}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{it.countLabel || '— Paylaşım'}</p>
            </button>
          ))}
      </div>
    </div>
  );
}

