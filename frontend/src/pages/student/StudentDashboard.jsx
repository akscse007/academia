import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, FileText, Wallet, Megaphone, ChevronRight, Calendar } from 'lucide-react';

export default function StudentDashboard() {
  const { slug } = useParams();
  const { user, academy } = useAuth();
  const [batches, setBatches] = useState([]);
  const [payments, setPayments] = useState([]);
  const [ann, setAnn] = useState([]);
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    api.get('/batches').then(({ data }) => setBatches(data));
    api.get('/payments/mine').then(({ data }) => setPayments(data));
    api.get('/announcements').then(({ data }) => setAnn(data));
    api.get('/notes').then(({ data }) => setNotes(data));
  }, []);

  const pending = payments.filter((p) => p.status === 'pending' || p.status === 'awaiting_verification');
  const pendingAmount = pending.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  // Current month payment status per batch
  const monthKey = new Date().toISOString().slice(0, 7);

  return (
    <div className="space-y-5">
      <div className="card p-5 sm:p-6 bg-gradient-to-br from-brand to-brand-700 text-white">
        <h1 className="text-xl sm:text-2xl font-bold">Welcome, {user?.name?.split(' ')[0]}</h1>
        <p className="opacity-90 mt-1 text-sm">{academy?.welcomeMessage}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickStat icon={BookOpen} label="Batches" value={batches.length} />
        <QuickStat icon={FileText} label="Materials" value={notes.length} />
        <QuickStat icon={Wallet} label="Pending" value={`₹${pendingAmount.toLocaleString()}`} dangerIfNonZero />
        <QuickStat icon={Megaphone} label="Updates" value={ann.length} />
      </div>

      <section className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">My batches</h2>
          <Link to={`/a/${slug}/batches`} className="text-xs text-brand font-medium">View all</Link>
        </div>
        {!batches.length ? (
          <p className="text-sm text-slate-500 py-2">Your teacher hasn't enrolled you yet.</p>
        ) : (
          <div className="space-y-2">
            {batches.slice(0, 4).map((b) => {
              const paid = payments.some(
                (p) => String(p.batchId?.id || p.batchId) === String(b.id) &&
                       p.forMonth === monthKey && p.status === 'successful'
              );
              return (
                <Link
                  key={b.id}
                  to={`/a/${slug}/batches/${b.id}`}
                  className="flex items-center gap-3 p-3 -mx-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  <div className="h-9 w-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{b.name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      ₹{b.monthlyFee}/mo {b.subject ? `• ${b.subject}` : ''}
                    </p>
                  </div>
                  <span className={paid ? 'badge-ok text-[10px]' : 'badge-warn text-[10px]'}>
                    {paid ? 'Paid' : 'Due'}
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Latest announcements</h2>
          <Link to={`/a/${slug}/announcements`} className="text-xs text-brand font-medium">View all</Link>
        </div>
        {!ann.length ? (
          <p className="text-sm text-slate-500 py-2">No announcements yet.</p>
        ) : (
          <div className="space-y-3">
            {ann.slice(0, 3).map((a) => (
              <div key={a.id} className="pb-3 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
                <p className="font-medium text-sm">{a.title}</p>
                <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{a.message}</p>
                <p className="text-[10px] text-slate-400 mt-1">{new Date(a.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Recent materials</h2>
          <Link to={`/a/${slug}/notes`} className="text-xs text-brand font-medium">View all</Link>
        </div>
        {!notes.length ? (
          <p className="text-sm text-slate-500 py-2">No materials uploaded yet.</p>
        ) : (
          <div className="space-y-1">
            {notes.slice(0, 4).map((n) => (
              <Link
                key={n.id}
                to={`/a/${slug}/notes/${n.id}`}
                className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                <div className="h-8 w-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{n.title}</p>
                  <p className="text-xs text-slate-500 truncate">{n.folder}</p>
                </div>
                <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                <span className="text-xs text-slate-400">{new Date(n.createdAt).toLocaleDateString()}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function QuickStat({ icon: Icon, label, value, dangerIfNonZero }) {
  const danger = dangerIfNonZero && value && value !== '₹0';
  return (
    <div className="card p-3 sm:p-4">
      <div className="flex items-center gap-2">
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${danger ? 'bg-amber-100 text-amber-600' : 'bg-brand/10 text-brand'}`}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
      <p className={`mt-2 text-lg sm:text-xl font-bold truncate ${danger ? 'text-amber-600' : ''}`}>{value}</p>
    </div>
  );
}
