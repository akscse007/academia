import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { assetUrl } from '../utils/assetUrl';

export default function Sidebar({ title, logoUrl, items = [] }) {
  const { logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Close drawer when navigating on mobile
  useEffect(() => { setOpen(false); }, [location.pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 shadow-sm"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Backdrop */}
      {open && (
        <button
          onClick={() => setOpen(false)}
          aria-label="Close menu"
          className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-72 lg:w-64 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex flex-col transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="px-5 py-5 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
          {logoUrl ? (
            <img src={assetUrl(logoUrl)} alt="" className="h-10 w-10 rounded-lg object-cover bg-slate-100 shrink-0" />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-brand text-white font-bold flex items-center justify-center shrink-0">
              {title?.[0] || 'A'}
            </div>
          )}
          <div className="truncate flex-1">
            <p className="text-sm font-semibold truncate">{title}</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="lg:hidden p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand/10 text-brand'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`
              }
            >
              {it.icon && <it.icon className="h-4 w-4 shrink-0" />}
              <span className="truncate">{it.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => {
              logout();
              nav('/login');
            }}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </aside>
    </>
  );
}
