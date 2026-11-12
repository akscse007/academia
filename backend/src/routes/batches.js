import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    if (req.user.role === 'teacher') {
      const list = await prisma.batch.findMany({
        where: { academyId: req.user.academyId },
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { enrollments: { where: { status: 'active' } } } } },
      });
      return res.json(list.map((b) => ({ ...b, enrolledCount: b._count.enrollments })));
    }
    if (req.user.role === 'student') {
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: req.user.id, status: 'active' },
        include: { batch: true },
      });
      return res.json(enrollments.map((e) => e.batch));
    }
    res.json([]);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('teacher'), async (req, res, next) => {
  try {
    const b = req.body || {};
    const data = {
      academyId: req.user.academyId,
      name: b.name,
      description: b.description || '',
      subject: b.subject || '',
      monthlyFee: Number(b.monthlyFee || 0),
      admissionFee: Number(b.admissionFee || 0),
      capacity: b.capacity === '' || b.capacity == null ? null : Number(b.capacity),
      schedule: Array.isArray(b.schedule) ? b.schedule : [],
    };
    if (b.startDate) data.startDate = new Date(b.startDate);
    if (b.endDate) data.endDate = new Date(b.endDate);
    const created = await prisma.batch.create({ data });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireRole('teacher'), async (req, res, next) => {
  try {
    const existing = await prisma.batch.findFirst({
      where: { id: req.params.id, academyId: req.user.academyId },
    });
    if (!existing) return res.status(404).json({ message: 'Not found' });
    const b = req.body || {};
    const data = {};
    const map = ['name', 'description', 'subject', 'status', 'schedule'];
    for (const k of map) if (k in b) data[k] = b[k];
    if ('monthlyFee' in b) data.monthlyFee = Number(b.monthlyFee);
    if ('admissionFee' in b) data.admissionFee = Number(b.admissionFee);
    if ('capacity' in b) data.capacity = b.capacity === '' || b.capacity == null ? null : Number(b.capacity);
    if ('startDate' in b) data.startDate = b.startDate ? new Date(b.startDate) : null;
    if ('endDate' in b) data.endDate = b.endDate ? new Date(b.endDate) : null;
    const updated = await prisma.batch.update({ where: { id: existing.id }, data });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRole('teacher'), async (req, res, next) => {
  try {
    const existing = await prisma.batch.findFirst({
      where: { id: req.params.id, academyId: req.user.academyId },
    });
    if (!existing) return res.status(404).json({ message: 'Not found' });
    const b = await prisma.batch.update({
      where: { id: existing.id },
      data: { status: 'archived' },
    });
    res.json(b);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const b = await prisma.batch.findFirst({
      where: { id: req.params.id, academyId: req.user.academyId },
    });
    if (!b) return res.status(404).json({ message: 'Not found' });

    if (req.user.role === 'student') {
      const enrolled = await prisma.enrollment.findFirst({
        where: { studentId: req.user.id, batchId: b.id, status: 'active' },
      });
      if (!enrolled) return res.status(403).json({ message: 'Not enrolled' });
      const [notes, payments, totalEnrolled] = await Promise.all([
        prisma.note.findMany({
          where: {
            academyId: req.user.academyId,
            published: true,
            batches: { some: { batchId: b.id } },
          },
          orderBy: { createdAt: 'desc' },
          select: { id: true, title: true, description: true, folder: true, fileSize: true, createdAt: true, recordingPermission: true },
        }),
        prisma.payment.findMany({
          where: { studentId: req.user.id, batchId: b.id },
          orderBy: { createdAt: 'desc' },
          take: 24,
        }),
        prisma.enrollment.count({ where: { batchId: b.id, status: 'active' } }),
      ]);
      const effectiveMonthlyFee = Number(enrolled.monthlyFeeOverride ?? b.monthlyFee) - Number(enrolled.discount || 0);
      const effectiveAdmissionFee = Number(enrolled.admissionFeeOverride ?? b.admissionFee);
      return res.json({
        ...b,
        enrollment: enrolled,
        effectiveMonthlyFee,
        effectiveAdmissionFee,
        notes,
        payments,
        totalEnrolled,
      });
    }
    const enrollments = await prisma.enrollment.findMany({
      where: { batchId: b.id, status: 'active' },
      include: {
        student: {
          select: { id: true, name: true, email: true, phone: true, status: true, academicInfo: true, guardian: true },
        },
      },
    });
    res.json({ ...b, enrollments: enrollments.map((e) => ({ ...e, studentId: e.student })) });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/enroll', requireRole('teacher'), async (req, res, next) => {
  try {
    const { studentId } = req.body;
    const batch = await prisma.batch.findFirst({
      where: { id: req.params.id, academyId: req.user.academyId },
    });
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    const student = await prisma.user.findFirst({
      where: { id: studentId, academyId: req.user.academyId, role: 'student' },
    });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    if (student.status !== 'active') {
      return res.status(400).json({ message: 'Student must be approved first' });
    }

    const enrollment = await prisma.enrollment.upsert({
      where: { studentId_batchId: { studentId, batchId: batch.id } },
      update: { status: 'active' },
      create: {
        studentId,
        batchId: batch.id,
        academyId: batch.academyId,
        status: 'active',
      },
    });

    await prisma.notification.create({
      data: {
        userId: studentId,
        academyId: batch.academyId,
        title: 'Batch enrollment',
        message: `You have been enrolled in ${batch.name}`,
        type: 'enrollment',
      },
    });
    res.json(enrollment);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/remove', requireRole('teacher'), async (req, res, next) => {
  try {
    const { studentId } = req.body;
    const existing = await prisma.enrollment.findFirst({
      where: { batchId: req.params.id, studentId, academyId: req.user.academyId },
    });
    if (!existing) return res.status(404).json({ message: 'Not enrolled' });
    const e = await prisma.enrollment.update({
      where: { id: existing.id },
      data: { status: 'removed' },
    });
    res.json(e);
  } catch (err) {
    next(err);
  }
});

export default router;
