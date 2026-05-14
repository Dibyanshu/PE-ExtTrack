# Frontend Deployment: BigRock FTP

The React app is hosted from:

```txt
https://parbatienterprises.com/expense_tracker
```

The workflow builds the app with:

```txt
VITE_BASE_PATH=/expense_tracker/
```

and uploads the compiled files to BigRock through FTP/FTPS.

## GitHub Secrets

```txt
FTP_USERNAME=your-ftp-user
FTP_PASSWORD=your-ftp-password
VITE_API_URL=https://your-vercel-api-domain.vercel.app
```

## GitHub Variables

These are optional because the workflow has defaults, but setting them makes the deployment target explicit:

```txt
FTP_SERVER=ftp.parbatienterprises.com
FTP_PROTOCOL=ftps
FTP_PORT=21
FTP_FRONTEND_DIR=/public_html/expense_tracker/
```

Use `ftp` instead of `ftps` only if BigRock does not support FTPS for your account.

## Deploy

Run:

```txt
GitHub -> Actions -> Deploy Frontend to BigRock FTP -> Run workflow
```

Or push frontend changes to `main`.

## Verify

```txt
https://parbatienterprises.com/expense_tracker
```