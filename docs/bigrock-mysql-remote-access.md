# BigRock MySQL Remote Access

Vercel does not normally provide a stable outbound IP on basic setups. For this project, the chosen approach is to allow remote MySQL from any host using cPanel's wildcard:

```txt
%
```

This is weaker than IP allowlisting. Use a dedicated limited database user with a strong password.

## cPanel Steps

1. Open cPanel.
2. Go to **Remote MySQL** or **Remote Database Access**.
3. Add this access host:

```txt
%
```

4. Go to **MySQL Databases**.
5. Create a dedicated app user, for example:

```txt
parbaf73_expense_app
```

6. Add that user only to the expense tracker database.
7. Grant the privileges required by the app.

For least privilege, grant only the app database, not all databases.

## Verify from Vercel

After backend deployment:

```txt
https://your-vercel-api-domain.vercel.app/health/db
```

Common outcomes:

```txt
ok: true
```

Vercel can reach BigRock MySQL.

```txt
ER_ACCESS_DENIED_ERROR
```

Host is reachable, but user/password/database grants are wrong.

```txt
ECONNREFUSED or timeout
```

BigRock is blocking external MySQL, the host is wrong, or the MySQL port is not reachable.