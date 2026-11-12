import { Bell, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../api/client';

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
    <header className="h-16 sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-100 dark:border-slate-800 px-4 lg:px-8 flex items-center justify-between">
      <div className="pl-10 lg:pl-0">
        <h1 className="font-semibold">{academy?.name || 'Student Platform'}</h1>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={toggleDark} className="btn-ghost">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button className="btn-ghost relative">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>
        <Link to="/about-developer" className="hidden md:block text-xs text-slate-500 hover:text-brand">
          About developer
        </Link>
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
          <div className="h-8 w-8 rounded-full bg-brand text-white font-semibold flex items-center justify-center">
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="hidden md:block leading-tight">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
