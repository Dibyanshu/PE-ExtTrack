# BigRock FTP Document Storage

Vercel's filesystem is not persistent. Uploaded documents are stored on BigRock through FTP.

## Storage Settings

Set these in Vercel:

```txt
BIGROCK_FTP_HOST=ftp.parbatienterprises.com
BIGROCK_FTP_PORT=21
BIGROCK_FTP_SECURE=true
BIGROCK_FTP_USER=your-ftp-user
BIGROCK_FTP_PASSWORD=your-ftp-password
UPLOAD_DIR=/public_html/expense_tracker_uploads
BIGROCK_UPLOAD_PUBLIC_BASE_URL=https://parbatienterprises.com/expense_tracker_uploads
```

## File Layout

Uploaded files are stored as:

```txt
/public_html/expense_tracker_uploads/{voucher_number}/{invoice_number}_{sequence}.ext
```

Example public URL:

```txt
https://parbatienterprises.com/expense_tracker_uploads/PECRU-00001/INV001_1.pdf
```

## Database Metadata

The `documents` table stores:

```txt
relative_path
public_url
storage_driver
```

For an existing database, run:

```txt
backend/db/migrations/001_document_storage_columns.sql
```

## Note

On Vercel, uploads always use BigRock FTP. If FTP configuration is missing or the FTP upload fails, the request fails instead of falling back to local filesystem storage.

Files in `public_html` are public if someone knows the URL. For private documents, use a non-public FTP directory and add a backend download route later.