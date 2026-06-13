# Expense Tracker

Dark-themed personal expense tracker built with React + Vite + Recharts.

## Deploy to Vercel (5 minutes)

### Step 1 — Install dependencies locally
```bash
cd expense-tracker
npm install
npm run dev        # opens at http://localhost:5173 to preview first
```

### Step 2 — Push to GitHub
1. Go to https://github.com/new and create a new repo (e.g. `expense-tracker`)
2. Run these commands in your terminal:
```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/expense-tracker.git
git push -u origin main
```

### Step 3 — Deploy on Vercel
1. Go to https://vercel.com and sign in (use your GitHub account)
2. Click **Add New → Project**
3. Import your `expense-tracker` repo
4. Leave all settings as default — Vercel auto-detects Vite
5. Click **Deploy**

Your app will be live at `https://expense-tracker-xxx.vercel.app` in ~60 seconds.

## Data storage
Data is saved in your **browser's localStorage** — it stays on the device you use.
If you want it to sync across devices (phone + laptop), let me know and we can add a small backend.

## Local dev
```bash
npm run dev      # development server
npm run build    # production build
npm run preview  # preview production build locally
```
