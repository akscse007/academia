import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import Loader from '../../components/Loader';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowLeft, BookOpen, Calendar, Wallet, FileText, Users, Receipt, ExternalLink, Clock, Lock,
} from 'lucide-react';
import PayNowSheet from '../../components/PayNowSheet';

export default function StudentBatchDetail() {
  const { slug, id } = useParams();
  const { academy } = useAuth();
  const [batch, setBatch] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [paying, setPaying] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    api.get(`/batches/${id}`)
      .then(({ data }) => setBatch(data))
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load'));
    api.get('/payments/schedule', { params: { batchId: id } })
      .then(({ data }) => setSchedule(data))
      .catch(() => {});
  }, [id, refreshKey]);

  if (!batch || !schedule) return <Loader />;

  const nextPayable = schedule.nextPayable;
  const admissionPaid = schedule.admissionPaid;
  const overdue = schedule.overdue;

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <Link to={`/a/${slug}/batches`} className="btn-ghost text-sm">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>

      <div className="card p-5 sm:p-6 bg-gradient-to-br from-brand to-brand-700 text-white">
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Wallet} label="Monthly fee" value={`₹${schedule.monthlyFee}`} />
        <KpiCard icon={Receipt} label="Admission" value={admissionPaid ? '✓ Paid' : `₹${batch.effectiveAdmissionFee}`} accent={admissionPaid ? 'ok' : 'warn'} />
        <KpiCard icon={Users} label="Classmates" value={batch.totalEnrolled} />
        <KpiCard icon={FileText} label="Materials" value={batch.notes?.length || 0} />
      </div>

      {overdue > 0 && (
        <div className="card p-4 border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20 flex items-start gap-3">
          <Clock className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700 dark:text-red-300">
              {overdue} month{overdue > 1 ? 's' : ''} overdue
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
              Please clear the earliest unpaid month first to continue.
            </p>
          </div>
        </div>
      )}

      {batch.schedule?.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><Calendar className="h-4 w-4 text-brand" /> Schedule</h2>
          <div className="flex flex-wrap gap-2">
            {batch.schedule.map((s, i) => (
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
            onClick={() => setPaying({ type: 'admission', amount: batch.effectiveAdmissionFee })}
            className="btn-primary w-full mb-3 justify-center"
          >
            Pay admission ₹{batch.effectiveAdmissionFee}
          </button>
        )}

        {nextPayable && (
          <div className="mb-3 p-3 rounded-xl bg-brand/5 border border-brand/20 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">Next due</p>
              <p className="font-semibold">{nextPayable.label}</p>
              <p className="text-lg font-bold text-brand mt-0.5">₹{nextPayable.amount}</p>
            </div>
            <button
              onClick={() => setPaying({ type: 'monthly', month: nextPayable.month, label: nextPayable.label, amount: nextPayable.amount })}
              className="btn-primary self-center"
            >
              Pay now
            </button>
          </div>
        )}

        <p className="text-xs text-slate-500 mb-2">
          <Lock className="h-3 w-3 inline mr-1" />
          You can only pay the earliest unpaid month. Months unlock sequentially as you clear previous ones.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {schedule.months.map((m) => {
            const isPast = m.month <= schedule.currentMonth;
            const paid = m.status === 'successful';
            const awaiting = m.status === 'awaiting_verification';
            return (
              <button
                key={m.month}
                disabled={!m.payable || awaiting}
                onClick={() => setPaying({ type: 'monthly', month: m.month, label: m.label, amount: m.amount })}
                className={`rounded-lg px-3 py-3 text-left transition border ${
                  paid
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300 cursor-default'
                    : awaiting
                    ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-300 cursor-default'
                    : m.payable
                    ? 'bg-brand text-white border-brand-700 hover:bg-brand-700'
                    : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500 cursor-not-allowed'
                }`}
              >
                <p className={`text-xs ${paid ? 'opacity-70' : m.payable ? 'opacity-80' : ''}`}>{m.label}</p>
                <p className="font-semibold mt-0.5 flex items-center gap-1">
                  {paid ? '✓ Paid'
                    : awaiting ? '⏳ Verifying'
                    : !m.payable ? <><Lock className="h-3 w-3" /> ₹{m.amount}</>
                    : <>₹{m.amount}</>}
                </p>
                {isPast && !paid && !awaiting && m.payable && (
                  <p className="text-[10px] text-white/80 mt-0.5">Overdue</p>
                )}
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

      {paying && (
        <PayNowSheet
          batch={batch}
          academy={academy}
          type={paying.type}
          month={paying.month}
          monthLabel={paying.label}
          amount={paying.amount}
          onClose={() => setPaying(null)}
          onDone={() => { setPaying(null); setRefreshKey((k) => k + 1); }}
        />
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, accent }) {
  const color =
    accent === 'ok' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
    : accent === 'warn' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
    : 'bg-brand/10 text-brand';
  return (
    <div className="card p-3 sm:p-4">
      <div className="flex items-center gap-2">
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
      <p className="mt-2 text-lg sm:text-xl font-bold truncate">{value}</p>
    </div>
  );
}
