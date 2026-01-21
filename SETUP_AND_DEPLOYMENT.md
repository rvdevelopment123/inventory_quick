# Setup and Deployment Guide

This guide details the steps to configure, build, and deploy the Inventory Management System in a single environment.

## 1. Environment Configuration

Create a `.env` file in the project root directory. Use the `.env.example` as a template.

### Required Variables

| Variable | Description | Example Value | Validation |
| :--- | :--- | :--- | :--- |
| `PORT` | API Server Port | `3000` | Number, > 1024 |
| `NODE_ENV` | Environment | `production` | 'development', 'production', 'test' |
| `DATABASE_URL` | PostgreSQL Connection String | `postgresql://user:pass@localhost:5432/inventory_quick` | Valid URI |
| `JWT_SECRET` | Secret for Access Tokens | `long-secure-random-string` | Min 32 chars, **SENSITIVE** |
| `REFRESH_SECRET` | Secret for Refresh Tokens | `another-secure-random-string` | Min 32 chars, **SENSITIVE** |

> **Security Note:** Never commit `.env` to version control. Ensure `JWT_SECRET` and `REFRESH_SECRET` are strong and unique for production.

---

## 2. Database Setup

The system requires a PostgreSQL database (v14+).

### Creation and Migration

1.  **Create Database:**
    ```bash
    createdb inventory_quick
    ```

2.  **Run Migrations (Schema Setup):**
    Execute the schema SQL file to create tables, functions, and triggers.
    ```bash
    psql -d inventory_quick -f schema.sql
    ```

    **Verification:**
    Check that tables were created:
    ```bash
    psql -d inventory_quick -c "\dt"
    ```
    *Expected Output:* Should list `users`, `locations`, `items`, `inventory_movements`, `inventory_reservations`.

    **Rollback:**
    To reset the database (CAUTION: Destructive):
    ```bash
    dropdb inventory_quick && createdb inventory_quick
    ```

### Database Seeding

Seed data is included in the `schema.sql` file (lines 138+). If you ran the migration command above, seed data is already applied.

To verify seed data:
```bash
psql -d inventory_quick -c "SELECT count(*) FROM items;"
```
*Expected Output:* `3` (or the number of seed items).

---

## 3. Application Execution

### Backend (API)

The backend is a Node.js Express application located in the `api/` directory.

1.  **Install Dependencies:**
    ```bash
    cd api
    npm install
    ```

2.  **Start Application:**
    ```bash
    npm start
    ```
    *For production, consider using a process manager like PM2:* `pm2 start server.js --name inventory-api`

3.  **Startup Verification:**
    Check the logs for:
    ```text
    Server running on port 3000
    Environment: production
    ```

4.  **Health Check:**
    ```bash
    curl http://localhost:3000/health
    ```
    *Expected Response:* `{"status":"healthy","database":"connected"}`

### Frontend (Client)

The frontend is a React application located in the `client/` directory.

1.  **Build Process:**
    ```bash
    cd client
    npm install
    npm run build
    ```
    This generates static assets in `client/dist/`.

2.  **Serving (Production):**
    Serve the static files using a web server (Nginx, Apache) or the preview command for simple deployments:
    ```bash
    npm run preview -- --port 8080 --host
    ```

3.  **Configuration:**
    Ensure the frontend API URL points to your backend. In production, this is typically handled via Nginx reverse proxy or by setting `VITE_API_URL` during build (if configured).

---

## 4. Deployment Verification

Perform these steps to verify the deployment is fully operational.

### Smoke Test

1.  **Backend Connectivity:**
    Access `http://localhost:3000/health` and ensure it returns HTTP 200.

2.  **Frontend Loading:**
    Open the frontend URL (e.g., `http://localhost:8080`) in a browser.
    - Verify the Login screen loads.
    - Check the browser console for any 404 errors for JS/CSS assets.

3.  **End-to-End Test:**
    - Log in with default credentials (if seeded): `admin_user` / (password hash in DB, reset if needed).
    - Navigate to "Items" page.
    - Verify the list of items loads (fetching from backend).

### Troubleshooting

-   **Database Connection Refused:**
    -   Check `DATABASE_URL` in `.env`.
    -   Ensure Postgres is running: `pg_isready`.
    -   Verify network accessibility if DB is on a different host.

-   **Frontend API Errors (CORS):**
    -   Check backend logs for CORS errors.
    -   Ensure backend allows the frontend origin (configured in `api/server.js`).

-   **"Module not found" Errors:**
    -   Ensure `npm install` was run in both `api/` and `client/` directories.
