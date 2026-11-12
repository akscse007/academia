import express from 'express';
import { customAlphabet } from 'nanoid';
import prisma from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { buildSchedule, monthKey, monthLabel } from '../utils/feeSchedule.js';
import { memoryImageUploader, fileToDataUrl } from '../middleware/upload.js';

const router = express.Router();
const nano = customAlphabet('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 10);

router.use(authenticate);

// GET /api/payments/schedule?batchId=xxx&studentId=yyy
// - Student may omit studentId (defaults to self)
// - Teacher may specify studentId to inspect any enrolled student
router.get('/schedule', async (req, res, next) => {
  try {
    const { batchId } = req.query;
    if (!batchId) return res.status(400).json({ message: 'batchId required' });
    const studentId =
      req.user.role === 'teacher'
        ? req.query.studentId
        : req.user.id;
    if (!studentId) return res.status(400).json({ message: 'studentId required' });

    const batch = await prisma.batch.findFirst({
      where: { id: batchId, academyId: req.user.academyId },
    });
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId, batchId, status: 'active' },
    });
    if (!enrollment) return res.status(404).json({ message: 'Not enrolled' });

    const payments = await prisma.payment.findMany({
      where: { studentId, batchId, type: 'monthly' },
      orderBy: { createdAt: 'desc' },
    });

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, email: true, phone: true },
    });

    const schedule = buildSchedule({ enrollment, batch, payments });

    // Also include admission fee status
    const admission = await prisma.payment.findFirst({
      where: { studentId, batchId, type: 'admission', status: 'successful' },
    });

    res.json({
      student,
      batch: { id: batch.id, name: batch.name, subject: batch.subject, monthlyFee: batch.monthlyFee },
      enrollment: {
        id: enrollment.id,
        enrolledAt: enrollment.enrolledAt,
        monthlyFeeOverride: enrollment.monthlyFeeOverride,
        admissionFeeOverride: enrollment.admissionFeeOverride,
        discount: enrollment.discount,
      },
      admissionPaid: !!admission,
      ...schedule,
    });
  } catch (err) {
    next(err);
  }
});

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

    // Sequential-payment enforcement: for monthly payments the student may only
    // pay the earliest unpaid month in their schedule. They cannot skip ahead.
    if (type === 'monthly') {
      const payments = await prisma.payment.findMany({
        where: { studentId: req.user.id, batchId, type: 'monthly' },
      });
      const schedule = buildSchedule({ enrollment: enrolled, batch, payments });
      if (!schedule.nextPayable) {
        return res.status(400).json({ message: 'No monthly fee is due.' });
      }
      const targetMonth = forMonth || schedule.nextPayable.month;
      if (targetMonth !== schedule.nextPayable.month) {
        return res.status(400).json({
          message: `Please pay for ${monthLabel(schedule.nextPayable.month)} first before paying later months.`,
          nextPayable: schedule.nextPayable.month,
        });
      }
    }

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

    const resolvedMonth = type === 'monthly' ? (forMonth || new Date().toISOString().slice(0, 7)) : null;

    // Dedupe: if this student already has an open Payment row for the same
    // (batch, month, type) in a reusable state (pending or awaiting_verification
    // that hasn't had a txn id submitted yet), reuse it instead of creating a
    // new one. This prevents the "spam pending rows" problem when a student
    // taps "Pay now" several times.
    let payment = await prisma.payment.findFirst({
      where: {
        academyId: academy.id,
        studentId: req.user.id,
        batchId: batch.id,
        type,
        forMonth: type === 'monthly' ? resolvedMonth : null,
        status: 'pending',
      },
      orderBy: { createdAt: 'desc' },
    });

    let reference;
    if (payment) {
      reference = payment.reference;
      // Keep amount in sync in case teacher changed the fee
      if (Number(payment.amount) !== amount) {
        payment = await prisma.payment.update({
          where: { id: payment.id },
          data: { amount },
        });
      }
    } else {
      // NPCI UPI spec: `tr` must be alphanumeric A-Z 0-9 only, max 35 chars.
      // NO hyphens, slashes or special chars — Google Pay / PhonePe silently
      // reject these with a generic "check bank limits" error.
      const slugCode = academy.slug.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'ACADEMY';
      reference = `${slugCode}${nano()}`.replace(/[^A-Z0-9]/gi, '').slice(0, 35);
      payment = await prisma.payment.create({
        data: {
          academyId: academy.id,
          studentId: req.user.id,
          batchId: batch.id,
          type,
          amount,
          forMonth: resolvedMonth,
          reference,
          status: 'pending',
        },
      });
    }

    // Build a strictly spec-compliant UPI intent URL.
    // - pn / tn: alphanumeric + space only, trimmed
    // - am:      two-decimal-places string
    // - tr:      alphanumeric-only, ≤35 chars
    // - cu:      INR
    const cleanText = (s, max) =>
      String(s || '').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
    const payeeName = cleanText(academy.name, 50) || 'Academy';
    const noteSource = type === 'admission'
      ? `${batch.name} admission`
      : `${batch.name} ${forMonth || new Date().toISOString().slice(0, 7)}`;
    const txnNote = cleanText(noteSource, 50);
    const amountStr = Number(amount).toFixed(2);

    // Use RFC 3986 percent-encoding (spaces as %20, not +). Some UPI apps
    // display `+` literally and the payment fails.
    const enc = (s) => encodeURIComponent(s);
    const upiUrl =
      `upi://pay?pa=${enc(academy.upiId)}` +
      `&pn=${enc(payeeName)}` +
      `&am=${amountStr}` +
      `&cu=INR` +
      `&tn=${enc(txnNote)}` +
      `&tr=${reference}`;

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

