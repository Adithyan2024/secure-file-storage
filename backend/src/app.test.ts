import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from './app';

let mongod: MongoMemoryServer;
const app = createApp();

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

async function registerUser(email: string) {
  const res = await request(app).post('/api/auth/register').send({
    email,
    password: 'Sup3rSecret',
    name: 'Test User',
  });
  expect(res.status).toBe(201);
  return res.body.accessToken as string;
}

describe('Auth', () => {
  it('rejects registration with a weak password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'weak@example.com',
      password: 'short',
      name: 'Weak Pw',
    });
    expect(res.status).toBe(400);
  });

  it('rejects duplicate email registration', async () => {
    await registerUser('dup@example.com');
    const res = await request(app).post('/api/auth/register').send({
      email: 'dup@example.com',
      password: 'Sup3rSecret',
      name: 'Dup',
    });
    expect(res.status).toBe(409);
  });

  it('rejects login with wrong password', async () => {
    await registerUser('login@example.com');
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'WrongPass1' });
    expect(res.status).toBe(401);
  });

  it('rejects protected routes without a token', async () => {
    const res = await request(app).get('/api/files');
    expect(res.status).toBe(401);
  });
});

describe('File authorization boundaries', () => {
  it('prevents one user from accessing another user\'s private file, but allows public access', async () => {
    const tokenA = await registerUser('owner@example.com');
    const tokenB = await registerUser('other@example.com');

    // Owner uploads a file.
    const uploadRes = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('file', Buffer.from('hello world'), 'note.txt');
    expect(uploadRes.status).toBe(201);
    const fileId = uploadRes.body.file.id;

    // Another authenticated user cannot download it while private -> 404, not 403,
    // to avoid confirming the file's existence to non-owners.
    const stolenRes = await request(app)
      .get(`/api/files/${fileId}/download`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(stolenRes.status).toBe(404);

    // Owner can download it.
    const ownerDownload = await request(app)
      .get(`/api/files/${fileId}/download`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(ownerDownload.status).toBe(200);
    expect(ownerDownload.text).toBe('hello world');

    // Owner makes it public.
    const visRes = await request(app)
      .patch(`/api/files/${fileId}/visibility`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ isPublic: true });
    expect(visRes.status).toBe(200);
    const shareUrl: string = visRes.body.file.shareUrl;
    const token = shareUrl.split('/').pop() as string;

    // Anonymous request can now fetch it via the share token, no auth header.
    const publicRes = await request(app).get(`/api/public/files/${token}/download`);
    expect(publicRes.status).toBe(200);
    expect(publicRes.text).toBe('hello world');

    // Owner revokes public access.
    await request(app)
      .patch(`/api/files/${fileId}/visibility`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ isPublic: false });

    // The same token no longer works, even though it wasn't rotated.
    const revokedRes = await request(app).get(`/api/public/files/${token}/download`);
    expect(revokedRes.status).toBe(404);
  });

  it('rejects an upload with no file attached', async () => {
    const token = await registerUser('nofile@example.com');
    const res = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});
