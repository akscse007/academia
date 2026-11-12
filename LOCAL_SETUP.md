# Local setup — quick start

## 1. Requirements

- Node.js 18+ (`node --version`)
- A PostgreSQL connection string. Easiest = free [Neon](https://neon.tech) project.

## 2. Backend

```bash
cd student-saas/backend

# create your env file
cp .env.example .env           # Windows cmd: copy .env.example .env
# edit .env and paste your Neon DATABASE_URL + DIRECT_URL

npm install --legacy-peer-deps
npx prisma db push             # creates tables on Neon
npx prisma generate            # generates the Prisma client
npm run dev                    # starts on http://localhost:5000
```

You should see:

```
Prisma connected to Postgres
Platform owner created: owner@yourplatform.com
Sample academy seeded (slug: bright-future-academy)
API listening on :5000
```

Open http://localhost:5000/api/health — you should get `{"ok":true}`.

## 3. Frontend

In a second terminal:

```bash
cd student-saas/frontend
npm install
npm run dev                    # starts on http://localhost:5173
```

Open http://localhost:5173.

## 4. Sign in with the seeded accounts

| Role           | URL                                                  | Email                         | Password     |
|----------------|------------------------------------------------------|-------------------------------|--------------|
| Platform owner | http://localhost:5173/login → Platform owner tab     | `owner@yourplatform.com`      | `Owner@12345`|
| Teacher        | http://localhost:5173/login → Teacher tab            | `teacher@brightfuture.test`   | `Teacher@123`|
| Student        | http://localhost:5173/a/bright-future-academy/login  | `student@brightfuture.test`   | `Student@123`|

## 5. Reset or re-seed

- **Reset a password manually:** from `backend/`, run

  ```bash
  node -e "import('./src/lib/prisma.js').then(async ({default:p})=>{const b=await import('bcryptjs');await p.user.updateMany({where:{email:'YOUR_EMAIL'},data:{password:await b.default.hash('NEW_PASS',12)}});await p.$disconnect()})"
  ```
- **Wipe and re-seed:** drop the tables in Neon, run `npx prisma db push`, then `npm run seed` (or restart with `AUTO_SEED=true`).
- **Inspect data in a UI:** `npx prisma studio` → http://localhost:5555.

## 6. Share links and deployment

The "Share with students" page builds URLs from `window.location.origin`, so:

- In dev the links are `http://localhost:5173/a/<slug>/register`.
- When deployed to `https://edu.yourdomain.com`, the same code auto-generates `https://edu.yourdomain.com/a/<slug>/register` — no change needed.

For URLs that the **backend** returns (e.g. in the "create student" response), set `APP_URL` in production `.env`:

```env
APP_URL=https://edu.yourdomain.com
CLIENT_ORIGIN=https://edu.yourdomain.com
```

In dev `APP_URL` can stay blank — the server falls back to the request's origin header.

## 7. Common gotchas

- `--legacy-peer-deps` is required for `npm install` because `multer-storage-cloudinary@4` needs `cloudinary@1` but we're on `cloudinary@2`. Cloud uploads are optional.
- If port 5000 or 5173 is busy, change `PORT` in `.env` or the port in `frontend/vite.config.js`. Keep the Vite proxy target in sync.
- Prisma locks `query_engine-windows.dll.node` while the server runs — stop the server before `npx prisma generate`.
- PDFs uploaded in dev are stored under `backend/uploads/` (gitignored). They don't persist across fresh clones.

## 8. Stop everything

- Backend: `Ctrl+C` in its terminal.
- Frontend: `Ctrl+C` in its terminal.
- Database (Neon): nothing to do — it's hosted.

See [`README.md`](./README.md) for architecture details, API surface, deployment notes and troubleshooting beyond this quick-start.
