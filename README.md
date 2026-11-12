# EduSuite — Multi-tenant Student Management SaaS

A complete MERN+Prisma SaaS platform where a single developer hosts the software and multiple teachers / academies / coaching centres run their own branded, isolated workspaces.

## Highlights

- **Three roles:** platform owner, teacher (academy owner), student
- **Per-academy branding** (logo, primary colour, welcome message, UPI ID, QR code)
- **Academy-scoped URLs:** `yourplatform.com/a/<slug>/login`, `.../register`
- **Strict multi-tenant isolation** — every record is tied to an `academyId` and every API checks the user's scope
- **Student approval workflow,** batch management, enrollments (no capacity limit by default)
- **Teacher-created student accounts** with auto-generated passwords + password reset flow
- **Share-with-students links** (register, login) with WhatsApp share, copy button and QR code
- **Secure PDF viewer** (watermark, no-download/no-print, right-click disabled, per-note recording permission)
- **UPI payment intent** with per-academy UPI ID + QR; manual verification; status machine
- **Financial dashboard** (monthly revenue, batch-wise revenue, status distribution), PDF & Excel exports
- **Announcements** with batch/all-students targeting + per-user in-app notifications
- **About the Developer page** (public) + developer-profile editor in the platform-owner dashboard

## Tech stack

- **Backend:** Node.js (ESM), Express, **Prisma ORM + PostgreSQL (Neon)**, JWT, bcryptjs, multer, PDFKit, ExcelJS, nanoid
- **Frontend:** React 18 + Vite, Tailwind CSS, Framer Motion, Recharts, pdfjs-dist, react-router, axios, lucide-react, react-hot-toast

## Project layout

```
student-saas/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma     # all models + enums
│   │   └── seed.js           # sample data loader
│   ├── src/
│   │   ├── lib/prisma.js     # Prisma client singleton
│   │   ├── middleware/       # auth, error, upload
│   │   ├── routes/           # auth, academy, students, batches, notes, payments…
│   │   ├── utils/            # jwt, password, slug, bootstrap
│   │   └── server.js         # Express entry
│   ├── uploads/              # local file storage (PDFs, logos, QR)
│   └── .env                  # DATABASE_URL, DIRECT_URL, JWT_SECRET, …
├── frontend/
│   ├── src/
│   │   ├── pages/            # Landing, Login, platform/, teacher/, student/
│   │   ├── layouts/          # Platform, Teacher, Student
│   │   ├── components/       # Sidebar, Topbar, ShareLinks, StatCard, …
│   │   ├── context/          # AuthContext, BrandingContext
│   │   └── api/client.js     # axios with JWT interceptor
│   └── vite.config.js        # /api + /uploads proxy → :5000
└── README.md
```

---

## Local setup (step by step)

### 0. Prerequisites

| Tool    | Version      | Verify                     |
|---------|--------------|----------------------------|
| Node.js | 18 or newer  | `node --version`           |
| npm     | bundled      | `npm --version`            |
| Git     | any          | `git --version`            |

