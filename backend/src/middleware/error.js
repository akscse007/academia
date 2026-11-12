export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err, req, res, _next) {
  console.error(err);
  // Prisma known errors
  if (err.code === 'P2002') {
    return res.status(409).json({ message: 'Duplicate value', fields: err.meta?.target });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ message: 'Record not found' });
  }
  if (err.code === 'P2003') {
    return res.status(400).json({ message: 'Related record missing', fields: err.meta });
  }
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Server error' });
}
