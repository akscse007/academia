import { Inbox } from 'lucide-react';

export default function EmptyState({ title = 'Nothing here yet', message, icon: Icon = Inbox, action }) {
  return (
    <div className="card p-10 flex flex-col items-center text-center">
      <div className="h-14 w-14 rounded-full bg-brand/10 text-brand flex items-center justify-center mb-3">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {message && <p className="text-sm text-slate-500 mt-1 max-w-md">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
