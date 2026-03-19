import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { token } = useParams();

  const [password, setPassword] = useState('');
  const [passwordAgain, setPasswordAgain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mismatch = passwordAgain.length > 0 && password !== passwordAgain;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      const msg = 'Sifre yenileme tokeni bulunamadi.';
      setError(msg);
      toast.error(msg);
      return;
    }
    if (password.length < 6) {
      const msg = 'Yeni sifre en az 6 karakter olmali.';
      setError(msg);
      toast.error(msg);
      return;
    }
    if (password !== passwordAgain) {
      const msg = 'Sifreler birbiriyle eslesmiyor.';
      setError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    try {
      await axios.post(`/api/auth/reset-password/${token}`, { password });
      toast.success('Sifren basariyla degistirildi.');
      setTimeout(() => navigate('/login'), 900);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Sifre guncellenemedi.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827] no-theme-invert flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 sm:p-7 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Yeni Sifre Olustur</h1>
        <p className="text-sm text-gray-600 mt-2">
          Guclu bir sifre belirleyerek hesabina guvenli sekilde devam et.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          En az 6 karakter kullan. Tahmin edilmesi zor bir sifre sec.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Yeni Sifre</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
            />
            {password.length > 0 && password.length < 6 ? (
              <p className="mt-1 text-xs text-amber-600">Sifre en az 6 karakter olmali.</p>
            ) : null}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Yeni Sifre Tekrar
            </label>
            <input
              type="password"
              required
              value={passwordAgain}
              onChange={(e) => setPasswordAgain(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
            />
            {mismatch ? (
              <p className="mt-1 text-xs text-red-600">Sifreler su an eslesmiyor.</p>
            ) : null}
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={loading || mismatch || password.length < 6}
            className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 text-sm transition"
          >
            {loading ? 'Guncelleniyor...' : 'Sifreyi Guncelle'}
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
