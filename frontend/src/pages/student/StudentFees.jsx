import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import EmptyState from '../../components/EmptyState';
import { Wallet, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function StudentFees() {
  const { academy } = useAuth();
  const [batches, setBatches] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paying, setPaying] = useState(null); // active payment details
  const [txn, setTxn] = useState('');

  const load = async () => {
    const [{ data: b }, { data: p }] = await Promise.all([
      api.get('/batches'),
      api.get('/payments/mine'),
    ]);
    setBatches(b);
    setPayments(p);
  };
  useEffect(() => { load(); }, []);

  const initiate = async (batchId, type = 'monthly') => {
    try {
      const { data } = await api.post('/payments/initiate', { batchId, type });
      setPaying(data);
      window.open(data.upiUrl, '_blank');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const submitTxn = async () => {
    if (!paying || !txn.trim()) return;
    try {
      await api.post(`/payments/${paying.payment.id}/submit-txn`, { upiTxnId: txn });
      toast.success('Submitted for verification');
      setPaying(null);
      setTxn('');
      load();
    } catch (err) { toast.error('Failed'); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Fees & payments</h1>

      {!batches.length && <EmptyState title="Not enrolled in any batch" icon={Wallet} />}

      <div className="grid gap-4 md:grid-cols-2">
        {batches.map((b) => {
          const monthKey = new Date().toISOString().slice(0, 7);
          const paid = payments.some(
            (p) => String(p.batchId?.id || p.batchId) === String(b.id) &&
                   p.forMonth === monthKey && p.status === 'successful'
          );
          return (
            <div key={b.id} className="card p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{b.name}</h3>
                <span className={paid ? 'badge-ok' : 'badge-warn'}>{paid ? 'Paid this month' : 'Due'}</span>
              </div>
              <p className="text-sm text-slate-500 mt-1">{b.subject}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xl font-bold">₹{b.monthlyFee}</span>
                <button className="btn-primary" disabled={paid} onClick={() => initiate(b.id, 'monthly')}>
                  Pay now <ExternalLink className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card p-6">
        <h2 className="font-semibold mb-3">Payment history</h2>
        {!payments.length ? (
          <p className="text-sm text-slate-500">No payments yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr><th className="py-2">Date</th><th>Batch</th><th>Month</th><th>Amount</th><th>Status</th><th>Receipt</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="py-2">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td>{p.batchId?.name}</td>
                  <td>{p.forMonth}</td>
                  <td>₹{p.amount}</td>
                  <td><span className={
                    p.status === 'successful' ? 'badge-ok' :
                    p.status === 'awaiting_verification' ? 'badge-warn' :
                    p.status === 'pending' ? 'badge-muted' :
                    'badge-err'
                  }>{p.status.replace('_', ' ')}</span></td>
                  <td className="text-xs text-slate-500">{p.receiptNo || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {paying && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4">
          <div className="card p-6 w-full max-w-md space-y-4">
            <h2 className="font-semibold text-lg">Complete UPI payment</h2>
            <p className="text-sm text-slate-500">
              Amount: <span className="font-semibold">₹{paying.payment.amount}</span><br />
              UPI ID: <span className="font-mono">{paying.academyUpiId}</span><br />
              Reference: <span className="font-mono">{paying.payment.reference}</span>
            </p>
            {paying.qrUrl && (
              <div className="flex justify-center">
                <img src={paying.qrUrl} alt="QR" className="h-48 w-48 rounded border" />
              </div>
            )}
            <a href={paying.upiUrl} className="btn-primary w-full justify-center">
              Open UPI app
            </a>
            <div>
              <label className="label">Enter UPI transaction ID after paying</label>
              <input className="input" value={txn} onChange={(e) => setTxn(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-outline" onClick={() => setPaying(null)}>Later</button>
              <button className="btn-primary" disabled={!txn} onClick={submitTxn}>Submit for verification</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
