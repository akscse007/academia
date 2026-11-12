import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

function flatten(a) {
  if (!a) return a;
  return {
    ...a,
    batchIds: (a.batches || []).map((b) => ({ id: b.batch?.id || b.batchId, name: b.batch?.name })),
    studentIds: (a.students || []).map((s) => ({ id: s.studentId })),
  };
}

router.get('/', async (req, res, next) => {
  try {
    const academyId = req.user.academyId;
    if (req.user.role === 'teacher') {
      const list = await prisma.announcement.findMany({
        where: { academyId },
        orderBy: { createdAt: 'desc' },
        include: {
          batches: { include: { batch: { select: { id: true, name: true } } } },
          students: true,
        },
      });
      return res.json(list.map(flatten));
    }
    // student view
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: req.user.id, status: 'active' },
      select: { batchId: true },
    });
    const batchIds = enrollments.map((e) => e.batchId);
    const list = await prisma.announcement.findMany({
      where: {
        academyId,
        OR: [
          { targetType: 'all' },
          { AND: [{ targetType: 'batch' }, { batches: { some: { batchId: { in: batchIds } } } }] },
          { AND: [{ targetType: 'students' }, { students: { some: { studentId: req.user.id } } }] },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(list);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('teacher'), async (req, res, next) => {
  try {
    const { title, message, targetType, batchIds = [], studentIds = [] } = req.body;
    if (!title || !message) return res.status(400).json({ message: 'Missing fields' });

    const data = {
      academyId: req.user.academyId,
      title,
      message,
      targetType,
      createdById: req.user.id,
    };
    if (targetType === 'batch' && batchIds.length) {
      data.batches = { create: batchIds.map((b) => ({ batchId: b })) };
    }
    if (targetType === 'students' && studentIds.length) {
      data.students = { create: studentIds.map((s) => ({ studentId: s })) };
    }
    const a = await prisma.announcement.create({ data });

    // fan-out notifications
    let targetUsers = [];
    if (targetType === 'all') {
      const students = await prisma.user.findMany({
        where: { academyId: req.user.academyId, role: 'student', status: 'active' },
        select: { id: true },
      });
      targetUsers = students.map((s) => s.id);
    } else if (targetType === 'batch') {
      const enrollments = await prisma.enrollment.findMany({
        where: { batchId: { in: batchIds }, status: 'active' },
        select: { studentId: true },
      });
      targetUsers = [...new Set(enrollments.map((e) => e.studentId))];
    } else {
      targetUsers = studentIds;
    }

    if (targetUsers.length) {
      await prisma.notification.createMany({
        data: targetUsers.map((uid) => ({
          userId: uid,
          academyId: req.user.academyId,
          title,
          message,
          type: 'announcement',
        })),
      });
    }

    res.status(201).json(a);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRole('teacher'), async (req, res, next) => {
  try {
    const existing = await prisma.announcement.findFirst({
      where: { id: req.params.id, academyId: req.user.academyId },
    });
    if (!existing) return res.status(404).json({ message: 'Not found' });
    await prisma.announcement.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
