import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import TrendingPanel from '../components/TrendingPanel';
import { X } from 'lucide-react';

export default function Explore() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  let user = null;
  if (storedUser) {
    try {
      user = JSON.parse(storedUser);
    } catch {
      user = null;
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar user={user} title="BiriVar" onMenuClick={() => setDrawerOpen((v) => !v)} />

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

      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[260px,minmax(0,1fr)] gap-6">
          <aside className="hidden lg:block space-y-4">
            <Sidebar />
          </aside>

          <main className="space-y-4">
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 overflow-hidden">
              <div className="px-4 py-4 border-b border-slate-800">
                <h1 className="text-lg font-bold text-slate-100">Keşfet</h1>
                <p className="text-xs text-slate-400 mt-1">
                  Twitter (X) tarzı gündem listesi. Bir konuya tıklayınca akış filtrelenir.
                </p>
              </div>
              <TrendingPanel title="Gündem" />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

