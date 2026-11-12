import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import Loader from '../../components/Loader';
import {
  ArrowLeft, Wallet, AlertCircle, Banknote, Calendar, CheckCircle2, Receipt, X,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid,
} from 'recharts';

export default function TeacherStudentFees() {
  const { batchId, studentId } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [cashOpen, setCashOpen] = useState(null); // { month, amount }
  const [cashNotes, setCashNotes] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () =>
    api.get('/payments/schedule', { params: { batchId, studentId } })
      .then(({ data }) => {
        setData(data);
        setCashAmount(data.monthlyFee);
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed'));

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [batchId, studentId]);

  const recordCash = async () => {
    if (!cashOpen) return;
    setSubmitting(true);
    try {
      await api.post('/payments/cash', {
        studentId,
        batchId,
        forMonth: cashOpen.month,
        type: cashOpen.type || 'monthly',
        amount: Number(cashAmount),
        notes: cashNotes,
      });
      toast.success('Cash payment recorded');
      setCashOpen(null);
      setCashNotes('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSubmitting(false); }
  };

  if (!data) return <Loader />;

  const paidTotal = data.months.filter((m) => m.status === 'successful').reduce((s, m) => s + Number(m.amount), 0);
  const dueTotal = data.months
    .filter((m) => m.month <= data.currentMonth && m.status !== 'successful')
    .reduce((s, m) => s + Number(m.amount), 0);

  const chartData = data.months
    .filter((m) => m.month <= data.currentMonth || m.status !== 'unpaid')
    .map((m) => ({
      month: m.month.slice(5),
      year: m.month,
      paid: m.status === 'successful' ? Number(m.amount) : 0,
      due: m.status !== 'successful' && m.month <= data.currentMonth ? Number(m.amount) : 0,
    }));

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center gap-2">
        <button onClick={() => nav(-1)} className="btn-ghost text-sm">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>

      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{data.student?.name}</h1>
            <p className="text-sm text-slate-500">
              {data.student?.email} {data.student?.phone ? `· ${data.student.phone}` : ''}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              <span className="font-medium">{data.batch.name}</span>
              {data.batch.subject ? ` · ${data.batch.subject}` : ''}
              {' · '}
              Joined {new Date(data.enrollment.enrolledAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to={`/app/students/${studentId}`} className="btn-outline text-xs hidden sm:inline-flex">
              Student profile
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Wallet} label="Monthly fee" value={`₹${data.monthlyFee}`} />
        <KpiCard icon={CheckCircle2} label="Months paid" value={data.paidCount} accent="ok" />
        <KpiCard icon={AlertCircle} label="Overdue months" value={data.overdue} accent={data.overdue ? 'err' : 'ok'} />
        <KpiCard icon={Receipt} label="Collected" value={`₹${paidTotal.toLocaleString()}`} accent="ok" />
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-brand" /> Monthly payment chart
        </h2>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(v) => `₹${v}`} labelFormatter={(l, items) => items?.[0]?.payload?.year || l} />
              <Bar dataKey="paid" stackId="s" fill="#22c55e" radius={[0, 0, 0, 0]} name="Paid" />
              <Bar dataKey="due" stackId="s" fill="#ef4444" radius={[8, 8, 0, 0]} name="Due" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-semibold">Month-by-month status</h2>
          <p className="text-xs text-slate-500">Total due now: <span className="font-semibold text-red-600">₹{dueTotal.toLocaleString()}</span></p>
        </div>
        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full text-sm min-w-[560px]">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Month</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Receipt</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.months.map((m) => {
                const isFuture = m.month > data.currentMonth;
                const isOverdue = !isFuture && m.status !== 'successful';
                return (
                  <tr key={m.month} className={isOverdue ? 'bg-red-50/60 dark:bg-red-900/10' : ''}>
                    <td className="py-2 font-medium">{m.label}{isFuture && <span className="ml-1 text-xs text-slate-500">(future)</span>}</td>
                    <td>₹{m.amount}</td>
                    <td>
                      <span className={
                        m.status === 'successful' ? 'badge-ok' :
                        m.status === 'awaiting_verification' ? 'badge-warn' :
                        isOverdue ? 'badge-err' :
                        'badge-muted'
                      }>
                        {m.status === 'unpaid' ? (isOverdue ? 'overdue' : 'upcoming') : m.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="text-xs text-slate-500">
                      {m.status === 'successful' && m.paymentId ? <ReceiptLink paymentId={m.paymentId} /> : '—'}
                    </td>
                    <td className="text-right">
                      {m.status !== 'successful' && (
                        <button
                          className="btn-outline text-xs"
                          onClick={() => setCashOpen({ month: m.month, label: m.label, amount: m.amount, type: 'monthly' })}
                        >
                          <Banknote className="h-3 w-3" /> Cash paid
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {cashOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-semibold">Record cash payment</h3>
              <button className="btn-ghost -mr-2" onClick={() => setCashOpen(null)}><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-slate-500">
                For <span className="font-medium text-slate-900 dark:text-slate-100">{data.student?.name}</span>
                {' · '}<span className="font-medium">{cashOpen.label}</span>
              </p>
              <div>
                <label className="label">Amount (₹)</label>
                <input
                  type="number" min="1" className="input"
                  value={cashAmount} onChange={(e) => setCashAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Notes (optional)</label>
                <input
                  className="input"
                  placeholder="e.g. Paid in cash on 12 Nov"
                  value={cashNotes} onChange={(e) => setCashNotes(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button className="btn-outline" onClick={() => setCashOpen(null)}>Cancel</button>
                <button className="btn-primary" disabled={submitting || !cashAmount} onClick={recordCash}>
                  {submitting ? 'Saving…' : 'Mark as paid'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, accent }) {
  const color =
    accent === 'ok' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
    : accent === 'err' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
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

function ReceiptLink({ paymentId }) {
  return <span className="text-brand">#{paymentId.slice(-6).toUpperCase()}</span>;
}
