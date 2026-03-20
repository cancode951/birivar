import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, LogOut, ChevronDown, Menu, MessageCircle, Settings, Sun, Moon, Crown, Gift } from 'lucide-react';
import { disconnectSocket } from '../lib/socket';
import { useUnreadMessages } from '../context/UnreadMessagesContext';
import { useTheme } from '../context/ThemeContext';

/**
 * surface:
 * - "default" — Koyu slate; aydınlık temada (html.theme-light + global invert) doğru görünür.
 * - "light" — Gerçek açık tema (beyaz/gri); sadece `no-theme-invert` saran sayfalarda kullan (ör. Pricing).
 */
const Navbar = ({ user, title = 'BiriVar', onMenuClick = null, surface = 'default' }) => {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { unreadCount: unreadMsg } = useUnreadMessages();
  const { theme, setTheme } = useTheme();

  const useLightChrome = surface === 'light';

  const c = useMemo(() => {
    if (useLightChrome) {
      return {
        header: 'bg-white/95 border-gray-200',
        title: 'text-gray-900',
        iconBtn: 'bg-gray-100 border-gray-200 text-gray-800 hover:bg-gray-200',
        menuTrigger: 'bg-gray-100 border-gray-200 hover:bg-gray-200',
        chevron: 'text-gray-500',
        dropdown: 'bg-white border-gray-200 shadow-lg',
        item: 'text-gray-800 hover:bg-gray-100',
        settingsBtn: 'text-gray-800 hover:bg-gray-100',
        themeDarkOn: 'bg-gray-100 border-gray-300 text-gray-900',
        themeDarkOff: 'border-transparent text-gray-700 hover:bg-gray-50',
        themeLightOn: 'bg-blue-50 border-blue-200 text-gray-900',
        themeLightOff: 'border-transparent text-gray-700 hover:bg-gray-50',
        logout: 'text-gray-800 hover:bg-gray-100',
        avatarRing: 'border-gray-200 hover:bg-gray-50',
        badgeBorder: 'border-white',
        mobileMenuBtn: 'bg-gray-100 border-gray-200 text-gray-800 hover:bg-gray-200',
      };
    }
    /* default: koyu chrome — theme-light + invert ile uyumlu */
    return {
      header: 'bg-slate-900/95 border-gray-800',
      title: 'text-slate-100',
      iconBtn: 'bg-slate-800/70 border-slate-700 text-slate-200 hover:bg-slate-700',
      menuTrigger: 'bg-slate-800 border-slate-700 hover:bg-slate-700',
      chevron: 'text-slate-400',
      dropdown: 'bg-slate-800 border-slate-700 shadow-xl',
      item: 'text-slate-200 hover:bg-slate-700',
      settingsBtn: 'text-slate-200 hover:bg-slate-700',
      themeDarkOn: 'bg-slate-700 border-slate-600 text-slate-100',
      themeDarkOff: 'border-transparent text-slate-200 hover:bg-slate-700/60',
      themeLightOn: 'bg-slate-700 border-slate-600 text-slate-100',
      themeLightOff: 'border-transparent text-slate-200 hover:bg-slate-700/60',
      logout: 'text-slate-200 hover:bg-slate-700',
      avatarRing: 'border-slate-700 hover:bg-slate-700',
      badgeBorder: 'border-slate-900',
      mobileMenuBtn: 'bg-slate-800/70 border-slate-700 text-slate-200 hover:bg-slate-700',
    };
  }, [useLightChrome]);

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
    <header
      className={`sticky top-0 z-50 flex items-center justify-between h-14 px-4 border-b backdrop-blur sm:px-6 ${c.header}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className={`lg:hidden p-2 rounded-lg border transition ${c.mobileMenuBtn}`}
            aria-label="Menüyü aç"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <Link
          to="/dashboard"
          className={`text-base sm:text-lg font-bold truncate ${c.title}`}
          title={title}
        >
          {title}
        </Link>
      </div>

      <div className="relative flex items-center gap-2" ref={dropdownRef}>
        <Link
          to="/messages"
          onClick={() => setDropdownOpen(false)}
          className={`relative p-2 rounded-lg border transition ${c.iconBtn}`}
          aria-label="Mesajlar"
        >
          <MessageCircle className="w-5 h-5" />
          {Number(unreadMsg) > 0 && (
            <span
              className={`absolute -top-0.5 -right-0.5 min-w-[1.125rem] h-[1.125rem] px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border-2 ${c.badgeBorder}`}
            >
              {Number(unreadMsg) > 99 ? '99+' : unreadMsg}
            </span>
          )}
        </Link>

        <Link
          to="/profile"
          onClick={() => setDropdownOpen(false)}
          className={`h-9 w-9 rounded-full border transition flex items-center justify-center ${c.avatarRing}`}
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

        <button
          type="button"
          onClick={() => setDropdownOpen((o) => !o)}
          className={`flex items-center gap-2 rounded-full border px-2 py-1.5 transition ${c.menuTrigger}`}
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
          aria-label="Hesap menüsü"
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform ${c.chevron} ${dropdownOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {dropdownOpen && (
          <div className={`absolute right-0 top-full mt-2 w-48 rounded-xl py-1 border ${c.dropdown}`}>
            <Link
              to="/profile"
              onClick={() => setDropdownOpen(false)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm transition ${c.item}`}
            >
              <User className="w-4 h-4 shrink-0" />
              Profilim
            </Link>

            <Link
              to="/pricing"
              onClick={() => setDropdownOpen(false)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm transition ${c.item}`}
            >
              <Crown className="w-4 h-4 shrink-0" />
              Plan Yukselt
            </Link>

            <Link
              to="/referral"
              onClick={() => setDropdownOpen(false)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm transition ${c.item}`}
            >
              <Gift className="w-4 h-4 shrink-0" />
              Referans Programi
            </Link>

            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition ${c.settingsBtn}`}
              aria-expanded={settingsOpen}
            >
              <Settings className="w-4 h-4 shrink-0" />
              Ayarlar
              <ChevronDown
                className={`ml-auto w-4 h-4 transition-transform ${c.chevron} ${settingsOpen ? 'rotate-180' : ''}`}
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
                    theme === 'dark' ? c.themeDarkOn : c.themeDarkOff
                  }`}
                >
                  <Moon className="w-4 h-4 shrink-0 opacity-90" />
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
                    theme === 'light' ? c.themeLightOn : c.themeLightOff
                  }`}
                >
                  <Sun className="w-4 h-4 shrink-0 opacity-90" />
                  Aydınlık Mod
                </button>
              </div>
            )}

            <button
              onClick={handleLogout}
              className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm transition rounded-b-xl ${c.logout}`}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              Çıkış Yap
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
