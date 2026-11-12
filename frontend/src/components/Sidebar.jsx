import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Menu } from 'lucide-react';
import { useState } from 'react';

export default function Sidebar({ title, logoUrl, items = [] }) {
  const { logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="lg:hidden fixed top-3 left-3 z-40 btn-outline"
      >
        <Menu className="h-4 w-4" />
      </button>
      <aside
        className={`fixed lg:sticky top-0 left-0 z-30 h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex flex-col transition-transform ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="px-5 py-5 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-10 w-10 rounded-lg object-cover bg-slate-100" />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-brand text-white font-bold flex items-center justify-center">
              {title?.[0] || 'A'}
            </div>
          )}
          <div className="truncate">
            <p className="text-sm font-semibold truncate">{title}</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand/10 text-brand'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`
              }
            >
              {it.icon && <it.icon className="h-4 w-4" />}
              {it.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => {
              logout();
              nav('/login');
            }}
            className="btn-ghost w-full justify-start"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </aside>
    </>
  );
}
