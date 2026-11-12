import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import EmptyState from '../../components/EmptyState';
import { Wallet, ChevronRight, Receipt } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PayNowSheet from '../../components/PayNowSheet';

export default function StudentFees() {
  const { slug } = useParams();
  const { academy } = useAuth();
  const [batches, setBatches] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paying, setPaying] = useState(null);

  const load = async () => {
    const [{ data: b }, { data: p }] = await Promise.all([
      api.get('/batches'),
      api.get('/payments/mine'),
    ]);
    setBatches(b);
    setPayments(p);
  };
  useEffect(() => { load(); }, []);

  const monthKey = new Date().toISOString().slice(0, 7);

  return (
    <div className="space-y-5">
      <h1 className="text-xl sm:text-2xl font-bold">Fees & payments</h1>

      {!batches.length && <EmptyState title="Not enrolled in any batch" icon={Wallet} />}

      <div className="grid gap-3 sm:grid-cols-2">
        {batches.map((b) => {
          const paid = payments.some(
            (p) => String(p.batchId?.id || p.batchId) === String(b.id) &&
                   p.forMonth === monthKey && p.status === 'successful'
          );
          const awaiting = payments.some(
            (p) => String(p.batchId?.id || p.batchId) === String(b.id) &&
                   p.forMonth === monthKey && p.status === 'awaiting_verification'
          );
          return (
            <div key={b.id} className="card p-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold truncate">{b.name}</h3>
                  {b.subject && <p className="text-xs text-slate-500">{b.subject}</p>}
                </div>
                <span className={
                  paid ? 'badge-ok text-xs shrink-0' :
                  awaiting ? 'badge-warn text-xs shrink-0' :
                  'badge-muted text-xs shrink-0'
                }>
                  {paid ? 'Paid this month' : awaiting ? 'Verifying…' : 'Due'}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="text-2xl font-bold text-brand">₹{b.monthlyFee}</span>
                <div className="flex items-center gap-2">
                  <Link to={`/a/${slug}/batches/${b.id}`} className="btn-outline text-xs">
                    Advance months <ChevronRight className="h-3 w-3" />
                  </Link>
                  <button
                    className="btn-primary text-sm"
                    disabled={paid || awaiting}
                    onClick={() => setPaying({ batch: b, type: 'monthly', month: monthKey, label: new Date().toLocaleString('en', { month: 'long', year: 'numeric' }), amount: b.monthlyFee })}
                  >
                    Pay now
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Receipt className="h-4 w-4 text-brand" /> Payment history
        </h2>
        {!payments.length ? (
          <p className="text-sm text-slate-500">No payments yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-sm min-w-[560px]">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2">Date</th>
                  <th>Batch</th>
                  <th>Month</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2">{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td className="truncate max-w-[120px]">{p.batchId?.name}</td>
                    <td>{p.forMonth || '—'}</td>
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
          batch={paying.batch}
          academy={academy}
          type={paying.type}
          month={paying.month}
          monthLabel={paying.label}
          amount={paying.amount}
          onClose={() => setPaying(null)}
          onDone={() => { setPaying(null); load(); }}
        />
      )}
    </div>
  );
}
