import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Brain, Building2, MessageCircle, TrendingUp, Sparkles } from 'lucide-react';

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition">
      <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
        <Icon className="w-5 h-5 text-blue-600" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-600 leading-relaxed">{description}</p>
    </article>
  );
}

function TrendRow({ topic, count, subtitle }) {
  return (
    <li className="rounded-xl border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50 transition">
      <p className="text-[11px] text-gray-500">{subtitle}</p>
      <p className="text-sm font-semibold text-gray-900 mt-0.5">{topic}</p>
      <p className="text-xs text-gray-600 mt-1">{count}</p>
    </li>
  );
}

export default function Landing() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827] no-theme-invert">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
              BV
            </div>
            <span className="text-base sm:text-lg font-semibold text-gray-900">BiriVar</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-lg border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition"
            >
              Giriş Yap
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                <Sparkles className="w-3.5 h-3.5" />
                Kampus odakli sosyal deneyim
              </p>
              <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 leading-tight">
                Kampusun Akilli Sosyal Agina Hos Geldin!
              </h1>
              <p className="mt-4 text-sm sm:text-base text-gray-600 leading-relaxed max-w-xl">
                Turkiye'deki tum universiteler ve bolumlerle baglantida kal. Yapay zeka asistaninla
                vaka analizleri yap, anonim tartismalara katil ve gundemi takip et.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  to="/register"
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 transition"
                >
                  Hemen Katil
                </Link>
                <Link
                  to="/login"
                  className="rounded-lg border border-blue-600 text-blue-700 hover:bg-blue-50 text-sm font-semibold px-5 py-2.5 transition"
                >
                  Giris Yap
                </Link>
                <Link
                  to="/pricing"
                  className="rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-semibold px-5 py-2.5 transition"
                >
                  Paketleri Incele
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-lg">
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="h-10 bg-gray-100 border-b border-gray-200 flex items-center gap-2 px-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                </div>
                <div className="p-4 bg-gradient-to-b from-white to-blue-50/50">
                  <div className="rounded-xl border border-blue-100 bg-white p-3">
                    <p className="text-xs text-gray-500">Anonim dertlesme</p>
                    <p className="text-sm text-gray-900 mt-1">
                      "Sinav stresi cok artti, odaklanmakta zorlaniyorum..."
                    </p>
                    <div className="mt-2 rounded-lg bg-blue-50 border border-blue-100 p-2">
                      <p className="text-[11px] font-medium text-blue-700">Empatik not</p>
                      <p className="text-xs text-gray-700 mt-1">
                        Duygularin gecerli. Kucuk adimlarla ilerlemek bile gucludur.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-gray-200 bg-white p-2">
                      <p className="text-[11px] text-gray-500">Gundem</p>
                      <p className="text-xs font-semibold text-gray-900 mt-1">#vizehaftasi</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-2">
                      <p className="text-[11px] text-gray-500">Mesajlar</p>
                      <p className="text-xs font-semibold text-gray-900 mt-1">3 yeni konusma</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-8 sm:pb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Ozellikler</h2>
          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <FeatureCard
              icon={Brain}
              title="BiriVar AI"
              description="Her an yaninda olan akademik asistan. Dosyalarini yukle, analiz etsin."
            />
            <FeatureCard
              icon={Building2}
              title="Universite Filtreleme"
              description="Sadece kendi kampusundeki veya bolumundeki gelismeleri gor."
            />
            <FeatureCard
              icon={MessageCircle}
              title="Anlik Mesajlasma"
              description="Meslektaslarinla veya okul arkadaslarinla guvenli ve hizli iletisim kur."
            />
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 sm:pb-16">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Gundemdeki Konular</h2>
            </div>
            <p className="text-sm text-gray-600 mt-1">Twitter tarzi trend listesi onizlemesi</p>
            <ul className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <TrendRow subtitle="Turkiye gundeminde" topic="#vizehaftasi" count="1.204 paylasim" />
              <TrendRow subtitle="Universitende populer" topic="#stajbasvurusu" count="842 paylasim" />
              <TrendRow subtitle="Bugun cok konusuluyor" topic="#kampushayati" count="615 paylasim" />
              <TrendRow subtitle="Yeni yukseliste" topic="#bitirmeprojesi" count="402 paylasim" />
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
