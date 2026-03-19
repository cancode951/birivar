import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { connectSocket } from '../lib/socket';
import toast from 'react-hot-toast';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      if (user?._id) connectSocket({ userId: user._id });
      toast.success('Giris basarili.');
      navigate('/dashboard');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Giris yapilamadi.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
        <h1 className="text-xl font-bold text-slate-100 text-center mb-6">
          BiriVar
        </h1>
        <p className="text-slate-400 text-sm text-center mb-4">Hesabına giriş yap</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              E-posta
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="ornek@mail.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Şifre
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="••••••••"
            />
            <div className="mt-2 text-right">
              <Link to="/forgot-password" className="text-xs text-sky-400 hover:text-sky-300">
                Sifremi Unuttum
              </Link>
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-sky-500 hover:bg-sky-400 disabled:bg-slate-600 text-slate-950 font-semibold py-2 text-sm transition"
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş yap'}
          </button>
        </form>
        <p className="text-center text-slate-500 text-sm mt-4">
          Hesabın yok mu?{' '}
          <Link to="/register" className="text-sky-400 hover:text-sky-300">
            Kayıt ol
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
