import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import EmptyState from '../../components/EmptyState';
import { assetUrl } from '../../utils/assetUrl';
import { Image as ImageIcon, X, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

const STATUS = ['', 'awaiting_verification', 'pending', 'successful', 'failed', 'rejected'];

export default function TeacherPayments() {
  const [list, setList] = useState([]);
  const [status, setStatus] = useState('awaiting_verification');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [preview, setPreview] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [cleaning, setCleaning] = useState(false);

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

  const cleanupStale = async () => {
    if (!confirm('Delete pending payment attempts older than 2 hours that have no transaction ID or screenshot?')) return;
    setCleaning(true);
    try {
      const { data } = await api.post('/payments/cleanup-pending');
      toast.success(`Removed ${data.removed} stale attempt${data.removed === 1 ? '' : 's'}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setCleaning(false); }
  };

  // Group rows by student + batch + month + type, keeping the most relevant one.
  // Any extra rows for the same key become an "attempts" list under the primary row.
  const rank = { successful: 4, awaiting_verification: 3, pending: 2, failed: 1, rejected: 1 };
  const groups = new Map();
  for (const p of list) {
    const sId = p.studentId?.id || p.studentId;
    const bId = p.batchId?.id || p.batchId;
    const key = `${sId}|${bId}|${p.forMonth || 'adm'}|${p.type}`;
    const cur = groups.get(key);
    if (!cur) groups.set(key, { primary: p, others: [] });
    else {
      if ((rank[p.status] || 0) > (rank[cur.primary.status] || 0)) {
        cur.others.push(cur.primary);
        cur.primary = p;
      } else {
        cur.others.push(p);
      }
    }
  }
  const rows = Array.from(groups.values());

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Payments</h1>
        <div className="flex gap-2 flex-wrap">
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS.map((s) => <option key={s} value={s}>{s ? s.replace('_', ' ') : 'All'}</option>)}
          </select>
          <select className="input" value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">All months</option>
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i} value={i + 1}>{new Date(2000, i).toLocaleString('en', { month: 'long' })}</option>
            ))}
          </select>
          <input type="number" className="input w-24" value={year} onChange={(e) => setYear(e.target.value)} />
          <button className="btn-outline text-xs" disabled={cleaning} onClick={cleanupStale}>
            <Trash2 className="h-3 w-3" /> Cleanup stale
          </button>
        </div>
      </div>

      {!list.length && <EmptyState title="No payments" message="Student payments will show up here once initiated." />}

      <div className="space-y-2">
        {rows.map(({ primary: p, others }) => (
          <PaymentCard
            key={p.id}
            p={p}
            others={others}
            expanded={expanded[p.id]}
            onToggle={() => setExpanded((s) => ({ ...s, [p.id]: !s[p.id] }))}
            onVerify={() => verify(p)}
            onReject={() => reject(p)}
            onPreview={setPreview}
          />
        ))}
      </div>

      {/* Screenshot full-screen preview */}
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <button className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
          <img src={assetUrl(preview)} alt="Payment screenshot" className="max-h-[90vh] max-w-full rounded-xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

function PaymentCard({ p, others, expanded, onToggle, onVerify, onReject, onPreview }) {
  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        {/* Screenshot thumbnail */}
        {p.screenshotUrl ? (
          <button
            onClick={() => onPreview(p.screenshotUrl)}
            className="h-16 w-16 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700"
          >
            <img src={assetUrl(p.screenshotUrl)} alt="" className="h-full w-full object-cover" />
          </button>
        ) : (
          <div className="h-16 w-16 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0 border border-slate-200 dark:border-slate-700">
            <ImageIcon className="h-5 w-5" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <p className="font-semibold truncate">{p.studentId?.name || '—'}</p>
              <p className="text-xs text-slate-500 truncate">
                {p.batchId?.name || '—'} · {p.forMonth || 'Admission'} · {p.type}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-bold">₹{p.amount}</p>
              <p className="text-[10px] text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className={
              p.status === 'successful' ? 'badge-ok' :
              p.status === 'awaiting_verification' ? 'badge-warn' :
              p.status === 'pending' ? 'badge-muted' :
              'badge-err'
            }>{p.status.replace('_', ' ')}</span>
            {p.upiTxnId && (
              <span className="text-xs font-mono text-slate-500">UTR: {p.upiTxnId}</span>
            )}
            {!p.upiTxnId && p.screenshotUrl && (
              <span className="text-xs text-slate-500">📷 Screenshot attached</span>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {p.status === 'awaiting_verification' && (
              <>
                <button className="btn-primary text-xs" onClick={onVerify}>Verify ✓</button>
                <button className="btn-danger text-xs" onClick={onReject}>Reject</button>
              </>
            )}
            {p.status === 'pending' && (
              <button className="btn-outline text-xs" onClick={onVerify}>Mark paid</button>
            )}
            {others.length > 0 && (
              <button className="btn-ghost text-xs ml-auto" onClick={onToggle}>
                {expanded ? <><ChevronUp className="h-3 w-3" /> Hide</> : <><ChevronDown className="h-3 w-3" /> {others.length} other attempt{others.length > 1 ? 's' : ''}</>}
              </button>
            )}
          </div>

          {expanded && others.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
              {others.map((o) => (
                <div key={o.id} className="flex items-center justify-between text-xs">
                  <div className="text-slate-500">
                    {new Date(o.createdAt).toLocaleString()} · ref {o.reference}
                  </div>
                  <span className={
                    o.status === 'successful' ? 'badge-ok' :
                    o.status === 'awaiting_verification' ? 'badge-warn' :
                    o.status === 'pending' ? 'badge-muted' :
                    'badge-err'
                  }>{o.status.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
