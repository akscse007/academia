import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

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

export function fileUrl(req, file) {
  const folder = path.basename(path.dirname(file.path));
  return `${req.protocol}://${req.get('host')}/uploads/${folder}/${file.filename}`;
}

export function fileLocalPath(fileUrlStr) {
  const rel = fileUrlStr.split('/uploads/')[1];
  if (!rel) return null;
  return path.resolve(process.cwd(), 'uploads', rel);
}
