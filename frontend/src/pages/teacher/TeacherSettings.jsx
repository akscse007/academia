import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { assetUrl } from '../../utils/assetUrl';

export default function TeacherSettings() {
  const { academy, refresh } = useAuth();
  const [upiId, setUpiId] = useState('');
  const [lateFee, setLateFee] = useState(0);
  const [grace, setGrace] = useState(5);
  const [pwd, setPwd] = useState({ current: '', next: '' });

  useEffect(() => {
    if (academy) {
      setUpiId(academy.upiId || '');
      setLateFee(academy.feeSettings?.lateFeePerDay || 0);
      setGrace(academy.feeSettings?.gracePeriodDays || 5);
    }
  }, [academy]);

  const saveUpi = async () => {
    try {
      await api.put('/academy/me', {
        upiId,
        feeSettings: {
          lateFeePerDay: Number(lateFee),
          gracePeriodDays: Number(grace),
          currency: academy?.feeSettings?.currency || 'INR',
        },
      });
      toast.success('Saved');
      refresh();
    } catch (err) { toast.error('Failed'); }
  };

  const uploadQr = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    try {
      await api.post('/academy/me/qr', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('QR updated');
      refresh();
    } catch { toast.error('Upload failed'); }
  };

  const changePwd = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/change-password', pwd);
      toast.success('Password changed');
      setPwd({ current: '', next: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="card p-6">
        <h2 className="font-semibold mb-3">UPI & fee settings</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">UPI ID</label>
            <input className="input" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="yourhandle@upi" />
          </div>
          <div>
            <label className="label">Payment QR code</label>
            <div className="flex items-center gap-3">
              {academy?.paymentQrUrl && <img src={assetUrl(academy.paymentQrUrl)} alt="" className="h-16 w-16 rounded border" />}
              <label className="btn-outline text-xs cursor-pointer">
                Upload QR
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadQr(e.target.files[0])} />
              </label>
            </div>
          </div>
          <div>
            <label className="label">Late fee per day (₹)</label>
            <input type="number" className="input" value={lateFee} onChange={(e) => setLateFee(e.target.value)} />
          </div>
          <div>
            <label className="label">Grace period (days)</label>
            <input type="number" className="input" value={grace} onChange={(e) => setGrace(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button className="btn-primary" onClick={saveUpi}>Save</button>
        </div>
      </div>

      <form onSubmit={changePwd} className="card p-6 space-y-3">
        <h2 className="font-semibold">Change password</h2>
        <div>
          <label className="label">Current password</label>
          <input required type="password" className="input" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} />
        </div>
        <div>
          <label className="label">New password</label>
          <input required type="password" minLength={6} className="input" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} />
        </div>
        <div className="flex justify-end">
          <button className="btn-primary">Update password</button>
        </div>
      </form>
    </div>
  );
}
