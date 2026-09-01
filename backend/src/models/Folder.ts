import { Document, model, Schema, Types } from 'mongoose';

export interface IFolder extends Document {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  name: string;
  parent: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const folderSchema = new Schema<IFolder>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    parent: { type: Schema.Types.ObjectId, ref: 'Folder', default: null, index: true },
  },
  { timestamps: true }
);

folderSchema.index({ owner: 1, parent: 1 });

export const Folder = model<IFolder>('Folder', folderSchema);
