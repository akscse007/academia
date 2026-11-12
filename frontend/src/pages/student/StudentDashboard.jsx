import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../api/client';
import StatCard from '../../components/StatCard';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, FileText, Wallet, Megaphone } from 'lucide-react';

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
  const pendingAmount = pending.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="card p-8 bg-gradient-to-br from-brand to-brand-700 text-white">
        <h1 className="text-2xl font-bold">Welcome, {user?.name}</h1>
        <p className="opacity-90 mt-1">{academy?.welcomeMessage}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={BookOpen} label="Enrolled batches" value={batches.length} />
        <StatCard icon={FileText} label="Study materials" value={notes.length} />
        <StatCard icon={Wallet} label="Pending fees" value={`₹${pendingAmount.toLocaleString()}`} />
        <StatCard icon={Megaphone} label="Announcements" value={ann.length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">My batches</h2>
            <Link to={`/a/${slug}/batches`} className="text-xs text-brand">View all</Link>
          </div>
          <div className="space-y-2">
            {batches.slice(0, 4).map((b) => (
              <div key={b.id} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <div>
                  <p className="font-medium text-sm">{b.name}</p>
                  <p className="text-xs text-slate-500">{b.subject}</p>
                </div>
                <span className="text-sm">₹{b.monthlyFee}/mo</span>
              </div>
            ))}
            {!batches.length && <p className="text-sm text-slate-500">No batches yet.</p>}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Latest announcements</h2>
            <Link to={`/a/${slug}/announcements`} className="text-xs text-brand">View all</Link>
          </div>
          <div className="space-y-3">
            {ann.slice(0, 3).map((a) => (
              <div key={a.id} className="border-b border-slate-100 dark:border-slate-800 pb-2 last:border-0">
                <p className="font-medium text-sm">{a.title}</p>
                <p className="text-xs text-slate-500 line-clamp-2">{a.message}</p>
              </div>
            ))}
            {!ann.length && <p className="text-sm text-slate-500">No announcements yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
