import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// In-memory upload for small images we store as base64 data URLs in the DB.
// Render's filesystem is ephemeral, so disk files vanish on redeploy. For
// logos / QR / avatar images (small) we persist them directly in Postgres.
export function memoryImageUploader(maxMB = 2) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxMB * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image uploads allowed'));
      cb(null, true);
    },
  });
}

export function fileToDataUrl(file) {
  if (!file) return '';
  return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
}

function diskStorage(folder) {
  const dir = path.join(uploadsDir, folder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const base = path.basename(file.originalname, ext).replace(/[^a-z0-9-_]/gi, '_');
      cb(null, `${Date.now()}-${base}${ext}`);
    },
  });
}

export function uploader(folder, { imagesOnly = false, max = 25 } = {}) {
  const storage = diskStorage(folder);
  return multer({
    storage,
    limits: { fileSize: max * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (imagesOnly && !file.mimetype.startsWith('image/')) {
        return cb(new Error('Only images are allowed'));
      }
      cb(null, true);
    },
  });
}

export function fileUrl(_req, file) {
  // Return a RELATIVE URL so the browser resolves it against whatever origin
  // served the page. This keeps uploads working if the hosting domain
  // changes (e.g. moved from academia-aks → academia-ufst).
  const folder = path.basename(path.dirname(file.path));
  return `/uploads/${folder}/${file.filename}`;
}

export function fileLocalPath(fileUrlStr) {
  if (!fileUrlStr) return null;
  const parts = fileUrlStr.split('/uploads/');
  const rel = parts[parts.length - 1];
  if (!rel) return null;
  return path.resolve(process.cwd(), 'uploads', rel);
}
