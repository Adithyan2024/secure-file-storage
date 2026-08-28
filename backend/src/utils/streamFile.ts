import fs from 'fs';
import { Request, Response } from 'express';
import { IFile } from '../models/File';
import { absoluteStoragePath } from '../services/file.service';

/**
 * Streams a file to the response, honoring Range headers so large files
 * (100MB+ per the assignment spec) support resumable/partial downloads and
 * in-browser media playback instead of forcing a full buffer into memory.
 */
export function streamFile(req: Request, res: Response, file: IFile, asAttachment: boolean): void {
  const filePath = absoluteStoragePath(file.storageKey);

  let stat: fs.Stats;
  try {
    stat = fs.statSync(filePath);
  } catch {
    res.status(404).json({ error: { message: 'File is missing from storage' } });
    return;
  }

  const range = req.headers.range;
  const disposition = asAttachment ? 'attachment' : 'inline';
  const safeName = encodeURIComponent(file.originalName);

  res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `${disposition}; filename*=UTF-8''${safeName}`);
  res.setHeader('Accept-Ranges', 'bytes');

  if (!range) {
    res.setHeader('Content-Length', stat.size);
    res.status(200);
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match) {
    res.status(416).setHeader('Content-Range', `bytes */${stat.size}`).end();
    return;
  }

  const start = match[1] ? parseInt(match[1], 10) : 0;
  const end = match[2] ? parseInt(match[2], 10) : stat.size - 1;

  if (start >= stat.size || end >= stat.size || start > end) {
    res.status(416).setHeader('Content-Range', `bytes */${stat.size}`).end();
    return;
  }

  res.status(206);
  res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
  res.setHeader('Content-Length', end - start + 1);
  fs.createReadStream(filePath, { start, end }).pipe(res);
}
