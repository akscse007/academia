import express from 'express';
import { customAlphabet } from 'nanoid';
import prisma from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();
const nano = customAlphabet('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 10);

router.use(authenticate);

router.post('/initiate', async (req, res, next) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ message: 'Students only' });
    const { batchId, type = 'monthly', amount: overrideAmount, forMonth } = req.body;
    const batch = await prisma.batch.findFirst({
      where: { id: batchId, academyId: req.user.academyId },
    });
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    const enrolled = await prisma.enrollment.findFirst({
      where: { studentId: req.user.id, batchId, status: 'active' },
    });
    if (!enrolled) return res.status(403).json({ message: 'Not enrolled in batch' });

    const academy = await prisma.academy.findUnique({ where: { id: req.user.academyId } });
    if (!academy?.upiId) return res.status(400).json({ message: 'Academy has no UPI ID set' });

    let amount = overrideAmount ? Number(overrideAmount) : null;
    if (!amount) {
      if (type === 'admission') {
        amount = Number(enrolled.admissionFeeOverride ?? batch.admissionFee);
      } else {
        amount = Number(enrolled.monthlyFeeOverride ?? batch.monthlyFee);
      }
      amount -= Number(enrolled.discount || 0);
    }
    if (!amount || amount <= 0) return res.status(400).json({ message: 'No fee configured' });

    const reference = `${academy.slug.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)}-${nano()}`;

    const payment = await prisma.payment.create({
      data: {
        academyId: academy.id,
        studentId: req.user.id,
        batchId: batch.id,
        type,
        amount,
        forMonth: forMonth || new Date().toISOString().slice(0, 7),
        reference,
        status: 'pending',
      },
    });

    const payeeName = encodeURIComponent(academy.name);
    const txnNote = encodeURIComponent(`${batch.name} ${type} fee - ${reference}`);
    const upiUrl = `upi://pay?pa=${encodeURIComponent(academy.upiId)}&pn=${payeeName}&am=${amount}&cu=INR&tn=${txnNote}&tr=${reference}`;

    res.status(201).json({
      payment,
      upiUrl,
      qrUrl: academy.paymentQrUrl,
      academyUpiId: academy.upiId,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/submit-txn', async (req, res, next) => {
  try {
    const existing = await prisma.payment.findFirst({
      where: { id: req.params.id, studentId: req.user.id },
    });
    if (!existing) return res.status(404).json({ message: 'Not found' });
    const p = await prisma.payment.update({
      where: { id: existing.id },
      data: {
        upiTxnId: String(req.body.upiTxnId || '').trim(),
        status: 'awaiting_verification',
      },
    });
    const academy = await prisma.academy.findUnique({ where: { id: p.academyId } });
    await prisma.notification.create({
      data: {
        userId: academy.ownerUserId,
        academyId: p.academyId,
        title: 'Payment awaiting verification',
        message: `${req.user.name} submitted txn ${p.upiTxnId} for ${p.amount}`,
        type: 'system',
      },
    });
    res.json(p);
  } catch (err) {
    next(err);
  }
});

router.get('/mine', async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ message: 'Students only' });
  const list = await prisma.payment.findMany({
    where: { studentId: req.user.id },
    orderBy: { createdAt: 'desc' },
    include: { batch: { select: { id: true, name: true } } },
  });
  res.json(list.map((p) => ({ ...p, batchId: p.batch || p.batchId })));
});

router.get('/', requireRole('teacher'), async (req, res, next) => {
  try {
    const { status, batchId, studentId, month, year } = req.query;
    const where = { academyId: req.user.academyId };
    if (status) where.status = status;
    if (batchId) where.batchId = batchId;
    if (studentId) where.studentId = studentId;
    if (month && year) where.forMonth = `${year}-${String(month).padStart(2, '0')}`;
    else if (year) where.forMonth = { startsWith: `${year}-` };

    const list = await prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { id: true, name: true, email: true, phone: true } },
        batch: { select: { id: true, name: true } },
      },
    });
    res.json(list.map((p) => ({
      ...p,
      studentId: p.student || p.studentId,
      batchId: p.batch || p.batchId,
    })));
  } catch (err) {
    next(err);
  }
});

router.put('/:id/verify', requireRole('teacher'), async (req, res, next) => {
  try {
    const existing = await prisma.payment.findFirst({
      where: { id: req.params.id, academyId: req.user.academyId },
    });
    if (!existing) return res.status(404).json({ message: 'Not found' });
    const p = await prisma.payment.update({
      where: { id: existing.id },
      data: {
        status: 'successful',
        verifiedById: req.user.id,
        verifiedAt: new Date(),
        receiptNo: `RCPT-${nano()}`,
      },
    });
    await prisma.notification.create({
      data: {
        userId: p.studentId,
        academyId: p.academyId,
        title: 'Payment verified',
        message: `Your payment of ${p.amount} has been verified. Receipt: ${p.receiptNo}`,
        type: 'payment_verified',
      },
    });
    res.json(p);
  } catch (err) {
    next(err);
  }
});

router.put('/:id/reject', requireRole('teacher'), async (req, res, next) => {
  try {
    const existing = await prisma.payment.findFirst({
      where: { id: req.params.id, academyId: req.user.academyId },
    });
    if (!existing) return res.status(404).json({ message: 'Not found' });
    const p = await prisma.payment.update({
      where: { id: existing.id },
      data: {
        status: 'rejected',
        rejectionReason: req.body.reason || '',
      },
    });
    await prisma.notification.create({
      data: {
        userId: p.studentId,
        academyId: p.academyId,
        title: 'Payment rejected',
        message: `Your payment was rejected. ${p.rejectionReason}`,
        type: 'payment_rejected',
      },
    });
    res.json(p);
  } catch (err) {
    next(err);
  }
});

router.get('/reports/summary', requireRole('teacher'), async (req, res, next) => {
  try {
    const academyId = req.user.academyId;
    const year = String(req.query.year || new Date().getFullYear());

    const monthlyRows = await prisma.payment.groupBy({
      by: ['forMonth'],
      where: {
        academyId,
        status: 'successful',
        forMonth: { startsWith: `${year}-` },
      },
      _sum: { amount: true },
      orderBy: { forMonth: 'asc' },
    });
    const monthly = monthlyRows.map((r) => ({ _id: r.forMonth, total: Number(r._sum.amount || 0) }));

    const byBatchRows = await prisma.payment.groupBy({
      by: ['batchId'],
      where: { academyId, status: 'successful' },
      _sum: { amount: true },
    });
    const byBatch = byBatchRows.map((r) => ({ _id: r.batchId, total: Number(r._sum.amount || 0) }));

    const statusRows = await prisma.payment.groupBy({
      by: ['status'],
      where: { academyId },
      _count: { _all: true },
      _sum: { amount: true },
    });
    const statusCounts = statusRows.map((r) => ({
      _id: r.status,
      count: r._count._all,
      total: Number(r._sum.amount || 0),
    }));

    res.json({ monthly, byBatch, statusCounts });
  } catch (err) {
    next(err);
  }
});

export default router;
