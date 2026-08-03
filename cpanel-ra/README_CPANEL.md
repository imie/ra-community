# Deploying RA Community to cPanel (Option B)

This directory contains the codebase adapted for deployment on **cPanel Shared Hosting or VPS** without relying on Docker. It replaces PostgreSQL with cPanel's built-in **MariaDB** database.

## Architecture

- **Backend:** FastAPI running as a WSGI Python App via Phusion Passenger (`passenger_wsgi.py`).
- **Database:** cPanel MariaDB (via `PyMySQL` driver).
- **Frontend:** Next.js static export deployed to a free static host (Vercel/Netlify), connecting to your cPanel backend API.

---

## Step 1: Database Setup (MariaDB)

1. Log into your cPanel dashboard.
2. Go to **MySQL® Databases**.
3. Create a new database (e.g., `cpaneluser_ra_db`).
4. Create a new user (e.g., `cpaneluser_ra_user`) with a strong password.
5. Add the user to the database and grant **ALL PRIVILEGES**.
6. Make a note of the Database Name, Username, and Password.

---

## Step 2: Setup Python App in cPanel

1. Go to **Setup Python App** in your cPanel dashboard.
2. Click **Create Application**.
3. Configuration:
   - **Python version:** `3.10` or `3.11` (ensure it matches your backend requirements).
   - **Application root:** `ra_backend` (or a folder outside `public_html`).
   - **Application URL:** `api.yourdomain.com` (create a subdomain for the API).
   - **Application startup file:** `passenger_wsgi.py` (leave default, but we will upload our own).
   - **Application Entry point:** `application` (leave default).
4. Click **Create**.

---

## Step 3: Upload Backend Code

1. Use cPanel File Manager or FTP to navigate to the `ra_backend` folder you created in Step 2.
2. Delete the default files created by cPanel.
3. Upload all contents of the `cpanel-ra/backend/` folder into this directory.
4. Rename `.env.example` to `.env` and configure the variables:
   ```ini
   # Update the database URL with your cPanel MariaDB details
   DATABASE_URL=mysql+pymysql://cpaneluser_ra_user:PASSWORD@localhost:3306/cpaneluser_ra_db?charset=utf8mb4
   
   # Change to production
   BACKEND_ENV=production
   BACKEND_DEBUG=False
   
   # Set a strong secret key
   JWT_SECRET=generate-a-strong-random-64-character-string-here
   
   # Add your frontend URL to CORS
   CORS_ORIGINS=https://your-frontend-domain.vercel.app,http://localhost:3000
   ```

---

## Step 4: Install Dependencies & Initialize Database

1. Go back to **Setup Python App** in cPanel.
2. Edit your application.
3. Under the "Configuration files" section, it should detect `requirements.txt`. Click **Run Pip Install**.
4. To initialize the database (create tables), the application needs to start up once.
5. Click **Restart** on the Python app.
6. Make a test request to your API: `https://api.yourdomain.com/health`.
   - If it returns `{"status": "ok", "service": "RA Community API"}`, the application has started successfully and the database tables were automatically created!

> **Note on SSL**: The backend includes SSL certificate upload logic (for Cloudflare/Custom). Since cPanel handles SSL via AutoSSL, you don't need to use the in-app SSL upload feature. Just ensure your subdomain has a valid AutoSSL certificate in cPanel.

---

## Step 5: Deploy the Frontend

Because Next.js SSR (Server-Side Rendering) requires a running Node.js server, standard shared cPanel hosting is not ideal for the frontend. The best approach is to deploy the Next.js app to a free platform like Vercel or Netlify.

1. Create a GitHub/GitLab repository and push the `cpanel-ra/web/` folder.
2. Log into [Vercel](https://vercel.com/) (or Netlify).
3. Import your repository.
4. Set the Environment Variables in Vercel:
   - `NEXT_PUBLIC_API_URL` = `https://api.yourdomain.com/api` (Point this to your cPanel API)
   - `NEXT_PUBLIC_APP_NAME` = `Your Community Name`
5. Click **Deploy**.

The frontend will now communicate securely with your cPanel-hosted backend!
