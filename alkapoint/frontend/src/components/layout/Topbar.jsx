import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon, BellIcon, ChevronDownIcon,
  ArrowRightOnRectangleIcon, UserCircleIcon, Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import BusinessSwitcher from './BusinessSwitcher';

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setProfileOpen(false);
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const initials = (user?.name || 'U').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/products?search=${encodeURIComponent(query.trim())}`);
  };

  const go = (path) => {
    setProfileOpen(false);
    setNotifOpen(false);
    navigate(path);
  };

  const doLogout = () => {
    setProfileOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="h-16 bg-ink-800/80 backdrop-blur border-b border-white/5 flex items-center gap-4 px-4 lg:px-6 shrink-0 relative z-30">
      <button onClick={onMenuClick} className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-white/5 text-paper-200" aria-label="Open menu">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <BusinessSwitcher />

      <form onSubmit={handleSearch} className="flex-1 max-w-xl hidden md:block">
        <div className="relative">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-paper-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, customers, invoices…"
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-ink-900 border border-white/10 text-sm text-paper-100 placeholder:text-paper-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
          />
        </div>
      </form>

      <div ref={wrapRef} className="flex items-center gap-2 ml-auto">
        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setNotifOpen((v) => !v); setProfileOpen(false); }}
            className="relative p-2 rounded-lg hover:bg-white/5 text-paper-200"
            aria-label="Notifications"
          >
            <BellIcon className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-gold-500"></span>
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 ap-card p-4 animate-fade-in z-50">
              <div className="text-sm font-semibold mb-2">Notifications</div>
              <div className="text-xs text-paper-400">You have no new notifications.</div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setProfileOpen((v) => !v); setNotifOpen(false); }}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-white/5"
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-white/10" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-xs font-bold text-white">
                {initials}
              </div>
            )}
            <div className="hidden md:block text-left leading-tight">
              <div className="text-[12px] font-semibold text-paper-100">{user?.name}</div>
              <div className="text-[10px] text-paper-400">{user?.Role?.name || 'User'}</div>
            </div>
            <ChevronDownIcon className="w-3.5 h-3.5 text-paper-400" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 ap-card p-2 animate-fade-in z-50">
              <button
                type="button"
                onClick={() => go('/profile')}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-paper-200 hover:bg-white/5"
              >
                <UserCircleIcon className="w-4 h-4" /> My Profile
              </button>
              <button
                type="button"
                onClick={() => go('/settings')}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-paper-200 hover:bg-white/5"
              >
                <Cog6ToothIcon className="w-4 h-4" /> Settings
              </button>
              <div className="border-t border-white/5 my-1"></div>
              <button
                type="button"
                onClick={doLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-danger hover:bg-danger/10"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}