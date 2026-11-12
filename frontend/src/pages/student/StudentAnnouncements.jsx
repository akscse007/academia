import { useEffect, useState } from 'react';
import api from '../../api/client';
import EmptyState from '../../components/EmptyState';
import { Megaphone } from 'lucide-react';

export default function StudentAnnouncements() {
  const [list, setList] = useState([]);
  useEffect(() => { api.get('/announcements').then(({ data }) => setList(data)); }, []);

  if (!list.length) return <EmptyState title="No announcements yet" icon={Megaphone} />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Announcements</h1>
      <div className="space-y-3">
        {list.map((a) => (
          <div key={a.id} className="card p-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 bg-brand/10 text-brand rounded-lg flex items-center justify-center"><Megaphone className="h-5 w-5" /></div>
              <div>
                <h3 className="font-semibold">{a.title}</h3>
                <p className="text-xs text-slate-500">{new Date(a.createdAt).toLocaleString()}</p>
                <p className="mt-2 text-sm whitespace-pre-line">{a.message}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
