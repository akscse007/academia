import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import EmptyState from '../../components/EmptyState';

const STATUS = ['', 'pending', 'awaiting_verification', 'successful', 'failed', 'rejected'];

export default function TeacherPayments() {
  const [list, setList] = useState([]);
  const [status, setStatus] = useState('awaiting_verification');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const load = async () => {
    const { data } = await api.get('/payments', {
      params: { status: status || undefined, month: month || undefined, year: year || undefined },
    });
    setList(data);
  };

  useEffect(() => { load(); }, [status, month, year]);

  const verify = async (p) => {
    try {
      await api.put(`/payments/${p.id}/verify`);
      toast.success('Verified');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const reject = async (p) => {
    const reason = prompt('Rejection reason?') || '';
    try {
      await api.put(`/payments/${p.id}/reject`, { reason });
      toast.success('Rejected');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Payments</h1>
        <div className="flex gap-2 flex-wrap">
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS.map((s) => <option key={s} value={s}>{s || 'All'}</option>)}
          </select>
          <select className="input" value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">All months</option>
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i} value={i + 1}>{new Date(2000, i).toLocaleString('en', { month: 'long' })}</option>
            ))}
          </select>
          <input type="number" className="input w-24" value={year} onChange={(e) => setYear(e.target.value)} />
        </div>
      </div>

      {!list.length && <EmptyState title="No payments" message="Student payments will show up here once initiated." />}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Batch</th>
              <th className="px-4 py-3">Month</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">UPI Txn</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {list.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 text-xs text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">{p.studentId?.name}</td>
                <td className="px-4 py-3">{p.batchId?.name}</td>
                <td className="px-4 py-3">{p.forMonth}</td>
                <td className="px-4 py-3 font-medium">₹{p.amount}</td>
                <td className="px-4 py-3 text-xs">{p.upiTxnId || '—'}</td>
                <td className="px-4 py-3">
                  <span className={
                    p.status === 'successful' ? 'badge-ok' :
                    p.status === 'awaiting_verification' ? 'badge-warn' :
                    p.status === 'pending' ? 'badge-muted' :
                    'badge-err'
                  }>{p.status.replace('_', ' ')}</span>
                </td>
                <td className="px-4 py-3 text-right space-x-1">
                  {p.status === 'awaiting_verification' && (
                    <>
                      <button className="btn-primary text-xs" onClick={() => verify(p)}>Verify</button>
                      <button className="btn-danger text-xs" onClick={() => reject(p)}>Reject</button>
                    </>
                  )}
                  {p.status === 'pending' && (
                    <button className="btn-outline text-xs" onClick={() => verify(p)}>Mark paid</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
