import { Document, model, Schema, Types } from 'mongoose';

export interface IFile extends Document {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  folder: Types.ObjectId | null;
  originalName: string; // user-facing filename, sanitized but not used as a path
  storageKey: string; // actual filename on disk (random, never trusts client input)
  mimeType: string;
  size: number; // bytes
  isPublic: boolean;
  shareToken: string; // random token used in public share URLs
  downloadCount: number;
  trashedAt: Date | null; // soft-delete timestamp; null = active
  createdAt: Date;
  updatedAt: Date;
}

const fileSchema = new Schema<IFile>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    folder: { type: Schema.Types.ObjectId, ref: 'Folder', default: null, index: true },
    originalName: { type: String, required: true, maxlength: 255 },
    storageKey: { type: String, required: true, unique: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 0 },
    isPublic: { type: Boolean, default: false, index: true },
    shareToken: { type: String, required: true, unique: true, index: true },
    downloadCount: { type: Number, default: 0 },
    trashedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

// Common dashboard query: a user's files, newest first.
fileSchema.index({ owner: 1, createdAt: -1 });
fileSchema.index({ owner: 1, trashedAt: 1, isPublic: 1 });

export const FileModel = model<IFile>('File', fileSchema);

