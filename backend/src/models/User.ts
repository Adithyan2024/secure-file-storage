import bcrypt from 'bcryptjs';
import { Document, model, Schema, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  refreshTokenVersion: number; // incremented to invalidate all outstanding refresh tokens
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
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    refreshTokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
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
