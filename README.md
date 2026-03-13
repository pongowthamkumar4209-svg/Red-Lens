# ☭ Red Lens — Daily Political News Portal
### Real News · Communist Analysis · India + Tamil Nadu + World

---

## How It Works

```
RSS Feeds (The Hindu, Indian Express, Al Jazeera, BBC, Reuters, etc.)
        ↓  (fetches today's real articles)
Flask Backend
        ↓  (sends real headlines to Claude)
Claude API → Red Lens (Marxist analysis for each article)
        ↓
PostgreSQL / SQLite DB  ←→  Auto-delete news older than 7 days
        ↓
React Frontend (Vercel)
```

**Real news. Real sources. Communist analysis.**

---

## Run Locally

### Backend
```cmd
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
:: Edit .env — add your ANTHROPIC_API_KEY. Leave DATABASE_URL blank for SQLite.
python app.py
```

### Frontend (new terminal)
```cmd
cd frontend
npm install
copy .env.example .env.local
npm run dev
```

Open: **http://localhost:5173**

---

## Push to GitHub

```cmd
cd C:\Users\nara\OneDrive\Desktop\Gowtham\red-lens-portal

:: Initialize git (first time only)
git init
git add .
git commit -m "Initial commit — Red Lens portal"

:: Create repo on github.com then:
git remote add origin https://github.com/YOUR_USERNAME/red-lens-portal.git
git branch -M main
git push -u origin main
```

---

## Deploy Backend → Render

1. Go to https://render.com → **New → Blueprint**
2. Connect your GitHub repo
3. Render reads `backend/render.yaml` automatically
4. It creates: Web Service + PostgreSQL database
5. Add these env vars in Render dashboard:
   - `ANTHROPIC_API_KEY` = your key
   - `ALLOWED_ORIGINS` = `https://your-vercel-app.vercel.app`
6. Deploy — note your backend URL: `https://red-lens-backend.onrender.com`

---

## Deploy Frontend → Vercel

1. Go to https://vercel.com → **New Project**
2. Import your GitHub repo
3. Set **Root Directory** to `frontend`
4. Add env variable:
   - `VITE_API_URL` = `https://red-lens-backend.onrender.com`
5. Deploy

Update Render `ALLOWED_ORIGINS` with your Vercel URL after deploy.

---

## Features

| Feature | Details |
|---|---|
| Real RSS News | The Hindu, Indian Express, The Wire, Scroll, Al Jazeera, BBC, Reuters, Guardian, Jacobin, Peoples Dispatch + more |
| Red Lens Analysis | Claude analyses every real article with Marxist/communist commentary |
| India / TN Section | Covers national India + Tamil Nadu politics separately |
| World Section | All world regions + India bilateral/MoU stories highlighted |
| 7-Day Rolling DB | Auto-deletes news older than 7 days daily |
| Archive | Browse news by date via calendar |
| Search | Full-text search across headlines, summaries, analyses |
| Bookmarks | Star articles across both sections |
| Daily Auto-Fetch | APScheduler runs at 07:00 IST every day |
| Read Original | Each card links back to the real source article |

---

## Environment Variables

**backend/.env**
```
DATABASE_URL=                          # blank = SQLite locally; set PostgreSQL URL on Render
ANTHROPIC_API_KEY=sk-ant-...
ALLOWED_ORIGINS=http://localhost:5173,https://your-app.vercel.app
FLASK_ENV=development
DISABLE_SCHEDULER=true                 # true locally, false on Render
```

**frontend/.env.local**
```
VITE_API_URL=http://localhost:5000
```
