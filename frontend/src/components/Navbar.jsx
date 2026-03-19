import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, LogOut, ChevronDown, Menu, MessageCircle, Settings, Sun, Moon } from 'lucide-react';
import { disconnectSocket } from '../lib/socket';
import { useUnreadMessages } from '../context/UnreadMessagesContext';
import { useTheme } from '../context/ThemeContext';

const Navbar = ({ user, title = 'BiriVar', onMenuClick = null }) => {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { unreadCount: unreadMsg } = useUnreadMessages();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
        setSettingsOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    disconnectSocket();
    setDropdownOpen(false);
    navigate('/login');
  };

  const initial = user?.username
    ? user.username.charAt(0).toUpperCase()
    : '?';

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between h-14 px-4 bg-slate-900/95 border-b border-gray-800 backdrop-blur sm:px-6">
      <div className="flex items-center gap-2 min-w-0">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg bg-slate-800/70 border border-slate-700 text-slate-200 hover:bg-slate-700 transition"
            aria-label="Menüyü aç"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <Link
          to="/dashboard"
          className="text-base sm:text-lg font-bold text-slate-100 truncate"
          title={title}
        >
          {title}
        </Link>
      </div>

      <div className="relative flex items-center gap-2" ref={dropdownRef}>
        <Link
          to="/messages"
          onClick={() => setDropdownOpen(false)}
          className="relative p-2 rounded-lg bg-slate-800/70 border border-slate-700 text-slate-200 hover:bg-slate-700 transition"
          aria-label="Mesajlar"
        >
          <MessageCircle className="w-5 h-5" />
          {Number(unreadMsg) > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[1.125rem] h-[1.125rem] px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-slate-900">
              {Number(unreadMsg) > 99 ? '99+' : unreadMsg}
            </span>
          )}
        </Link>

        {/* Avatar: her cihazda /profile'a gider */}
        <Link
          to="/profile"
          onClick={() => setDropdownOpen(false)}
          className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-700 transition flex items-center justify-center"
          aria-label="Profil"
        >
          <span className="h-8 w-8 rounded-full bg-gradient-to-br from-sky-500 to-emerald-400 flex items-center justify-center text-sm font-semibold text-slate-950">
            {user?.profilePicture ? (
              <img src={user.profilePicture} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              initial
            )}
          </span>
        </Link>

        {/* Menü butonu */}
        <button
          type="button"
          onClick={() => setDropdownOpen((o) => !o)}
          className="flex items-center gap-2 rounded-full bg-slate-800 border border-slate-700 px-2 py-1.5 hover:bg-slate-700 transition"
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
          aria-label="Hesap menüsü"
        >
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-slate-800 border border-slate-700 shadow-xl py-1">
            <Link
              to="/profile"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 transition"
            >
              <User className="w-4 h-4" />
              Profilim
            </Link>

            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 transition"
              aria-expanded={settingsOpen}
            >
              <Settings className="w-4 h-4" />
              Ayarlar
              <ChevronDown
                className={`ml-auto w-4 h-4 text-slate-400 transition-transform ${settingsOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {settingsOpen && (
              <div className="px-2 pb-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setTheme('dark');
                    setDropdownOpen(false);
                    setSettingsOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition border ${
                    theme === 'dark'
                      ? 'bg-slate-700 border-slate-600 text-slate-100'
                      : 'bg-slate-900/0 border-transparent text-slate-200 hover:bg-slate-700/60'
                  }`}
                >
                  <Moon className="w-4 h-4 text-slate-200" />
                  Koyu Tema
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTheme('light');
                    setDropdownOpen(false);
                    setSettingsOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm mt-2 rounded-lg transition border ${
                    theme === 'light'
                      ? 'bg-slate-700 border-slate-600 text-slate-100'
                      : 'bg-slate-900/0 border-transparent text-slate-200 hover:bg-slate-700/60'
                  }`}
                >
                  <Sun className="w-4 h-4 text-slate-200" />
                  Aydınlık Mod
                </button>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 transition rounded-b-xl"
            >
              <LogOut className="w-4 h-4" />
              Çıkış Yap
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
