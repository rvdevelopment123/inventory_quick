# Vercel Deployment Guide

## 1. Prerequisites
- Vercel Account
- GitHub Repository (Connected)
- Remote MySQL Database (e.g., PlanetScale, Aiven, or RDS)

## 2. Environment Variables
Configure the following in Vercel Project Settings:

| Variable | Description |
| :--- | :--- |
| `DB_HOST` | Remote database hostname |
| `DB_USER` | Database username |
| `DB_PASSWORD` | Database password |
| `DB_NAME` | Database name (e.g., `inv_quick`) |
| `DB_PORT` | Database port (usually 3306) |
| `JWT_SECRET` | Secure random string for tokens |
| `VITE_API_URL` | Your Vercel domain (e.g., `https://inventory-quick.vercel.app`) |

## 3. Database Setup
1. Create a MySQL database instance on your provider.
2. Allow connections from Vercel (0.0.0.0/0 or specific IPs).
3. Run the schema migration:
   ```bash
   # Locally connect to remote DB and run
   mysql -h <host> -u <user> -p <dbname> < api/schema_v2.sql
   ```

## 4. Deployment
1. Push code to `main` branch.
2. Vercel will auto-detect the configuration in `vercel.json`.
3. The API will be available at `/api/...` and the frontend at root `/`.

## 5. Troubleshooting
- **CORS Errors**: Ensure `VITE_API_URL` matches the domain.
- **DB Connection**: Check SSL settings in `api/db.js` (currently enabled for production).
