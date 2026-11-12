import express from 'express';
import prisma from '../lib/prisma.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  const d = await prisma.developer.findFirst();
  res.json(d || {});
});

export default router;
