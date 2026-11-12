import express from 'express';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import prisma from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate, requireRole('teacher'));

async function queryPayments(req) {
  const { status, batchId, month, year } = req.query;
  const where = { academyId: req.user.academyId };
  if (status) where.status = status;
  if (batchId) where.batchId = batchId;
  if (month && year) where.forMonth = `${year}-${String(month).padStart(2, '0')}`;
  else if (year) where.forMonth = { startsWith: `${year}-` };
  return prisma.payment.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      student: { select: { name: true, email: true, phone: true } },
      batch: { select: { name: true } },
    },
  });
}

router.get('/payments.pdf', async (req, res, next) => {
  try {
    const rows = await queryPayments(req);
    const academy = await prisma.academy.findUnique({ where: { id: req.user.academyId } });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="payments-report.pdf"');
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);
    doc.fontSize(18).text(`${academy.name} — Payments Report`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).fillColor('#555').text(`Generated: ${new Date().toLocaleString()}`);
    if (req.query.status) doc.text(`Status: ${req.query.status}`);
    if (req.query.month && req.query.year)
      doc.text(`Period: ${req.query.year}-${String(req.query.month).padStart(2, '0')}`);
    doc.moveDown();
    doc.fillColor('#000').fontSize(10);
    const headers = ['Date', 'Student', 'Batch', 'Type', 'Amount', 'Status', 'Ref'];
    doc.font('Helvetica-Bold').text(headers.join('  |  '));
    doc.font('Helvetica');
    let total = 0;
    for (const r of rows) {
      doc.text([
        new Date(r.createdAt).toLocaleDateString(),
        r.student?.name || '',
        r.batch?.name || '',
        r.type,
        r.amount.toString(),
        r.status,
        r.reference || '',
      ].join('  |  '));
      if (r.status === 'successful') total += Number(r.amount);
    }
    doc.moveDown();
    doc.font('Helvetica-Bold').text(`Total successful: ${total}`);
    doc.end();
  } catch (err) {
    next(err);
  }
});

router.get('/payments.xlsx', async (req, res, next) => {
  try {
    const rows = await queryPayments(req);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Payments');
    ws.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Student', key: 'student', width: 22 },
      { header: 'Email', key: 'email', width: 24 },
      { header: 'Phone', key: 'phone', width: 14 },
      { header: 'Batch', key: 'batch', width: 20 },
      { header: 'Type', key: 'type', width: 10 },
      { header: 'Amount', key: 'amount', width: 10 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Reference', key: 'reference', width: 18 },
      { header: 'UPI Txn', key: 'upiTxnId', width: 22 },
      { header: 'Receipt', key: 'receiptNo', width: 16 },
    ];
    for (const r of rows) {
      ws.addRow({
        date: new Date(r.createdAt).toISOString().slice(0, 10),
        student: r.student?.name,
        email: r.student?.email,
        phone: r.student?.phone,
        batch: r.batch?.name,
        type: r.type,
        amount: Number(r.amount),
        status: r.status,
        reference: r.reference,
        upiTxnId: r.upiTxnId,
        receiptNo: r.receiptNo,
      });
    }
    ws.getRow(1).font = { bold: true };
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="payments-report.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
});

export default router;
