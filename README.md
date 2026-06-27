# LeadForge

Mobile-first autonomous revenue workspace — AI chat, leads CRM, outreach, deals pipeline, payment requests, and delivery tracking. Deploy to Render in minutes.

## What's real

- **AI Chat** — type commands to search leads, build campaigns, draft outreach emails, create payment links, and manage deals. Powered by Gemini (free) → Groq (free fallback) → Ollama (self-hosted fallback).
- **Real email sending** — connects to Gmail, Outlook, or any SMTP server. Outreach jobs queue and send automatically every minute.
- **Flutterwave payments** — generates real payment links, handles webhook on completion, auto-emails receipt to the client.
- **IMAP inbox** — polls your inbox every 5 minutes for replies to outreach.
- **PWA home screen** — install on iOS/Android home screen. Works offline.
- **Auto keep-alive** — pings itself every 14 minutes so Render free tier never sleeps.
- **Scheduler cron** — Render runs the outreach + payment worker every minute automatically.

---

## Deploy to Render (step by step)

### 1. Create a Render account

Go to [render.com](https://render.com) and sign up (free).

### 2. Connect your GitHub repo

- Dashboard → **New +** → **Web Service**
- Choose **Connect a GitHub repository**
- Select `daviddan-241/launchpad-ai-platform`
- Render will detect the `Dockerfile` and `render.yaml` automatically

### 3. Set environment variables

In the Render service settings → **Environment**, add these:

| Variable | Value | Where to get it |
|---|---|---|
| `APP_URL` | `https://your-app-name.onrender.com` | Your Render service URL |
| `GEMINI_API_KEY` | your key | [aistudio.google.com](https://aistudio.google.com/app/apikey) — free |
| `GROQ_API_KEY` | your key | [console.groq.com](https://console.groq.com) — free |
| `FLUTTERWAVE_SECRET_KEY` | your key | [dashboard.flutterwave.com](https://dashboard.flutterwave.com/settings/apis) |
| `SESSION_SECRET` | (auto-generated) | Render generates this |
| `APP_ENCRYPTION_KEY` | (auto-generated) | Render generates this |

> **Email setup** — no env vars needed. After deploy, go to **Settings → Email** inside the app and add your Gmail app password or SMTP credentials.

### 4. Deploy

Click **Create Web Service**. Render builds the Docker image and deploys. First deploy takes ~5 minutes.

Your app will be live at: `https://your-app-name.onrender.com`

---

## Set up UptimeRobot (free auto-ping)

UptimeRobot pings your app every 5 minutes and keeps Render's free tier alive. The app also pings itself every 14 minutes as a backup.

1. Go to [uptimerobot.com](https://uptimerobot.com) and create a free account
2. Click **Add New Monitor**
3. Set:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: LeadForge
   - **URL**: `https://your-app-name.onrender.com/api/ping`
   - **Monitoring Interval**: 5 minutes
4. Click **Create Monitor**

That's it. UptimeRobot pings `/api/ping` every 5 minutes. The endpoint returns `{"ok":true}` instantly with no auth required.

---

## Set up real email sending (inside the app)

1. Open your app → **Settings** → **Email**
2. Add your SMTP credentials:
   - **Gmail**: use your Gmail address + an [App Password](https://myaccount.google.com/apppasswords) (requires 2FA enabled)
   - **Outlook**: use your Microsoft email + password
   - **Any SMTP**: host, port, username, password
3. Save. Your email account is now connected and outreach will send from it.

---

## Set up payments (Flutterwave)

1. Create a free account at [flutterwave.com](https://flutterwave.com)
2. Get your **Secret Key** from Dashboard → Settings → API Keys
3. Add it as `FLUTTERWAVE_SECRET_KEY` in Render environment
4. Set webhook URL in Flutterwave dashboard:
   `https://your-app-name.onrender.com/api/payments/webhook`
5. Set `FLUTTERWAVE_WEBHOOK_HASH` to match the hash you set in Flutterwave

---

## Install on iPhone home screen (PWA)

1. Open your app URL in **Safari** on iPhone
2. Tap the **Share** button (box with arrow)
3. Tap **Add to Home Screen**
4. Tap **Add**

LeadForge icon will appear on your home screen. It opens full-screen like a native app with no browser chrome.

---

## Local development

```bash
cd leadforge
cp .env.example .env.local
# Fill in your keys in .env.local
npm install
npm run dev
```

App runs at `http://localhost:3000`.

---

## Architecture

- **Next.js 16** (App Router, standalone Docker output)
- **File-based JSON store** at `DATA_DIR/app-data.json` (Render mounts a 1GB disk)
- **Workers** bootstrap at server start via `instrumentation.ts` — no separate worker process
- **Scheduler cron** — Render calls `GET /api/scheduler/tick?secret=SCHEDULER_SECRET` every minute
- **AI fallback chain**: Gemini → Groq → Ollama

No database needed. No Redis. No separate worker. One Docker container does everything.
