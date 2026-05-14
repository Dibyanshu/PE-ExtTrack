# Backend Deployment: Vercel

The Fastify backend is platform-neutral in `backend/app.js`. Vercel-specific code is limited to:

```txt
backend/api/index.js
backend/vercel.json
.github/workflows/deploy-backend-vercel.yml
```

If the backend moves to another host later, replace those deployment files and keep the app modules intact.

## GitHub Secrets

Create these repository secrets:

```txt
VERCEL_TOKEN=...
VERCEL_ORG_ID=...
VERCEL_PROJECT_ID=...
```

## Vercel Environment Variables

Set these in the Vercel project dashboard:

```txt
JWT_SECRET=use-a-long-random-secret
FRONTEND_ORIGIN=https://parbatienterprises.com

DB_HOST=your-bigrock-mysql-host
DB_PORT=3306
DB_USER=parbaf73_limited_app_user
DB_PASSWORD=strong-random-password
DB_NAME=parbaf73_expense_tracker

BIGROCK_FTP_HOST=ftp.parbatienterprises.com
BIGROCK_FTP_PORT=21
BIGROCK_FTP_SECURE=true
BIGROCK_FTP_USER=your-ftp-user
BIGROCK_FTP_PASSWORD=your-ftp-password
UPLOAD_DIR=/public_html/expense_tracker_uploads
BIGROCK_UPLOAD_PUBLIC_BASE_URL=https://parbatienterprises.com/expense_tracker_uploads
```

## Deploy

Run:

```txt
GitHub -> Actions -> Deploy Backend to Vercel -> Run workflow
```

Or push backend changes to `main`.

## Verify

```txt
https://your-vercel-api-domain.vercel.app/health
https://your-vercel-api-domain.vercel.app/health/db
```

`/health/db` confirms that Vercel can reach BigRock MySQL.