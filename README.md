# POS System

A full-featured Point of Sale system built with Python (Flask) + PostgreSQL. Deploy to Vercel in minutes.

## Features

- 🛒 Dashboard with barcode scanner (one item per scan)
- 📦 Product & category management
- 🏭 Warehouse stock tracking with movement logs
- 🧾 Sales history with date filtering
- 📊 Analytics dashboard (daily/weekly/monthly charts)
- 🖨️ Barcode printing — 5 labels per row, bulk print all
- ⚙️ Settings & multi-user management
- 📱 Fully responsive (phone, tablet, desktop)

---

## Project Structure

```
pos_system/
├── app.py              # Flask app entry point
├── models.py           # SQLAlchemy database models
├── requirements.txt    # Python dependencies
├── vercel.json         # Vercel deployment config
├── .env.example        # Environment variable template
├── api/
│   └── routes.py       # REST API endpoints
├── static/
│   ├── css/main.css    # Styles
│   └── js/app.js       # Frontend JavaScript
└── templates/
    ├── login.html      # Login page
    └── app.html        # Main app shell
```

---

## Local Development

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/pos_system.git
cd pos_system
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Set up environment

```bash
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL=sqlite:///pos.db       # Use SQLite for local dev
SECRET_KEY=any-random-string-here
```

### 3. Run

```bash
python app.py
```

Open `http://localhost:5000` — login with **admin / admin123**.

---

## Deploy to Vercel

### Step 1 — Set up a PostgreSQL database

Use **[Supabase](https://supabase.com)** (free tier, works great with Vercel):

1. Go to [supabase.com](https://supabase.com) → New Project
2. After creation, go to **Settings → Database**
3. Copy the **Connection String (URI)** — looks like:
   ```
   postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres
   ```

> You can also use **Neon** ([neon.tech](https://neon.tech)) or **Railway** ([railway.app](https://railway.app)) — both have free PostgreSQL tiers.

### Step 2 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/pos_system.git
git push -u origin main
```

### Step 3 — Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repository
3. Vercel auto-detects Python — click **Deploy**
4. After deploy, go to **Settings → Environment Variables** and add:

   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | Your PostgreSQL connection string |
   | `SECRET_KEY` | Any long random string |

5. Go to **Deployments** → click the latest → **Redeploy**

Your POS system is now live! 🎉

---

## Default Login

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Owner |

**Change the password immediately after first login** via Settings → Users.

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `SECRET_KEY` | Flask session secret | `super-secret-random-key` |
| `FLASK_ENV` | `production` or `development` | `production` |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.11, Flask 3.0 |
| Database | PostgreSQL (Supabase/Neon/Railway) |
| ORM | SQLAlchemy 2.0 |
| Auth | Flask-Login |
| Frontend | Vanilla JS, JsBarcode, jsQR |
| Deploy | Vercel |
