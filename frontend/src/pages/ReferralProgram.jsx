import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Gift, Users, Crown, Star } from 'lucide-react';
import Navbar from '../components/Navbar';
import ReferralProgress from '../components/ReferralProgress';

function Step({ icon: Icon, title, desc }) {
  return (
    <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-4">
      <div className="h-9 w-9 rounded-lg bg-amber-500/15 flex items-center justify-center">
        <Icon className="w-5 h-5 text-amber-300" />
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-100">{title}</p>
      <p className="mt-1 text-xs text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}

export default function ReferralProgram() {
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar user={currentUser} title="BiriVar" />
      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 sm:p-8">
          <p className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-300">
            <Gift className="w-3.5 h-3.5" />
            Davet Programi
          </p>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-slate-100">
            3 Arkadasini Davet Et, 1 Hafta Ucretsiz Premium Kazan
          </h1>
          <p className="mt-3 text-sm text-slate-400 leading-relaxed">
            Referans linkini arkadaslarinla paylas. Linkinle kayit olan her yeni uye sayilir.
            3 kisi tamamlandiginda premium odulun otomatik tanimlanir.
          </p>

          <div className="mt-8">
            <h2 className="text-sm font-semibold text-slate-200 mb-3">Senin ilerlemen</h2>
            <ReferralProgress />
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3">
            <Step
              icon={Users}
              title="1) Linkini Paylas"
              desc="Profilindeki davet panelinden ozel referans linkini kopyala veya WhatsApp'ta paylas."
            />
            <Step
              icon={Star}
              title="2) 3 Kayit Tamamla"
              desc="Senin linkinle kayit olan her yeni uye ilerleme cubuguna eklenir."
            />
            <Step
              icon={Crown}
              title="3) Premium Odulunu Al"
              desc="3 kisiye ulasinca hesabina 1 haftalik Premium otomatik tanimlanir."
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              to="/profile"
              className="rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-sm font-semibold px-4 py-2.5 transition"
            >
              Davet Paneline Git
            </Link>
            <Link
              to="/pricing"
              className="rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-200 text-sm font-semibold px-4 py-2.5 transition"
            >
              Paketleri Incele
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
