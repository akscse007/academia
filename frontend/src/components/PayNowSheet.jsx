import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { assetUrl } from '../utils/assetUrl';
import { X, Copy, ExternalLink, CheckCircle2, QrCode, Smartphone } from 'lucide-react';

export default function PayNowSheet({
  batch, academy, type = 'monthly', month, monthLabel, amount, onClose, onDone,
}) {
  const [step, setStep] = useState('confirm'); // confirm | pay | submit
  const [payment, setPayment] = useState(null);
  const [upiUrl, setUpiUrl] = useState('');
  const [txn, setTxn] = useState('');
  const [loading, setLoading] = useState(false);

  // Lock body scroll while sheet is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const initiate = async () => {
    setLoading(true);
    try {
      const body = { batchId: batch.id, type };
      if (month) body.forMonth = month;
      const { data } = await api.post('/payments/initiate', body);
      setPayment(data.payment);
      setUpiUrl(data.upiUrl);
      setStep('pay');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const submitTxn = async () => {
    if (!txn.trim()) {
      toast.error('Enter the UPI transaction ID');
      return;
    }
    setLoading(true);
    try {
      await api.post(`/payments/${payment.id}/submit-txn`, { upiTxnId: txn });
      setStep('done');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const copy = (t) => {
    navigator.clipboard.writeText(t);
    toast.success('Copied');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[92vh] overflow-y-auto">
        {/* Grab handle for mobile */}
        <div className="sm:hidden flex justify-center pt-2 pb-1">
          <div className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-semibold">
            {step === 'done' ? 'Payment submitted' : type === 'admission' ? 'Pay admission fee' : `Pay for ${monthLabel || month}`}
          </h2>
          <button className="btn-ghost -mr-2" onClick={onClose}><X className="h-4 w-4" /></button>
        </div>

        {step === 'confirm' && (
          <div className="p-5 space-y-4">
            <div className="rounded-xl bg-brand/5 border border-brand/20 p-4">
              <p className="text-xs text-slate-500">You will pay</p>
              <p className="text-3xl font-extrabold text-brand mt-1">₹{amount}</p>
              <p className="text-xs text-slate-500 mt-2">
                {batch.name}
                {type === 'monthly' && monthLabel ? ` · ${monthLabel}` : ''}
                {type === 'admission' ? ' · One-time admission' : ''}
              </p>
            </div>
            {type === 'monthly' && month && new Date(month + '-01') > new Date() && (
              <p className="text-xs rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 p-2">
                ✓ Advance payment for {monthLabel}
              </p>
            )}
            <button className="btn-primary w-full justify-center" disabled={loading} onClick={initiate}>
              {loading ? 'Creating…' : 'Continue to UPI'}
            </button>
            <button className="btn-outline w-full justify-center" onClick={onClose}>Cancel</button>
          </div>
        )}

        {step === 'pay' && (
          <div className="p-5 space-y-4">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-4 space-y-1 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Amount</span>
                <span className="font-semibold">₹{payment.amount}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">To</span>
                <span className="font-semibold truncate">{academy?.name}</span>
              </div>
              <div className="flex justify-between gap-2 items-center">
                <span className="text-slate-500">UPI ID</span>
                <span className="flex items-center gap-1 min-w-0">
                  <span className="font-mono text-xs truncate">{academy?.upiId}</span>
                  <button className="btn-ghost -mr-2" onClick={() => copy(academy.upiId)}><Copy className="h-3 w-3" /></button>
                </span>
              </div>
              <div className="flex justify-between gap-2 items-center">
                <span className="text-slate-500">Ref</span>
                <span className="flex items-center gap-1 min-w-0">
                  <span className="font-mono text-xs truncate">{payment.reference}</span>
                  <button className="btn-ghost -mr-2" onClick={() => copy(payment.reference)}><Copy className="h-3 w-3" /></button>
                </span>
              </div>
            </div>

            {/* Auto-generated UPI QR with exact amount pre-filled */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white p-4">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 text-center mb-2 flex items-center justify-center gap-1">
                <QrCode className="h-3 w-3" /> Scan with any UPI app
              </p>
              <div className="flex justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(upiUrl)}`}
                  alt="UPI QR"
                  className="w-48 h-48 sm:w-56 sm:h-56"
                />
              </div>
              <p className="text-[11px] text-slate-500 text-center mt-2">
                ₹{payment.amount} · Amount is pre-filled in the app after scanning
              </p>
            </div>

            <div className="relative text-center">
              <span className="absolute inset-x-0 top-1/2 h-px bg-slate-200 dark:bg-slate-700" />
              <span className="relative inline-block bg-white dark:bg-slate-900 px-2 text-xs text-slate-400 uppercase tracking-wider">
                or on this phone
              </span>
            </div>

            <a href={upiUrl} className="btn-primary w-full justify-center">
              <Smartphone className="h-4 w-4" /> Open UPI app <ExternalLink className="h-4 w-4" />
            </a>

            {academy?.paymentQrUrl && (
              <details className="rounded-xl border border-slate-200 dark:border-slate-700">
                <summary className="px-4 py-3 text-sm font-medium cursor-pointer">Academy's saved QR</summary>
                <div className="p-4 flex justify-center">
                  <img src={assetUrl(academy.paymentQrUrl)} alt="QR" className="w-48 h-48 rounded-lg border" />
                </div>
              </details>
            )}

            <div className="pt-2">
              <label className="label">After paying, enter your UPI transaction ID</label>
              <input
                className="input"
                placeholder="e.g. 429384729484"
                value={txn}
                onChange={(e) => setTxn(e.target.value)}
                inputMode="numeric"
                autoComplete="off"
              />
              <p className="text-xs text-slate-500 mt-1">
                Open your UPI app → find this payment → copy the 12-digit UPI/UTR id.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-outline" onClick={onClose}>Later</button>
              <button className="btn-primary" disabled={loading || !txn.trim()} onClick={submitTxn}>
                {loading ? 'Submitting…' : 'Submit for verification'}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="p-6 text-center space-y-4">
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Submitted for verification</h3>
              <p className="text-sm text-slate-500 mt-1">
                Your teacher will verify the payment shortly. You'll see a receipt here once approved.
              </p>
            </div>
            <button className="btn-primary w-full justify-center" onClick={onDone}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
