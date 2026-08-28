import fs from 'fs';
import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { nanoid } from 'nanoid';
import path from 'path';
import { env } from '../config/env';

// Ensure the upload directory exists at startup.
if (!fs.existsSync(env.uploadDir)) {
  fs.mkdirSync(env.uploadDir, { recursive: true });
}

// A small denylist of executable/script extensions. We don't allowlist
// mimetypes broadly because legitimate "documents" span hundreds of types;
// instead we block the categories most likely to be used for RCE if the
// file is ever served back and executed by a misconfigured client.
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.msi', '.dll', '.com', '.scr', '.jar', '.app',
]);

function fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (BLOCKED_EXTENSIONS.has(ext)) {
    cb(new Error(`File type "${ext}" is not allowed`));
    return;
  }
  cb(null, true);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, env.uploadDir);
  },
  filename: (_req, file, cb) => {
    // Never trust the client-supplied filename for the actual disk path -
    // that's how you get path traversal / overwrite attacks. We generate
    // a random storage key and keep the original name only as metadata.
    const ext = path.extname(file.originalname).slice(0, 20); // cap weird long "extensions"
    cb(null, `${nanoid(24)}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: env.maxFileSizeMb * 1024 * 1024,
    files: 1,
  },
  fileFilter,
});
