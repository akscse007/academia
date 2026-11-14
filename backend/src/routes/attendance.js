import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// Normalise a YYYY-MM-DD string to a UTC midnight Date (so @db.Date is stable)
function toDateOnly(str) {
  const [y, m, d] = String(str).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

// Teacher: get roster + existing attendance for a batch on a date
router.get('/batch/:batchId', requireRole('teacher'), async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const date = toDateOnly(req.query.date);
    if (!date) return res.status(400).json({ message: 'Valid date (YYYY-MM-DD) required' });

    const batch = await prisma.batch.findFirst({
      where: { id: batchId, academyId: req.user.academyId },
    });
    if (!batch) return res.status(404).json({ message: 'Batch not found' });

    const enrollments = await prisma.enrollment.findMany({
      where: { batchId, status: 'active' },
      include: { student: { select: { id: true, name: true, email: true } } },
      orderBy: { student: { name: 'asc' } },
    });

    const existing = await prisma.attendance.findMany({
      where: { batchId, date },
    });
    const byStudent = Object.fromEntries(existing.map((a) => [a.studentId, a]));

    const roster = enrollments
      .filter((e) => e.student)
      .map((e) => ({
        studentId: e.student.id,
        name: e.student.name,
        email: e.student.email,
        status: byStudent[e.student.id]?.status || null,
        note: byStudent[e.student.id]?.note || '',
      }));

    res.json({
      batch: { id: batch.id, name: batch.name },
      date: req.query.date,
      roster,
      alreadyMarked: existing.length > 0,
    });
  } catch (err) {
    next(err);
  }
});

// Teacher: save/overwrite attendance for a batch on a date
// body: { date: 'YYYY-MM-DD', records: [{ studentId, status, note }] }
router.post('/batch/:batchId', requireRole('teacher'), async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const date = toDateOnly(req.body.date);
    if (!date) return res.status(400).json({ message: 'Valid date required' });
    const records = Array.isArray(req.body.records) ? req.body.records : [];

    const batch = await prisma.batch.findFirst({
      where: { id: batchId, academyId: req.user.academyId },
    });
    if (!batch) return res.status(404).json({ message: 'Batch not found' });

    const ops = records
      .filter((r) => r.studentId && r.status)
      .map((r) =>
        prisma.attendance.upsert({
          where: { batchId_date_studentId: { batchId, date, studentId: r.studentId } },
          update: { status: r.status, note: r.note || '', markedById: req.user.id },
          create: {
            academyId: req.user.academyId,
            batchId,
            studentId: r.studentId,
            date,
            status: r.status,
            note: r.note || '',
            markedById: req.user.id,
          },
        })
      );
    await prisma.$transaction(ops);

    res.json({ ok: true, saved: ops.length });
  } catch (err) {
    next(err);
  }
});

// Teacher: per-batch attendance summary (counts per student over a date range)
router.get('/batch/:batchId/summary', requireRole('teacher'), async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const batch = await prisma.batch.findFirst({
      where: { id: batchId, academyId: req.user.academyId },
    });
    if (!batch) return res.status(404).json({ message: 'Batch not found' });

    const where = { batchId };
    if (req.query.from) where.date = { gte: toDateOnly(req.query.from) };
    if (req.query.to) where.date = { ...(where.date || {}), lte: toDateOnly(req.query.to) };

    const records = await prisma.attendance.findMany({
      where,
      include: { student: { select: { id: true, name: true } } },
    });

    const distinctDates = [...new Set(records.map((r) => r.date.toISOString().slice(0, 10)))].sort();
    const perStudent = {};
    for (const r of records) {
      const s = (perStudent[r.studentId] ||= {
        studentId: r.studentId,
        name: r.student?.name,
        present: 0, absent: 0, late: 0, excused: 0, total: 0,
      });
      s[r.status] = (s[r.status] || 0) + 1;
      s.total += 1;
    }
    res.json({
      batch: { id: batch.id, name: batch.name },
      totalDays: distinctDates.length,
      dates: distinctDates,
      students: Object.values(perStudent).map((s) => ({
        ...s,
        percent: s.total ? Math.round(((s.present + s.late) / s.total) * 100) : 0,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// Student: own attendance (optionally by batch)
router.get('/mine', async (req, res, next) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ message: 'Students only' });
    const where = { studentId: req.user.id };
    if (req.query.batchId) where.batchId = req.query.batchId;
    const records = await prisma.attendance.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { batch: { select: { id: true, name: true } } },
      take: 200,
    });
    const total = records.length;
    const present = records.filter((r) => r.status === 'present' || r.status === 'late').length;
    res.json({
      percent: total ? Math.round((present / total) * 100) : 0,
      total,
      present,
      records: records.map((r) => ({
        id: r.id,
        date: r.date.toISOString().slice(0, 10),
        status: r.status,
        note: r.note,
        batch: r.batch,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
