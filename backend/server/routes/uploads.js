// File uploads (KYC documents, etc.).
//
// Storage strategy:
//   - No S3 configured (default/dev): files are saved to disk under backend/uploads/
//     and served statically by the API; the upload endpoint returns a public URL.
//   - S3 configured: the storageProvider presign path takes over (see providers/
//     storageProvider.js) — wire it in when AWS creds are set.
//
// Returns an absolute URL the browser can load directly. Behind a proxy set
// PUBLIC_BACKEND_URL (e.g. https://api.homehero.com) so the URL is reachable.
import { Router } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

export const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf' };

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    // Group by purpose (kyc) and user so files are easy to trace/clean up.
    const folder = (req.query.folder || 'kyc').toString().replace(/[^a-z0-9/_-]/gi, '');
    const dir = path.join(UPLOAD_ROOT, folder, req.user.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${EXT[file.mimetype] || ''}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) return cb(null, true);
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only JPG, PNG, WEBP or PDF files are allowed.'));
  },
});

// POST /api/v1/uploads  (field name: "file")
router.post('/', authMiddleware, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'File is too large (max 8MB).'
        : err.field || err.message || 'Upload failed.';
      return res.status(400).json({ error: 'UPLOAD_FAILED', message });
    }
    if (!req.file) return res.status(400).json({ error: 'NO_FILE', message: 'No file was provided.' });

    const rel = path.relative(UPLOAD_ROOT, req.file.path).split(path.sep).join('/');
    const base = process.env.PUBLIC_BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    res.status(201).json({ file_url: `${base}/uploads/${rel}`, key: rel });
  });
});

export default router;
