export default function Loader({ full = true, label = 'Loading…' }) {
  return (
    <div className={`${full ? 'min-h-screen' : 'p-8'} flex items-center justify-center`}>
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-full border-4 border-brand/20 border-t-brand animate-spin" />
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}
