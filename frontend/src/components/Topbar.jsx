import { Bell, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../api/client';
import UserMenu from './UserMenu';

export default function Topbar({ subtitle }) {
  const { user, academy } = useAuth();
  const [unread, setUnread] = useState(0);
  const [dark, setDark] = useState(document.documentElement.classList.contains('dark'));

  useEffect(() => {
    if (!user) return;
    api.get('/notifications/unread-count').then(({ data }) => setUnread(data.count)).catch(() => {});
  }, [user]);

  const toggleDark = () => {
    const el = document.documentElement;
    const next = !el.classList.contains('dark');
    el.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    setDark(next);
  };

  return (
    <header className="h-16 sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-100 dark:border-slate-800 px-4 lg:px-8 flex items-center justify-between gap-2">
      <div className="pl-10 lg:pl-0 min-w-0 flex-1">
        <h1 className="font-semibold text-sm sm:text-base truncate">{academy?.name || 'Student Platform'}</h1>
        {subtitle && <p className="text-xs text-slate-500 truncate">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <button onClick={toggleDark} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Toggle theme">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute top-0.5 right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>
        <Link to="/about-developer" className="hidden lg:block text-xs text-slate-500 hover:text-brand px-2">
          About developer
        </Link>
        <UserMenu />
      </div>
    </header>
  );
}
