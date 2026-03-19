import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Sparkles, User, ChevronDown, Search, MessagesSquare, PanelLeftClose, PanelLeftOpen, Ghost } from 'lucide-react';
import { useTurkeyData } from '../context/TurkeyDataContext';
import { useLocalStorageBoolean } from '../lib/uiPrefs';
import { useUnreadMessages } from '../context/UnreadMessagesContext';

const NavItem = ({ to, icon: Icon, label, collapsed, badgeCount = 0 }) => {
  const { pathname } = useLocation();
  const active = pathname === to;
  return (
    <Link
      to={to}
      title={collapsed ? label : undefined}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm border transition ${
        active
          ? 'bg-sky-500/10 border-sky-500/40 text-sky-200'
          : 'bg-slate-900/60 border-slate-800 text-slate-200 hover:bg-slate-800/70'
      }`}
    >
      <span className="relative shrink-0">
        <Icon className="w-4 h-4" />
        {badgeCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-red-500 text-[10px] leading-4 text-white font-bold text-center">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </span>
      {/* Mobilde her zaman label görünsün; dar mod sadece lg+ için */}
      <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{label}</span>
    </Link>
  );
};

export default function Sidebar() {
  const [open, setOpen] = useState(true);
  const [collapsed, setCollapsed] = useLocalStorageBoolean('sc_sidebar_collapsed', false);
  const { unreadCount } = useUnreadMessages();
  const {
    loading,
    error,
    filteredUniversities,
    filteredDepartments,
    selectedUniversity,
    setSelectedUniversity,
    selectedDepartment,
    setSelectedDepartment,
    universitySearch,
    setUniversitySearch,
    departmentSearch,
    setDepartmentSearch,
    clearFilters,
  } = useTurkeyData();

  const uniLabel = useMemo(
    () => selectedUniversity?.name || 'Tüm Üniversiteler',
    [selectedUniversity]
  );

  return (
    <div
      className={`space-y-4 transition-[width] duration-200 w-full ${collapsed ? 'lg:w-20' : 'lg:w-64'}`}
    >
      <div className="flex items-center justify-between">
        <p className={`text-xs font-semibold text-slate-400 px-1 ${collapsed ? 'lg:hidden' : ''}`}>Menü</p>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="ml-auto hidden lg:inline-flex items-center justify-center h-9 w-9 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-200 hover:bg-slate-800/70 transition"
          title={collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}
          aria-label="Sidebar toggle"
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      <div className="space-y-2">
        <NavItem to="/dashboard" icon={Home} label="Akış" collapsed={collapsed} />
        <NavItem to="/anonymous" icon={Ghost} label="Anonim dertleşme" collapsed={collapsed} />
        <NavItem to="/chat" icon={Sparkles} label="BiriVar AI" collapsed={collapsed} />
        <NavItem to="/explore" icon={Search} label="Keşfet" collapsed={collapsed} />
        <NavItem
          to="/messages"
          icon={MessagesSquare}
          label="Mesajlar"
          collapsed={collapsed}
          badgeCount={unreadCount}
        />
        <NavItem to="/profile" icon={User} label="Profil" collapsed={collapsed} />
      </div>

      {/* Filtre paneli mobilde kalsın; dar modda sadece lg+ gizle */}
      <div className={`rounded-xl bg-slate-900/60 border border-gray-800 backdrop-blur-md ${collapsed ? 'lg:hidden' : ''}`}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-200"
        >
          Filtreleme
          <ChevronDown className={`w-4 h-4 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="px-4 pb-4 space-y-3">
            <button
              type="button"
              onClick={clearFilters}
              className="w-full rounded-lg bg-slate-950/60 hover:bg-slate-800/70 text-slate-200 border border-slate-800 text-xs font-semibold px-3 py-2 transition"
            >
              Filtreleri Temizle
            </button>
            <div>
              <p className="text-xs text-slate-400 mb-2">Üniversiteler</p>
              <input
                value={universitySearch}
                onChange={(e) => setUniversitySearch(e.target.value)}
                placeholder="Ara..."
                className="mb-2 w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              />
              <div className="space-y-1 max-h-56 overflow-y-auto sc-scroll">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUniversity(null);
                    setSelectedDepartment(null);
                  }}
                  className={`w-full text-left text-xs px-3 py-2 rounded-lg border transition ${
                    !selectedUniversity
                      ? 'bg-sky-500/10 border-sky-500/40 text-sky-200'
                      : 'bg-slate-950/60 hover:bg-slate-800/70 text-slate-200 border-slate-800'
                  }`}
                >
                  Tüm Üniversiteler
                </button>
                {filteredUniversities.map((u) => (
                  <button
                    key={u.code}
                    type="button"
                    onClick={() => {
                      setSelectedUniversity(u);
                      setSelectedDepartment(null);
                    }}
                    className={`w-full text-left text-xs px-3 py-2 rounded-lg border transition ${
                      selectedUniversity?.code === u.code
                        ? 'bg-sky-500/10 border-sky-500/40 text-sky-200'
                        : 'bg-slate-950/60 hover:bg-slate-800/70 text-slate-200 border-slate-800'
                    }`}
                  >
                    {u.name}
                  </button>
                ))}
                {loading && (
                  <p className="text-xs text-slate-500 px-1 py-2">Yükleniyor...</p>
                )}
                {error && (
                  <p className="text-xs text-red-300 px-1 py-2">{error}</p>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-2">
                Bölümler <span className="text-slate-500">({uniLabel})</span>
              </p>
              <input
                value={departmentSearch}
                onChange={(e) => setDepartmentSearch(e.target.value)}
                placeholder="Bölüm ara..."
                className="mb-2 w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              />
              <div className="space-y-1 max-h-56 overflow-y-auto sc-scroll">
                {filteredDepartments.slice(0, 200).map((d, idx) => (
                  <button
                    key={`${d.universityCode}:${d.name}:${idx}`}
                    type="button"
                    onClick={() => setSelectedDepartment(d.name)}
                    className="w-full text-left text-xs px-3 py-2 rounded-lg bg-slate-950/60 hover:bg-slate-800/70 text-slate-200 border border-slate-800 transition"
                    title={d.name}
                  >
                    <span className={selectedDepartment === d.name ? 'text-sky-200 font-semibold' : ''}>
                      {d.name}
                    </span>
                  </button>
                ))}
                {!loading && filteredDepartments.length > 200 && (
                  <p className="text-[11px] text-slate-500 px-1 py-2">
                    Daha fazla sonuç var, arama ile daralt.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

