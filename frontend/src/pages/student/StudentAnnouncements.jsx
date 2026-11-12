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
      <h1 className="text-xl sm:text-2xl font-bold">Announcements</h1>
      <div className="space-y-3">
        {list.map((a) => (
          <div key={a.id} className="card p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 bg-brand/10 text-brand rounded-xl flex items-center justify-center shrink-0">
                <Megaphone className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm sm:text-base">{a.title}</h3>
                <p className="text-xs text-slate-500">{new Date(a.createdAt).toLocaleString()}</p>
                <p className="mt-2 text-sm whitespace-pre-line break-words">{a.message}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
