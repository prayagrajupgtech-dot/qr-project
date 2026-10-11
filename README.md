# ResQRide

ResQRide is a smart vehicle QR safety platform that allows vehicle owners to create QR-enabled emergency contact cards. In an emergency, anyone can scan the QR code to quickly access the owner's emergency contact information.

React + Vite app for creating ID cards and database-backed QR verification links. Serverless functions keep the Supabase and Razorpay secrets out of the browser bundle.

Tagline: **Scan. Connect. Protect.**

The same server handlers are exposed as Vercel Functions under `/api/*`, so the app can run on either Vercel or Netlify.

## Local Development

```bash
npm install
npm run dev
```

The Vite server only runs the frontend. Use `vercel dev` for Vercel Functions or Netlify Dev for Netlify Functions when testing the complete workflow locally.

## Build

```bash
npm run build
```

The production files are generated in `dist/`.

## Netlify

This repo includes `netlify.toml`, so Netlify detects:

- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`

Set these environment variables in Netlify before deploying:

```text
SUPABASE_URL
SUPABASE_SECRET_KEY
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_PLAN_ID
RAZORPAY_WEBHOOK_SECRET
ADMIN_PASSWORD
ADMIN_SESSION_SECRET
```

`SUPABASE_SECRET_KEY`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` must only be available to server-side Functions and must never use a `VITE_` prefix.

The root route and `#/admin` show the administrator sign-in. The card generator only renders after a valid
admin session. Customers reach the membership page through the `#/plans` URL printed on the back of each ID
card. `ADMIN_SESSION_SECRET` signs the 12-hour HttpOnly admin session cookie. Keep both admin values server-only
and use long, unique production secrets.

## Supabase

Run [supabase/schema.sql](supabase/schema.sql) in the Supabase SQL Editor. The app uses:

- `create-card` to create an active database record.
- `verify-card` to read the latest public verification status.
- `update-card` to persist edited scan-page name and phone details.

New QR codes contain only a random database UUID. QR codes created by older app versions remain readable as legacy, non-database-verified records.

## Security

The database secret is protected by Netlify Functions and the table denies direct anonymous access. The generator UI and card-creation endpoint require an authenticated admin session.

## Razorpay Test Mode

The `#/plans` route creates a Razorpay subscription with a 30-day delayed start and 60 monthly billing cycles. Configure a Razorpay webhook at:

```text
https://YOUR_SITE/.netlify/functions/razorpay-webhook
```

Use the same webhook secret stored in `RAZORPAY_WEBHOOK_SECRET`. Subscribe to subscription lifecycle events, including authenticated, activated, charged, pending, halted, completed, and cancelled. Run the subscription tables in [supabase/schema.sql](supabase/schema.sql) before testing.

On Vercel, configure the webhook URL as:

```text
https://YOUR_VERCEL_DOMAIN/api/razorpay-webhook
```

Do not enable live credentials until authentication, customer cancellation, support, privacy, refund, and production monitoring workflows are complete.
