import { useState } from 'react';
import toast from 'react-hot-toast';
import { Copy, Link as LinkIcon, Share2, QrCode, ExternalLink } from 'lucide-react';

export default function ShareLinks({ academy, compact = false }) {
  const [tab, setTab] = useState('register');
  if (!academy) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  // HashRouter is used so the app works on any static host without SPA rewrites.
  // All public URLs include `/#/` before the route path.
  const links = {
    register: {
      label: 'Student registration',
      hint: 'Share with new students so they can sign up themselves. Needs your approval before access.',
      url: `${origin}/#/a/${academy.slug}/register`,
    },
    login: {
      label: 'Student login',
      hint: 'Already-registered students sign in here. Fully branded with your academy name and colours.',
      url: `${origin}/#/a/${academy.slug}/login`,
    },
    home: {
      label: 'Academy home (login or register)',
      hint: 'A single branded entry — students pick login or sign up.',
      url: `${origin}/#/a/${academy.slug}/login`,
    },
  };
  const active = links[tab];

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Link copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  const whatsappShare = () => {
    const msg = encodeURIComponent(
      `Hi! Join ${academy.name} on our online platform:\n\n` +
      `Sign up here: ${links.register.url}\n` +
      `Already registered? Sign in: ${links.login.url}\n\n` +
      `See you inside!`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(active.url)}`;

  if (compact) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Share2 className="h-4 w-4 text-brand" />
          <h3 className="font-semibold">Share with your students</h3>
        </div>
        <div className="space-y-2">
          {Object.entries(links).slice(0, 2).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-500">{v.label}</p>
                <p className="text-sm truncate">{v.url}</p>
              </div>
              <button className="btn-ghost" onClick={() => copy(v.url)} title="Copy"><Copy className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Share2 className="h-5 w-5 text-brand" />
        <h2 className="font-semibold text-lg">Share with your students</h2>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Give these links to your students — they lead to your academy's branded login and registration pages.
      </p>

      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg mb-4 text-sm">
        {Object.entries(links).map(([k, v]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex-1 py-1.5 rounded-md font-medium transition ${
              tab === k ? 'bg-white dark:bg-slate-900 text-brand shadow-sm' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-[1fr_auto] gap-5 items-start">
        <div className="space-y-3 min-w-0">
          <div>
            <p className="text-xs text-slate-500 mb-1">{active.label}</p>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
              <LinkIcon className="h-4 w-4 text-brand shrink-0" />
              <input readOnly value={active.url} className="flex-1 bg-transparent text-sm outline-none min-w-0" />
              <button className="btn-outline text-xs" onClick={() => copy(active.url)}>
                <Copy className="h-3 w-3" /> Copy
              </button>
              <a href={active.url} target="_blank" rel="noreferrer" className="btn-outline text-xs">
                <ExternalLink className="h-3 w-3" /> Open
              </a>
            </div>
            <p className="text-xs text-slate-500 mt-2">{active.hint}</p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button className="btn-primary" onClick={whatsappShare}>
              <Share2 className="h-4 w-4" /> Share on WhatsApp
            </button>
            <button
              className="btn-outline"
              onClick={() => copy(
                `Join ${academy.name}:\n\nSign up: ${links.register.url}\nSign in: ${links.login.url}`
              )}
            >
              <Copy className="h-4 w-4" /> Copy full message
            </button>
          </div>
        </div>

        <div className="text-center">
          <div className="bg-white p-2 rounded-xl inline-block border border-slate-200">
            <img src={qrUrl} alt="QR" className="h-44 w-44" />
          </div>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1 justify-center">
            <QrCode className="h-3 w-3" /> Scan to open
          </p>
        </div>
      </div>
    </div>
  );
}
