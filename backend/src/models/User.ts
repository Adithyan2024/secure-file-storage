import bcrypt from 'bcryptjs';
import { Document, model, Schema, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash?: string;
  name: string;
  authProvider: 'local' | 'google';
  googleId?: string;
  refreshTokenVersion: number; // incremented to invalidate all outstanding refresh tokens
  defaultVisibility: 'private' | 'public'; // applied to newly uploaded files
  storageQuotaBytes: number; // for the UI usage bar; not strictly enforced server-side
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
    },
    passwordHash: {
      type: String,
      select: false,
      // Only required for accounts created with email/password. Google
      // sign-in accounts have no password at all.
      required: function (this: IUser) {
        return this.authProvider === 'local';
      },
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    googleId: { type: String, unique: true, sparse: true, index: true },
    refreshTokenVersion: { type: Number, default: 0 },
    defaultVisibility: { type: String, enum: ['private', 'public'], default: 'private' },
    storageQuotaBytes: { type: Number, default: 5 * 1024 * 1024 * 1024 }, // 5GB display quota
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function (this: IUser, candidate: string): Promise<boolean> {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.passwordHash);
};

// Never leak the hash even if someone forgets `.select(false)` semantics elsewhere.
userSchema.set('toJSON', {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform: (_doc, ret: any) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

export const User = model<IUser>('User', userSchema);