**Database:** a PostgreSQL connection. The easiest is a free **Neon** project (https://neon.tech) — no install required. Alternatively: local PostgreSQL, Supabase, Railway, or Docker (`docker run -e POSTGRES_PASSWORD=pw -p 5432:5432 postgres:16`).

### 1. Clone / get the code

```bash
cd D:/Codes/Projects          # or wherever
# (already cloned/created at student-saas/)
cd student-saas
```

### 2. Backend — configure environment

```bash
cd backend
cp .env.example .env          # Windows cmd: copy .env.example .env
```

Open `backend/.env` and fill in:

```env
NODE_ENV=development
PORT=5000

# Neon gives you two connection strings — use the pooled one for DATABASE_URL
# and the direct one for DIRECT_URL (Prisma uses DIRECT_URL for migrations).
DATABASE_URL="postgresql://<user>:<password>@<host>-pooler.<region>.aws.neon.tech/<db>?sslmode=require&channel_binding=require"
DIRECT_URL="postgresql://<user>:<password>@<host>.<region>.aws.neon.tech/<db>?sslmode=require&channel_binding=require"

JWT_SECRET=change_me_to_a_long_random_string
JWT_EXPIRES_IN=7d

# Comma-separated list of frontend origins that may call the API (CORS)
CLIENT_ORIGIN=http://localhost:5173

# PUBLIC URL where the FRONTEND is served. Used by the backend to build
# the share links it returns (e.g. student login URL in the "create student"
# response). In DEV, leave blank and the server falls back to the request's
# origin. IN PRODUCTION, set this to your deployed frontend URL:
#   APP_URL=https://edu.yourdomain.com
APP_URL=

PLATFORM_OWNER_EMAIL=owner@yourplatform.com
PLATFORM_OWNER_PASSWORD=Owner@12345
PLATFORM_OWNER_NAME=Platform Owner

# Set true to auto-seed a sample academy on first boot
AUTO_SEED=true
```

### 3. Backend — install and push schema

```bash
# still inside backend/
npm install --legacy-peer-deps

# Create the tables on Neon and generate the Prisma client
npx prisma db push
npx prisma generate
```

> **Why `--legacy-peer-deps`?** `multer-storage-cloudinary@4` expects `cloudinary@1` but we use `cloudinary@2`. The flag tells npm to accept the mismatch; cloud uploads are optional and off by default.

### 4. Backend — start the API

```bash
npm run dev          # nodemon-style file-watcher via `node --watch`
# ...
# Prisma connected to Postgres
# Platform owner created: owner@yourplatform.com
# Developer profile seeded
# Sample academy seeded (slug: bright-future-academy)
# API listening on :5000
```

Health check: open http://localhost:5000/api/health → `{ "ok": true, "ts": ... }`

### 5. Frontend — install and run

```bash
cd ../frontend
npm install
npm run dev          # Vite on http://localhost:5173
```

Vite proxies `/api/*` and `/uploads/*` to `http://localhost:5000`, so the UI "just works" with no CORS fuss.

### 6. Sign in

After seeding you have three ready accounts:

| Role           | URL                                                  | Email                         | Password     |
|----------------|------------------------------------------------------|-------------------------------|--------------|
| Platform owner | http://localhost:5173/login → **Platform owner**     | `owner@yourplatform.com`      | `Owner@12345`|
| Teacher        | http://localhost:5173/login → **Teacher**            | `teacher@brightfuture.test`   | `Teacher@123`|
| Student        | http://localhost:5173/a/bright-future-academy/login  | `student@brightfuture.test`   | `Student@123`|

**Change these credentials** (especially the platform owner) before deploying anywhere.

### 7. Useful scripts

From `backend/`:

```bash
npm run dev          # start with file watcher
npm start            # plain production start
npm run seed         # re-run the sample data loader (idempotent)
npm run migrate      # create and apply a migration (dev)
npm run generate     # regenerate the Prisma client
npm run studio       # open Prisma Studio at http://localhost:5555
```

From `frontend/`:

```bash
npm run dev          # Vite dev server (:5173)
npm run build        # production bundle → frontend/dist
npm run preview      # serve the bundle locally
```

### 8. One-shot start (optional)

The top-level `student-saas/package.json` has convenience scripts:

```bash
cd student-saas
npm run install:all       # installs both sides
npm run dev:api           # starts backend (:5000)
npm run dev:web           # starts frontend (:5173)
```

Run `dev:api` and `dev:web` in separate terminals.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Cannot find package 'dotenv'` or similar | Re-install with `npm install --legacy-peer-deps` inside `backend/`. |
| Prisma `P1001` connection error | Check `DATABASE_URL` is pasted exactly from Neon, including `?sslmode=require`. Try `npx prisma db pull` to confirm reachability. |
| Prisma `P2025` "Record to update not found" | Your Prisma client is stale. Stop the server, run `npx prisma generate`, start again. |
| `EPERM … query_engine-windows.dll.node` on `prisma generate` | The backend is running and locks the engine file. Stop the server first, then regenerate. |
| Port 5000 or 5173 already in use | Change `PORT` in `.env` (backend) or `server.port` in `vite.config.js` (frontend). Update the Vite proxy target to match. |
| CORS errors from the frontend | Make sure `CLIENT_ORIGIN` in `.env` includes `http://localhost:5173`. Multiple origins can be comma-separated. |
| Uploaded PDFs 404 on reload | PDFs are stored under `backend/uploads/` which is in `.gitignore` — files don't persist across clean clones. For production use Cloudinary or S3. |
| Student login fails with "Invalid credentials" | Login expects the correct `academySlug` — use `/a/<slug>/login`, not `/login` (which is for owners and teachers only). |

---

## How multi-tenancy works

- Every tenant-owned table (`User`, `Batch`, `Enrollment`, `Note`, `Payment`, `Announcement`, `Notification`) has an indexed `academyId` FK.
- `middleware/auth.js` resolves `req.user` and `req.academy` from the JWT and refuses the request if the academy is suspended / deactivated (for teachers / students).
- Every route scopes queries by `req.user.academyId` — there is no code path that reads another academy's data.
- Students never touch `status`, `verifiedAt`, `receiptNo`, batch enrollment — those are server-written on behalf of teachers/platform-owner only.
- Academy-branded routes live under `/a/:slug/...` and fetch branding via the public `/api/academy/public/:slug` endpoint.

## Share with students

Every teacher sees a **"Share with students"** card on their dashboard **and** a dedicated sidebar page:

- Registration link: `yourplatform.com/a/<slug>/register` — students sign up themselves (teacher approves).
- Login link: `yourplatform.com/a/<slug>/login` — for students whose accounts were created by the teacher.
- Buttons for Copy, WhatsApp share, QR code.

Teachers can also create accounts directly (Students → **Create student**) — the system auto-generates a secure password and shows a credentials modal with a *Copy all as message* button for one-tap sharing. **Reset** regenerates a password for any student later.

## Secure PDF viewer

- PDFs are streamed through an authenticated endpoint (`GET /api/notes/:id/stream`) that validates enrollment and publication.
- The viewer disables right-click, dragstart, text selection, and common Ctrl+S / Ctrl+P / Ctrl+U / Ctrl+C shortcuts.
- Every page is rendered to `<canvas>` with a tiled watermark (student name + academy name).
- Each note has an independent `recordingPermission` flag.
- **Honest limitation:** no website can reliably prevent OS screenshots or external screen recording tools. This is a deterrent, not a guarantee.

## UPI payments

- Each academy configures its own UPI ID and QR code in **Settings → UPI & fees**.
- Student presses **Pay now** → backend calculates the amount, creates `Payment { status: 'pending' }`, returns a `upi://pay?pa=...&pn=...&am=...&tn=...&tr=<unique-ref>` intent.
- Student enters the UPI transaction ID → status becomes `awaiting_verification`.
- Teacher verifies/rejects from **Payments** → `successful` / `rejected`.
- Ready for Razorpay/Stripe — wire a webhook into the `Payment` status field.

## Reports

- `GET /api/reports/payments.pdf?status=&month=&year=&batchId=` → PDF (PDFKit)
- `GET /api/reports/payments.xlsx?...` → XLSX (ExcelJS)

Downloaded straight from the UI with the user's JWT.

## Deployment notes

**Backend**
- Set `NODE_ENV=production`, a strong `JWT_SECRET`, real `DATABASE_URL` + `DIRECT_URL`, `CLIENT_ORIGIN=https://edu.yourdomain.com`, and `APP_URL=https://edu.yourdomain.com`.
- Hosts: Render, Railway, Fly.io, Vercel (serverless), or any VPS with Node 18+.
- For file storage in production, switch from local disk to Cloudinary/S3 (`middleware/upload.js`).

### Share-link URLs in production

The **Share with students** page and the dashboard card build URLs from `window.location.origin` on the frontend — so when a teacher opens the deployed app at `https://edu.yourdomain.com`, the share links are automatically `https://edu.yourdomain.com/a/<slug>/register`. No code change needed.

The **backend-returned** URLs (login URL inside the "create student" and "reset password" responses) use `APP_URL` if set, else the request's `Origin` header, else the request host. **Set `APP_URL` in production** so the URLs are always correct even for API calls that go through a different host (e.g. `api.yourdomain.com` → should still link to `edu.yourdomain.com`).

**Frontend**
- `npm run build` → `frontend/dist`.
- Host on any static host (Netlify, Vercel, S3+CloudFront, nginx).
- Point `/api` at your backend origin — either via the host's rewrite rules or by swapping `baseURL: '/api'` in `src/api/client.js` to a full URL.

**Database**
- A single Neon project (or any Postgres) comfortably hosts hundreds of academies; all key columns are indexed on `academyId`.

## License

MIT — do whatever you need.
