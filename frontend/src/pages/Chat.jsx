import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Paperclip, Send, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

const api = axios.create({ baseURL: '' });
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const t = localStorage.getItem('token');
    if (t) config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

export default function Chat() {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Merhaba! Sana nasıl yardımcı olabilirim?' },
  ]);
  const [input, setInput] = useState('');
  const [file, setFile] = useState(null); // { name, mimeType, base64 }
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch {}
    }
  }, [navigate]);

  const canSend = input.trim().length > 0 && !sending;

  const pickFile = () => fileRef.current?.click();

  const onFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result || '').split(',')[1] || '';
      setFile({ name: f.name, mimeType: f.type || 'application/octet-stream', base64 });
    };
    reader.readAsDataURL(f);
  };

  const send = async () => {
    if (!canSend) return;
    setError('');
    const userText = input.trim();
    setInput('');

    setMessages((prev) => [...prev, { role: 'user', text: userText, file }]);
    setSending(true);

    try {
      const res = await api.post('/api/ai/chat', {
        message: userText,
        file: file ? { name: file.name, mimeType: file.mimeType, base64: file.base64 } : null,
      });
      setMessages((prev) => [...prev, { role: 'assistant', text: res.data.reply }]);
      setFile(null);
    } catch (err) {
      setError(err?.response?.data?.message || 'Bir hata oluştu.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar user={currentUser} title="BiriVar" onMenuClick={() => setDrawerOpen((v) => !v)} />

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
          <aside className="hidden lg:block">
            <Sidebar />
          </aside>

          <main className="rounded-xl bg-slate-900/70 border border-slate-800 overflow-hidden flex flex-col min-h-[70vh]">
            <div className="px-4 py-3 border-b border-slate-800">
              <h2 className="text-sm font-semibold text-slate-200">BiriVar AI</h2>
              <p className="text-xs text-slate-400">ChatGPT tarzı sohbet</p>
            </div>

            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm border ${
                    m.role === 'user'
                      ? 'ml-auto bg-sky-500/10 border-sky-500/30 text-slate-100'
                      : 'mr-auto bg-slate-950/60 border-slate-800 text-slate-100'
                  }`}
                >
                  {m.file?.name && (
                    <p className="text-[11px] text-slate-400 mb-1">📎 {m.file.name}</p>
                  )}
                  <p className="whitespace-pre-line">{m.text}</p>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-slate-800">
              {error && <p className="text-xs text-red-300 mb-2">{error}</p>}
              {file?.name && (
                <div className="mb-2 text-xs text-slate-300 flex items-center justify-between border border-slate-800 bg-slate-950/60 rounded-lg px-3 py-2">
                  <span>📎 {file.name}</span>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    Kaldır
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={pickFile}
                  className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 transition"
                  title="Dosya ekle"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,image/*"
                  onChange={onFileChange}
                />
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Mesaj yaz..."
                  className="flex-1 rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      send();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={!canSend}
                  className="px-3 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 text-sm font-semibold transition inline-flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Gönder
                </button>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Free: günlük 5 mesaj, toplam 2 dosya • Pro: sınırsız mesaj, günlük 10 dosya • Premium: sınırsız
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

