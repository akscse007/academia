import { motion } from 'framer-motion';

export default function StatCard({ icon: Icon, label, value, hint, accent = 'brand' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-5 flex items-start justify-between"
    >
      <div>
        <p className="text-xs uppercase tracking-wide font-semibold text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      </div>
      {Icon && (
        <div className={`h-10 w-10 rounded-xl bg-${accent}/10 text-${accent} flex items-center justify-center`}>
          <Icon className="h-5 w-5" />
        </div>
      )}
    </motion.div>
  );
}
