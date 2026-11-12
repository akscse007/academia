import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, UserRound, KeyRound, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function UserMenu() {
  const { user, academy, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('touchstart', onClick);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('touchstart', onClick);
    };
  }, []);

  if (!user) return null;

  const doLogout = () => {
    logout();
    setOpen(false);
    if (user.role === 'student' && academy?.slug) nav(`/a/${academy.slug}/login`);
    else nav('/login');
  };

  const profileHref =
    user.role === 'student' && academy?.slug ? `/a/${academy.slug}/profile`
    : user.role === 'teacher' ? '/app/settings'
    : null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 pl-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
      >
        <div className="h-8 w-8 rounded-full bg-brand text-white font-semibold flex items-center justify-center text-sm">
          {user.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="hidden md:block leading-tight text-left">
          <p className="text-sm font-medium max-w-[160px] truncate">{user.name}</p>
          <p className="text-xs text-slate-500 capitalize">{user.role?.replace('_', ' ')}</p>
        </div>
        <ChevronDown className="h-3 w-3 text-slate-500 hidden sm:block" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg z-40 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <p className="text-sm font-semibold truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
            <p className="text-xs text-brand capitalize mt-1">{user.role?.replace('_', ' ')}</p>
          </div>
          {profileHref && (
            <button
              onClick={() => { setOpen(false); nav(profileHref); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 text-left"
            >
              {user.role === 'student' ? <UserRound className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
              {user.role === 'student' ? 'My profile' : 'Settings'}
            </button>
          )}
          <button
            onClick={doLogout}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-left"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      )}
    </div>
  );
}
