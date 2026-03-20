import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';

const api = axios.create({ baseURL: '' });
api.interceptors.request.use((config) => {
  const t = localStorage.getItem('token');
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export default function Pricing() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [loadingPlan, setLoadingPlan] = useState('');
  const [currentPlan, setCurrentPlan] = useState('free');
  const [plans, setPlans] = useState([]);

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const flag = params.get('payment');
    if (flag === 'success') toast.success('Odeme basarili. Planin guncelleniyor.');
    if (flag === 'cancel') toast('Odeme iptal edildi.');
    if (flag === 'fail') toast.error('Odeme tamamlanamadi veya iptal edildi.');
  }, [params]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    api
      .get('/api/subscriptions/me')
      .then((res) => {
        setCurrentPlan(res?.data?.user?.plan || 'free');
        setPlans(Array.isArray(res?.data?.plans) ? res.data.plans : []);
      })
      .catch(() => {});
  }, []);

  const cards = useMemo(() => {
    if (plans.length) return plans;
    return [
      { id: 'free', title: 'Free', priceTRY: 0, aiMessageLimit: 5, analysisLimit: 3, model: 'grok' },
      { id: 'pro', title: 'Pro', priceTRY: 99.99, aiMessageLimit: 15, analysisLimit: 7, model: 'gpt-4o-mini' },
      { id: 'premium', title: 'Premium', priceTRY: 199.99, aiMessageLimit: 30, analysisLimit: 10, model: 'gpt-4o' },
    ];
  }, [plans]);

  const buy = async (plan) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast('Satin alma icin once giris yap.');
        navigate('/login');
        return;
      }
      setLoadingPlan(plan);
      const res = await api.post('/api/subscriptions/checkout', { plan });
      const url = res?.data?.checkoutUrl;
      if (!url) throw new Error('Checkout url bulunamadi.');
      window.location.href = url;
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Odeme baslatilamadi.');
    } finally {
      setLoadingPlan('');
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827] no-theme-invert">
      <Navbar user={currentUser} title="BiriVar" surface="light" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center">Abonelik Paketleri</h1>
        <p className="text-gray-600 text-center mt-3">
          Ihtiyacina uygun paketi sec, limitlerini aninda artir.
        </p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {cards.map((p) => {
            const isCurrent = currentPlan === p.id;
            const isPaid = p.id !== 'free';
            return (
              <article
                key={p.id}
                className={`rounded-2xl border bg-white p-6 shadow-sm ${
                  p.id === 'premium' ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'
                }`}
              >
                <h2 className="text-lg font-semibold text-gray-900">{p.title}</h2>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {p.priceTRY === 0 ? 'Ucretsiz' : `${String(p.priceTRY).replace('.', ',')} TL`}
                </p>
                <ul className="mt-4 space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-blue-600 mt-0.5" /> {p.aiMessageLimit} AI mesaj hakki</li>
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-blue-600 mt-0.5" /> {p.analysisLimit} anonim post analizi</li>
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-blue-600 mt-0.5" /> Model: {p.model}</li>
                </ul>

                <button
                  type="button"
                  disabled={!isPaid || isCurrent || loadingPlan === p.id}
                  onClick={() => buy(p.id)}
                  className="mt-5 w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 transition"
                >
                  {isCurrent ? 'Mevcut Planin' : !isPaid ? 'Ucretsiz Baslangic' : loadingPlan === p.id ? 'Yonlendiriliyor...' : 'Satin Al'}
                </button>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