// Student uploads a screenshot of their UPI payment confirmation
router.post(
  '/:id/screenshot',
  memoryImageUploader(3).single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ message: 'No file' });
      const existing = await prisma.payment.findFirst({
        where: { id: req.params.id, studentId: req.user.id },
      });
      if (!existing) return res.status(404).json({ message: 'Not found' });
      if (existing.status === 'successful') {
        return res.status(400).json({ message: 'Payment already verified' });
      }
      const dataUrl = fileToDataUrl(req.file);
      const p = await prisma.payment.update({
        where: { id: existing.id },
        data: { screenshotUrl: dataUrl },
      });
      res.json({ screenshotUrl: p.screenshotUrl });
    } catch (err) {
      next(err);
    }
  }
);

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
        message: `${req.user.name} submitted ${p.upiTxnId ? `txn ${p.upiTxnId}` : 'a payment screenshot'} for ${p.amount}`,
        type: 'system',
      },
    });
    res.json(p);
  } catch (err) {
    next(err);
  }
});

// Student cancels a pending payment (removes it instead of leaving spam)
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.payment.findFirst({
      where: { id: req.params.id, studentId: req.user.id },
    });
    if (!existing) return res.status(404).json({ message: 'Not found' });
    if (existing.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending payments can be cancelled' });
    }
    await prisma.payment.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Teacher — bulk cleanup of stale pending rows older than N hours (default 2)
router.post('/cleanup-pending', requireRole('teacher'), async (req, res, next) => {
  try {
    const hours = Number(req.query.hours || req.body?.hours || 2);
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const { count } = await prisma.payment.deleteMany({
      where: {
        academyId: req.user.academyId,
        status: 'pending',
        upiTxnId: '',
        screenshotUrl: '',
        createdAt: { lt: cutoff },
      },
    });
    res.json({ removed: count });
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

// Teacher records a CASH payment on behalf of a student.
// Immediately marks it as successful with a receipt number.
router.post('/cash', requireRole('teacher'), async (req, res, next) => {
  try {
    const { studentId, batchId, forMonth, type = 'monthly', amount: overrideAmount, notes } = req.body;
    if (!studentId || !batchId) return res.status(400).json({ message: 'studentId and batchId required' });
    if (type === 'monthly' && !forMonth) return res.status(400).json({ message: 'forMonth required for monthly cash payment' });

    const batch = await prisma.batch.findFirst({
      where: { id: batchId, academyId: req.user.academyId },
    });
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId, batchId, academyId: req.user.academyId, status: 'active' },
    });
    if (!enrollment) return res.status(404).json({ message: 'Student is not enrolled in this batch' });

    // Prevent duplicate successful monthly payment
    if (type === 'monthly') {
      const dup = await prisma.payment.findFirst({
        where: { studentId, batchId, forMonth, type: 'monthly', status: 'successful' },
      });
      if (dup) return res.status(409).json({ message: `Already paid for ${forMonth}`, payment: dup });
    }

    let amount = overrideAmount ? Number(overrideAmount) : null;
    if (!amount) {
      if (type === 'admission') amount = Number(enrollment.admissionFeeOverride ?? batch.admissionFee);
      else amount = Number(enrollment.monthlyFeeOverride ?? batch.monthlyFee);
      amount -= Number(enrollment.discount || 0);
    }
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Amount invalid' });

    const academy = await prisma.academy.findUnique({ where: { id: req.user.academyId } });
    const reference = `${academy.slug.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)}-CASH-${nano()}`;

    const payment = await prisma.payment.create({
      data: {
        academyId: req.user.academyId,
        studentId,
        batchId,
        amount,
        type,
        forMonth: type === 'monthly' ? forMonth : null,
        reference,
        status: 'successful',
        verifiedById: req.user.id,
        verifiedAt: new Date(),
        receiptNo: `RCPT-${nano()}`,
        notes: notes ? `Cash: ${notes}` : 'Cash payment',
      },
    });

    await prisma.notification.create({
      data: {
        userId: studentId,
        academyId: req.user.academyId,
        title: 'Cash payment recorded',
        message: `Your teacher recorded a cash payment of ₹${amount}${type === 'monthly' ? ` for ${forMonth}` : ''}. Receipt: ${payment.receiptNo}`,
        type: 'payment_verified',
      },
    });

    res.status(201).json(payment);
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
