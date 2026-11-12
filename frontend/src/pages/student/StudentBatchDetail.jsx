import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import Loader from '../../components/Loader';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowLeft, BookOpen, Calendar, Wallet, FileText, Users, Receipt, ExternalLink, Clock,
} from 'lucide-react';
import PayNowSheet from '../../components/PayNowSheet';

export default function StudentBatchDetail() {
  const { slug, id } = useParams();
  const { academy } = useAuth();
  const [batch, setBatch] = useState(null);
  const [paying, setPaying] = useState(null); // selected { type, month } to open PayNowSheet
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    api.get(`/batches/${id}`).then(({ data }) => setBatch(data))
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load'));
  }, [id, refreshKey]);

  if (!batch) return <Loader />;

  const paidMonths = new Set(
    (batch.payments || [])
      .filter((p) => p.status === 'successful' && p.type === 'monthly')
      .map((p) => p.forMonth)
  );
  const admissionPaid = (batch.payments || []).some((p) => p.type === 'admission' && p.status === 'successful');

  // Build a list of 12 months starting this month so student can pay in advance
  const nextMonths = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    nextMonths.push({ key, label: d.toLocaleString('en', { month: 'long', year: 'numeric' }) });
  }

  const schedule = batch.schedule || [];

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between gap-2">
        <Link to={`/a/${slug}/batches`} className="btn-ghost text-sm">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>

      <div className="card p-6 bg-gradient-to-br from-brand to-brand-700 text-white">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <BookOpen className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold">{batch.name}</h1>
            {batch.subject && <p className="text-white/80 text-sm mt-0.5">{batch.subject}</p>}
            {batch.description && <p className="text-white/80 text-sm mt-2">{batch.description}</p>}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500 flex items-center gap-1">
            <Wallet className="h-3 w-3" /> Monthly fee
          </p>
          <p className="mt-1 text-xl font-bold">₹{batch.effectiveMonthlyFee}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500 flex items-center gap-1">
            <Receipt className="h-3 w-3" /> Admission fee
          </p>
          <p className="mt-1 text-xl font-bold">₹{batch.effectiveAdmissionFee}</p>
          <p className="text-xs mt-1">
            {admissionPaid ? <span className="text-emerald-600">✓ Paid</span> : <span className="text-amber-600">Pending</span>}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500 flex items-center gap-1">
            <Users className="h-3 w-3" /> Classmates
          </p>
          <p className="mt-1 text-xl font-bold">{batch.totalEnrolled}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500 flex items-center gap-1">
            <FileText className="h-3 w-3" /> Materials
          </p>
          <p className="mt-1 text-xl font-bold">{batch.notes?.length || 0}</p>
        </div>
      </div>

      {schedule.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><Calendar className="h-4 w-4 text-brand" /> Schedule</h2>
          <div className="flex flex-wrap gap-2">
            {schedule.map((s, i) => (
              <span key={i} className="badge-muted text-xs">
                {s.day?.toUpperCase()} {s.from}–{s.to}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="card p-5">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Wallet className="h-4 w-4 text-brand" /> Pay fees
        </h2>
        {!admissionPaid && batch.effectiveAdmissionFee > 0 && (
          <button
            onClick={() => setPaying({ type: 'admission' })}
            className="btn-primary w-full mb-3 justify-center"
          >
            Pay admission ₹{batch.effectiveAdmissionFee}
          </button>
        )}
        <p className="text-xs text-slate-500 mb-2">Monthly fees — tap any month to pay (including months in advance):</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {nextMonths.map((m) => {
            const paid = paidMonths.has(m.key);
            return (
              <button
                key={m.key}
                disabled={paid}
                onClick={() => setPaying({ type: 'monthly', month: m.key, label: m.label })}
                className={`rounded-lg px-3 py-3 text-left transition border ${
                  paid
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300 cursor-default'
                    : 'bg-white border-slate-200 hover:border-brand hover:bg-brand/5 dark:bg-slate-900 dark:border-slate-700'
                }`}
              >
                <p className="text-xs text-slate-500">{m.label}</p>
                <p className="font-semibold">
                  {paid ? '✓ Paid' : `₹${batch.effectiveMonthlyFee}`}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4 text-brand" /> Study materials</h2>
          <Link to={`/a/${slug}/notes`} className="text-xs text-brand">All</Link>
        </div>
        {!batch.notes?.length ? (
          <p className="text-sm text-slate-500">No materials uploaded yet for this batch.</p>
        ) : (
          <div className="space-y-2">
            {batch.notes.slice(0, 6).map((n) => (
              <Link
                key={n.id}
                to={`/a/${slug}/notes/${n.id}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                <div className="h-9 w-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{n.title}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {n.folder} • {(n.fileSize / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 text-slate-400 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><Clock className="h-4 w-4 text-brand" /> Payment history (this batch)</h2>
        {!batch.payments?.length ? (
          <p className="text-sm text-slate-500">No payments yet for this batch.</p>
        ) : (
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-sm min-w-[520px]">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2">Date</th>
                  <th>For</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {batch.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 text-xs text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td>{p.forMonth || '—'}</td>
                    <td className="capitalize">{p.type}</td>
                    <td>₹{p.amount}</td>
                    <td>
                      <span className={
                        p.status === 'successful' ? 'badge-ok' :
                        p.status === 'awaiting_verification' ? 'badge-warn' :
                        p.status === 'pending' ? 'badge-muted' :
                        'badge-err'
                      }>{p.status.replace('_', ' ')}</span>
                    </td>
                    <td className="text-xs text-slate-500">{p.receiptNo || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {paying && (
        <PayNowSheet
          batch={batch}
          academy={academy}
          type={paying.type}
          month={paying.month}
          monthLabel={paying.label}
          amount={paying.type === 'admission' ? batch.effectiveAdmissionFee : batch.effectiveMonthlyFee}
          onClose={() => setPaying(null)}
          onDone={() => { setPaying(null); setRefreshKey((k) => k + 1); }}
        />
      )}
    </div>
  );
}
