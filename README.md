# SecureVault — Secure File Storage Service

A full-stack file storage application where authenticated users can upload,
manage, and share files, with per-file control over public/private
visibility. Built with **Node.js/Express/TypeScript/MongoDB** on the backend
and **React/TypeScript/Vite** on the frontend.

## Contents

- [Quick start](#quick-start)
- [Architecture](#architecture)
- [Authentication & authorization](#authentication--authorization)
- [File handling & security](#file-handling--security)
- [API reference](#api-reference)
- [Error handling](#error-handling)
- [Testing](#testing)
- [Trade-offs & what I'd do differently at scale](#trade-offs--what-id-do-differently-at-scale)
- [Possible future improvements](#possible-future-improvements)

---

## Quick start

### Prerequisites
- Node.js 20+
- A running MongoDB instance (local install, Docker, or [MongoDB Atlas](https://www.mongodb.com/atlas))

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env: set MONGO_URI, and replace JWT_ACCESS_SECRET / JWT_REFRESH_SECRET
# with long random strings, e.g. `openssl rand -hex 32`

npm install
npm run dev        # starts on http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env   # defaults already point at localhost:4000

npm install
npm run dev        # starts on http://localhost:5173
```

Open `http://localhost:5173`, register an account, and start uploading.

### Running in production

```bash
# backend
npm run build && npm start

# frontend
npm run build       # outputs static assets to frontend/dist, serve with any static host/CDN
```

In production, set `NODE_ENV=production`, use HTTPS (required for secure
cookies to actually be sent), and set `CLIENT_ORIGIN` / `PUBLIC_BASE_URL` to
your real domains.

---

## Architecture

```
backend/
  src/
    config/        env loading + validation, MongoDB connection
    models/        Mongoose schemas (User, File)
    services/      business logic (auth token issuing, file CRUD) - kept
                    separate from controllers so it's independently testable
    controllers/    thin HTTP layer: parse request, call service, shape response
    middleware/     auth guard, validation, rate limiting, upload (multer),
                    centralized error handler
    routes/         route wiring + per-route validation rules
    utils/          ApiError, asyncHandler, logger, range-request file streaming

frontend/
  src/
    api/            axios client (token refresh interceptor), typed request functions
    context/        AuthContext (session state + silent refresh), ToastContext
    components/     FileUpload (dropzone + progress), FileCard, ProtectedRoute, Topbar
    pages/          Login, Register, Dashboard, SharedFile (public view)
```

**Why this layering?** Controllers stay thin and easy to scan; all the
"what actually happens" logic lives in `services/`, which don't know
anything about Express (`req`/`res`) and could be reused by, say, a CLI or
a background job without modification.

### Data model

**User**
```
email (unique, indexed), passwordHash (bcrypt, 12 rounds, never returned in JSON),
name, refreshTokenVersion (int, used to invalidate all sessions at once)
```

**File**
```
owner (ObjectId → User, indexed), originalName, storageKey (random, unrelated
to originalName), mimeType, size, isPublic (indexed), shareToken (random,
unique, indexed), downloadCount, timestamps
```

Two design decisions worth calling out:
- **`storageKey` vs `originalName`**: the on-disk filename is always a random
  generated string, never derived from user input. This closes off path
  traversal and overwrite attacks via crafted filenames (`../../etc/passwd`,
  null bytes, etc.) entirely, rather than trying to sanitize them.
- **`shareToken`**: a separate random token (not the Mongo `_id`) is used in
  public URLs, so a determined guesser can't enumerate `_id`s sequentially.
  It's checked against `isPublic` on *every* access, not just at generation
  time — see the [authorization](#authentication--authorization) section.

---

## Authentication & authorization

**Tokens.** Short-lived JWT **access token** (15 min default) is returned in
the response body and kept in memory on the frontend (a JS variable, never
`localStorage`/`sessionStorage`) to limit what an XSS bug could exfiltrate
persistently. A longer-lived **refresh token** (7 days) is set as an
`httpOnly`, `Secure` (in prod), `SameSite=Strict` cookie scoped to
`/api/auth`, so client-side JS can never read it, and it's never sent to
unrelated routes.

**Silent session restore.** On page load, the frontend has no access token
in memory (a refresh wipes JS state) but the refresh cookie may still be
valid, so it immediately calls `/api/auth/refresh` before deciding the user
is logged out. This is what makes "stay logged in across a page reload" work
without ever touching `localStorage`.

**Session invalidation.** Each user has a `refreshTokenVersion` counter.
Refresh tokens embed the version they were issued with; `/auth/refresh`
rejects a token whose version doesn't match the user's current version. This
gives a clean "log out everywhere" primitive (bump the counter) without
needing a token blocklist/Redis, at the cost of one DB read per refresh
(refreshes are infrequent — every ~15 min per active user — so this is
cheap).

**Authorization model for files:**
- Every file-mutating/reading route (list, upload, download-as-owner,
  change visibility, delete) requires `requireAuth`, then the service layer
  re-checks `owner === req.user.id` on the specific document — never just
  "is this user logged in."
- A non-owner requesting another user's private file gets **404, not
  403** — this is deliberate. A 403 confirms the file exists and belongs to
  someone else; 404 doesn't leak that information.
- Public files are served through a **separate, unauthenticated route**
  (`/api/public/files/:token`) that looks up by `shareToken` and re-checks
  `isPublic` on every single request. If an owner flips a file back to
  private, the previously-shared link stops working immediately — even
  though the token itself wasn't rotated — because the check isn't
  "does a valid token exist" but "is this specific file public right now."

**Passwords:** hashed with bcrypt (12 rounds), minimum 8 characters + at
least one digit enforced via `express-validator`, never returned in any API
response (`toJSON` transform strips the hash even if a route forgets to
`.select('-passwordHash')`).

---

## File handling & security

- **Streaming uploads**: Multer's `diskStorage` engine streams the request
  body directly to disk — the whole file is never buffered in memory, which
  is what makes 100MB+ uploads viable without exhausting server RAM under
  concurrent load.
- **Streaming downloads with Range support**: a custom `streamFile` helper
  honors `Range` request headers (HTTP 206 Partial Content), so large
  downloads are resumable and video/audio can be scrubbed without
  downloading the whole file first.
- **Upload validation**: file size capped server-side (`multer` `limits`,
  default 100MB, configurable via `MAX_FILE_SIZE_MB`) — the frontend also
  checks this client-side for instant feedback, but the server is the
  actual enforcement point. A small extension denylist blocks obviously
  dangerous types (`.exe`, `.sh`, `.dll`, etc.) without maintaining a
  restrictive allowlist that would reject legitimate document types.
- **Filename handling**: see `storageKey` above — user-supplied filenames
  are stored as metadata only and never touch the filesystem path.
- **Generous server timeouts**: Node's default socket timeout can kill a
  large upload over a slow connection; `server.requestTimeout` is raised to
  10 minutes in `server.ts`.
- **Upload progress**: the frontend uses axios's `onUploadProgress` (backed
  by `XMLHttpRequest`, since `fetch` doesn't expose upload progress) to
  drive a real progress bar per file.
- **NoSQL injection**: `express-mongo-sanitize` strips any request keys
  starting with `$` or containing `.` before they reach Mongoose queries.
- **Transport/headers**: `helmet` sets standard security headers; CORS is
  locked to a single configured origin with `credentials: true` (required
  for the refresh cookie).
- **Rate limiting**: auth endpoints (register/login/refresh) are limited
  separately and more aggressively than general API routes, since they're
  the most common brute-force target.

---

## API reference

All authenticated routes expect `Authorization: Bearer <accessToken>`.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | – | Create account, returns user + access token, sets refresh cookie |
| POST | `/api/auth/login` | – | Returns user + access token, sets refresh cookie |
| POST | `/api/auth/refresh` | refresh cookie | Issues a new access token |
| POST | `/api/auth/logout` | – | Clears the refresh cookie |
| GET | `/api/auth/me` | ✓ | Current user profile |
| POST | `/api/files/upload` | ✓ | `multipart/form-data`, field name `file` |
| GET | `/api/files` | ✓ | List the caller's own files |
| GET | `/api/files/:id/download` | ✓ (owner) | Download regardless of visibility |
| PATCH | `/api/files/:id/visibility` | ✓ (owner) | Body: `{ "isPublic": boolean }` |
| DELETE | `/api/files/:id` | ✓ (owner) | Deletes DB record + disk blob |
| GET | `/api/public/files/:token` | – | Public metadata (name, size, type) |
| GET | `/api/public/files/:token/download` | – | Public download, only if `isPublic` |

All error responses share a consistent shape:
```json
{ "error": { "message": "...", "details": [ ... ] } }
```

---

## Error handling

A single `errorHandler` middleware is the only place that writes error
responses. Every thrown error funnels through it via `asyncHandler` (which
forwards rejected promises to `next()` so nothing needs manual try/catch in
controllers). It distinguishes:

- **`ApiError`** (thrown deliberately, e.g. "file not found") → returned
  as-is with its intended status code and message.
- **Multer errors** (e.g. file-too-large) → mapped to 413/400.
- **Mongoose `ValidationError`** → 400 with field details.
- **Mongo duplicate-key errors** (`code 11000`, e.g. registering an email
  twice under a race condition) → 409.
- **Anything else (unexpected/unknown)** → logged with full detail
  server-side, but the client only ever sees a generic 500 — internal error
  messages and stack traces are never leaked in production.

`express-validator` handles input-shape validation (email format, password
strength, Mongo ObjectId format in URL params, share-token format) before a
request ever reaches a controller.

---

## Testing

`backend/src/app.test.ts` contains integration tests covering:
- Registration validation (weak password, duplicate email)
- Login failure on wrong password
- Protected routes rejecting unauthenticated requests
- **The core authorization boundary**: user A uploads a private file, user B
  cannot download it (404), the owner can, toggling it public makes it
  reachable via the unauthenticated share link, and toggling it back private
  immediately revokes that same link.

Run with:
```bash
cd backend
npm test
```

These use `mongodb-memory-server`, which downloads a real `mongod` binary on
first run — this requires normal internet access. (Note: I built this
project inside a sandboxed environment with a restricted network allowlist
that couldn't reach `fastdl.mongodb.org`, so I verified correctness via a
clean TypeScript compile plus careful manual review of each authorization
path instead of a live test run in that sandbox. The tests are written
against the real API surface and should run as-is with normal internet
access or a local MongoDB instance.)

---

## Trade-offs & what I'd do differently at scale

I optimized for a clear, defensible, secure implementation within the scope
of this assignment. Some explicit trade-offs:

- **Local disk storage, not S3.** Simplest to run and review locally with
  zero cloud setup. At scale this doesn't work across multiple server
  instances (no shared filesystem) and doesn't get you a CDN. Swapping the
  storage layer for S3 (or any S3-compatible store) is a contained change —
  it only touches `middleware/upload.ts` and `streamFile.ts`; the rest of
  the app talks to `storageKey`/`absoluteStoragePath` as an abstraction, not
  raw file paths, so this is the intended seam for that migration.
- **Access token in memory, not a fully stateless model.** Requires one
  silent-refresh round trip on every fresh page load. The alternative
  (skip the refresh dance, keep the user logged out until they act) is
  simpler but worse UX; I judged the trade-off worth it for a "file
  dashboard" product where people expect to stay logged in.
- **No virus/malware scanning.** Out of scope for the assignment's time box,
  but this is the most important thing I'd add before treating this as
  production-ready for arbitrary user uploads (e.g., ClamAV in an async
  pipeline, quarantining files until scanned).
- **Synchronous upload handling.** A 100MB+ upload ties up a request/worker
  for the duration of the transfer. Fine at the traffic level this
  assignment implies; at real scale you'd want direct-to-storage uploads
  (e.g., S3 pre-signed URLs) so the app server is only ever handling
  metadata, not file bytes.

## Possible future improvements

- Resumable/chunked uploads (tus protocol) for very large files on flaky
  connections
- S3 (or compatible) storage + CDN for public file delivery
- Background virus scanning before a file becomes downloadable
- Per-file or per-share expiring links, and optional password-protected
  share links
- Admin/audit log of visibility changes and downloads
- Storage quotas per user
