# Mahaveer Hospitality 

Next.js App Router migration of the existing React/Express application. The frontend and REST APIs run from this project, and MySQL is the only application database. The original `frontend` and `backend` folders remain as migration references.

## Local setup

1. Install MySQL 8 or another MySQL-compatible server and create an empty database, for example:

   ```sql
   CREATE DATABASE mahaveer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. Copy `.env.example` to `.env.local` and enter the MySQL connection and a private session secret.
3. Install and start the app:

   ```powershell
   npm install
   npm run dev
   ```

   Open `http://localhost:3000/login`. The first API request creates the required MySQL tables. Before normal use, call `POST /api/auth/bootstrap-admin` once with `ADMIN_BOOTSTRAP_KEY`, `fullName`, `email`, `mobile`, `username`, and `password`; it creates the first administrator and signs that browser in. Remove the bootstrap key from `.env.local` after setup. Later public signups can only create sales users.

The app does not connect to MongoDB and does not copy old MongoDB records. New users, catalog entries, quotations, and sessions are stored in MySQL.

## Configuration

| Variable | Purpose |
| --- | --- |
| `MYSQL_HOST` | MySQL server host (default `127.0.0.1`) |
| `MYSQL_PORT` | MySQL server port (default `3306`) |
| `MYSQL_USER` | MySQL username (default `root`) |
| `MYSQL_PASSWORD` | MySQL password |
| `MYSQL_DATABASE` | Existing, empty database name (required) |
| `SESSION_SECRET` | Secret used to sign the `sessions` authentication cookie; required in production |
| `ADMIN_BOOTSTRAP_KEY` | One-time key for creating the initial administrator |
| `NEXT_PUBLIC_BACKEND_URL_IMG` | Optional origin prefix if uploaded images are served separately |

Uploaded product and category images are stored below `public/public/` so existing `/public/...` image URLs continue to work. Configure persistent storage for that directory in production.

## Migrated application

- React UI, theme tokens, Radix/shadcn-style components, MUI, React Query, permissions, PDFs, and the login/admin/sales flows are carried over from `frontend/src`.
- The existing `/api/auth`, `/api/users`, `/api/company`, `/api/category`, `/api/products`, `/api/quotations`, and `/api/whatsapp` route contracts are implemented by Next.js Route Handlers.
- MySQL tables are initialized idempotently by `lib/database.js`; quotation IDs retain the `MH-000001` format.
- WhatsApp uses the existing `whatsapp-web.js` integration and requires a persistent Node.js runtime, writable session storage, and a supported Chromium environment. It is not suitable for serverless-only hosting without redesign.
- The UI uses a client-side compatibility router inside the Next.js catch-all page to preserve existing URLs while the feature screens are migrated.

## Database changes

Schema changes belong in `lib/database.js` and must remain safe to run on every application start. Back up the MySQL database before applying schema changes. The MongoDB project remains available in the sibling `backend` folder but is not used by this app.
