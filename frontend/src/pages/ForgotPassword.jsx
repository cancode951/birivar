import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldownUntil, setCooldownUntil] = useState(0);

  const now = Date.now();
  const cooldownMs = Math.max(0, cooldownUntil - now);
  const cooldownSec = Math.ceil(cooldownMs / 1000);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (cooldownMs > 0) {
      const msg = `Lutfen ${cooldownSec} saniye bekleyip tekrar dene.`;
      setError(msg);
      toast.error(msg);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/forgot-password', { email: email.trim() });
      setCooldownUntil(Date.now() + 60_000);
      toast.success(
        res?.data?.message ||
          'Eger e-posta kayitliysa sifre sifirlama linki gonderilecektir.'
      );
      setTimeout(() => navigate('/login'), 900);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        'Islem tamamlanamadi. Biraz sonra tekrar deneyebilirsin.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827] no-theme-invert flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 sm:p-7 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Sifremi Unuttum</h1>
        <p className="text-sm text-gray-600 mt-2 leading-relaxed">
          Hesabina bagli e-posta adresini gir. Sifre yenileme baglantisini gonderelim.
        </p>
        <p className="text-xs text-gray-500 mt-2 leading-relaxed">
          Not: Link 15 dakika gecerlidir. Spam/Junk klasorunu da kontrol etmeyi unutma.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">E-posta</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@mail.com"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={loading || cooldownMs > 0}
            className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 text-sm transition"
          >
            {loading
              ? 'Gonderiliyor...'
              : cooldownMs > 0
              ? `Tekrar gonder (${cooldownSec}s)`
              : 'Sifre Sifirlama Linki Gonder'}
          </button>
        </form>

        <p className="mt-5 text-sm text-gray-600">
          <Link to="/login" className="text-blue-700 hover:text-blue-800 font-semibold">
            Giris ekranina don
          </Link>
        </p>
      </div>
    </div>
  );
}
