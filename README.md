# EduSuite — Multi-tenant Student Management SaaS

A complete MERN stack SaaS platform where a single developer hosts the software and multiple teachers / academies / coaching centres run their own branded, isolated workspaces.

**Highlights**

- Three roles: platform owner, teacher (academy owner), student
- Per-academy branding (logo, primary colour, welcome message, UPI ID, QR code)
- Academy-scoped URLs: `yourplatform.com/a/<slug>/login`, `.../register`
- Strict multi-tenant isolation — every record is tied to an `academyId` and every API checks the user's scope
- Student approval workflow, batch management, enrollments
- Secure PDF viewer (watermark, no-download/no-print, right-click disabled, per-note recording permission)
- UPI payment intent (`upi://pay?...`) with per-academy UPI ID + QR; manual verification; status machine
- Financial dashboard (monthly revenue, batch-wise revenue, status distribution), PDF & Excel exports
- Announcements with batch/all-students targeting + per-user in-app notifications
- About the Developer page (public) + developer-profile editor in the platform-owner dashboard

**Tech stack**

- **Backend:** Node.js, Express, MongoDB (Mongoose), JWT, bcrypt, multer (local/Cloudinary), PDFKit, ExcelJS
- **Frontend:** React 18 + Vite, Tailwind CSS, Framer Motion, Recharts, pdfjs-dist, react-router, axios, lucide-react

## Project layout

```
student-saas/
├── backend/          Express API + Mongoose models
└── frontend/         Vite + React + Tailwind client
```

## Prerequisites

- Node.js 18+
- MongoDB running locally (or a connection string to any MongoDB instance, e.g. Atlas)

## Setup

### 1. Backend

```bash
cd backend
cp .env.example .env    # edit values (Mongo URI, JWT secret, platform-owner credentials)
npm install
npm run seed            # creates platform owner + a sample academy/teacher/student
npm run dev             # http://localhost:5000
```

### 2. Frontend

```bash
cd ../frontend
npm install
npm run dev             # http://localhost:5173
```

The Vite dev server proxies `/api` and `/uploads` to `http://localhost:5000`.

## Sample accounts after seeding

| Role            | URL                                   | Email                           | Password     |
|-----------------|---------------------------------------|---------------------------------|--------------|
| Platform owner  | `/login` → "Platform owner"           | `owner@yourplatform.com`        | `Owner@12345`|
| Teacher         | `/login` → "Teacher"                  | `teacher@brightfuture.test`     | `Teacher@123`|
| Student         | `/a/bright-future-academy/login`      | `student@brightfuture.test`     | `Student@123`|

(Change the owner credentials in `backend/.env` before deploying.)

## How multi-tenancy works

- Every tenant-owned document (`User`, `Batch`, `Enrollment`, `Note`, `Payment`, `Announcement`, `Notification`) has an indexed `academyId`.
- `middleware/auth.js` resolves `req.user` and `req.academy` and refuses the request if the academy is not active (for teachers / students).
- Each route scopes every query by `req.user.academyId` — there is no code path that reads another academy's data.
- Students never touch `status`, `verifiedAt`, `receiptNo`, `batchIds` — these are only writable by teachers/platform-owner.
- Academy-branded routes live under `/a/:slug/...` and fetch branding via the public `/api/academy/public/:slug` endpoint.

## Secure PDF viewer

- Files are streamed through an authenticated endpoint (`GET /api/notes/:id/stream`) that validates enrollment and publication. Direct `/uploads/...` URLs are blocked to anyone without the stream URL since the client always goes through auth.
- The viewer disables right-click, dragstart, text selection, and common Ctrl+S / Ctrl+P / Ctrl+U / Ctrl+C shortcuts.
- Every page is rendered to `<canvas>` with a tiled watermark (student name + academy name) layered on top.
- Each note has an independent `recordingPermission` flag.

> **Honest limitation:** no website can reliably prevent OS-level screenshots, screen-recording tools, or an external camera. The viewer is a strong *deterrent*, not a guarantee.

## UPI payments

- Each academy configures its own UPI ID and QR code in **Settings → UPI & fees** (`PUT /api/academy/me`, `POST /api/academy/me/qr`).
- Students press **Pay now** → backend calculates the due amount, creates a `Payment { status: 'pending' }` and returns a `upi://pay?pa=...&pn=...&am=...&tn=...&tr=<unique-ref>` intent.
- Any Android UPI app (GPay, PhonePe, Paytm, BHIM, …) understands this intent.
- After paying, the student enters the UPI transaction ID; status flips to `awaiting_verification`.
- Teacher verifies/rejects from **Payments** → `successful` / `rejected`.
- The code is **ready** for Razorpay: wire `/api/payments/razorpay/webhook` to update status automatically (the `RAZORPAY_*` env vars are placeholders).

## Reports

`GET /api/reports/payments.pdf?status=...&month=...&year=...` → PDF (PDFKit)
`GET /api/reports/payments.xlsx?...` → XLSX (ExcelJS)

Downloaded straight from the UI with the user's JWT.

## Security notes

- Passwords hashed with bcrypt (cost 12).
- JWT with configurable TTL (default 7 days).
- Helmet + rate limiting on auth routes.
- Uploads validated for type/size.
- Static `/uploads/...` serves images and QR codes only; PDFs are streamed through the authenticated endpoint.
- Every teacher/student mutation checks that the target's `academyId` matches the caller.

## Future integrations

- **Razorpay / Stripe:** replace the manual-verification flow with webhook-based automatic confirmation.
- **Email / SMS / WhatsApp:** fan-out hooks already exist on announcements and status changes — add a provider in `Notification`'s post-save.
- **Custom domains:** `Academy.customDomain` field is reserved; add a request-host → slug resolver in `middleware/auth.js`.
- **Role scoping of recording:** generate signed, short-lived cloud URLs when `recordingPermission` is enabled.

## Deployment

**Backend**
- Set `NODE_ENV=production`, a strong `JWT_SECRET`, real `MONGO_URI`, and `CLIENT_ORIGIN=https://yourdomain.com`.
- Option A: self-hosted (PM2 / Docker). Option B: Render / Railway / Fly.io / Heroku.
- For file storage in production, set the three `CLOUDINARY_*` vars (or swap in S3 — see `middleware/upload.js`).

**Frontend**
- `npm run build` outputs `frontend/dist`.
- Host on any static host (Netlify, Vercel, S3+CloudFront, nginx). Point `/api` at your backend origin.
- If you do not use a proxy, set `VITE_API_URL` and replace `baseURL: '/api'` in `src/api/client.js`.

**MongoDB**
- A single cluster can serve hundreds of academies; all collections are indexed on `academyId`.

## License

MIT — do whatever you need.
