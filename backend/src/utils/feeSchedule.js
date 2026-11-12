// Monthly fee schedule for a given enrollment.
// Rule: the student owes a monthly fee for every month from the month they
// enrolled (inclusive) up to and including the current calendar month.
// They may pay future months only after every earlier month is fully paid.

export function monthKey(d) {
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en', { month: 'long', year: 'numeric' });
}

// Return every month between two YYYY-MM keys, inclusive, in ascending order.
export function monthRange(from, to) {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  const out = [];
  let y = fy, m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m === 13) { m = 1; y += 1; }
  }
  return out;
}

export function nextMonthKey(key) {
  const [y, m] = key.split('-').map(Number);
  const nm = m === 12 ? 1 : m + 1;
  const ny = m === 12 ? y + 1 : y;
  return `${ny}-${String(nm).padStart(2, '0')}`;
}

// Build the full schedule for a student+batch.
// - enrollment: Prisma Enrollment row (needs enrolledAt + fee overrides)
// - batch: Prisma Batch row (monthlyFee)
// - payments: Prisma Payment rows for (student, batch), type 'monthly'
// Returns an array: [{ month, label, amount, status, paymentId, payable }]
// `status` ∈ 'successful' | 'awaiting_verification' | 'pending' | 'failed' | 'rejected' | 'unpaid'
// `payable` is true only for the first month whose status is NOT 'successful'
// (so students pay strictly in order).
export function buildSchedule({ enrollment, batch, payments, horizonMonthsAhead = 11 }) {
  const monthlyFee = Number(enrollment.monthlyFeeOverride ?? batch.monthlyFee) - Number(enrollment.discount || 0);
  const firstMonth = monthKey(enrollment.enrolledAt);
  const now = new Date();
  const horizon = new Date(now.getFullYear(), now.getMonth() + horizonMonthsAhead, 1);
  const lastMonth = monthKey(horizon);
  const months = monthRange(firstMonth, lastMonth);

  // Index payments by forMonth → the "best" one for display (successful > awaiting > pending > failed/rejected)
  const rank = { successful: 4, awaiting_verification: 3, pending: 2, failed: 1, rejected: 1 };
  const byMonth = {};
  for (const p of payments) {
    if (!p.forMonth || p.type !== 'monthly') continue;
    const cur = byMonth[p.forMonth];
    if (!cur || (rank[p.status] || 0) > (rank[cur.status] || 0)) byMonth[p.forMonth] = p;
  }

  let foundPayable = false;
  const result = months.map((m) => {
    const p = byMonth[m];
    const status = p ? p.status : 'unpaid';
    const base = {
      month: m,
      label: monthLabel(m),
      amount: p ? Number(p.amount) : monthlyFee,
      status,
      paymentId: p ? p.id : null,
      payable: false,
    };
    if (!foundPayable && status !== 'successful') {
      base.payable = true;
      foundPayable = true;
    }
    return base;
  });

  const nextPayable = result.find((r) => r.payable) || null;
  const currentMonth = monthKey(now);
  const overdue = result.filter((r) => r.month <= currentMonth && r.status !== 'successful').length;
  const paidCount = result.filter((r) => r.status === 'successful').length;

  return {
    firstMonth,
    currentMonth,
    monthlyFee,
    months: result,
    nextPayable,
    overdue,
    paidCount,
  };
}
