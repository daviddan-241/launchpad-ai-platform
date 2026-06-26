# LeadForge

LeadForge is an original mobile-first revenue workspace with chat-driven lead operations, outreach, CRM, payment approvals, project generation, and activity tracking.

## Current real features

- Custom LeadForge branding
  - custom icon
  - custom wordmark
  - PWA home-screen icon support
- Mobile-first iOS-style workspace shell with sidebar navigation
- PWA manifest + offline shell page
- Free signup and login flow
- Cookie-based sessions
- Local or mounted file persistence
- Chat-first command page (`/chat`) that can:
  - search saved leads
  - build campaign plans
  - generate proposals with saved pricing guidance
  - generate MVP web project starter files
  - prepare outreach drafts
  - create payment drafts
  - create deals and delivery handoffs from commands
  - queue real sends to saved leads when a sender account is connected
- Real-time-style activity dashboard (`/activity`)
- Pricing/payment preference settings used by Dave in proposals and outreach
- SMTP sender support with username/password
- Gemini support with Groq/Ollama fallback
- CRM deals pipeline (`/deals`)
- Delivery projects + milestones (`/delivery`)
- Payment request pipeline (`/payments`)
- Render + Docker deployment prep

## Main app routes

- `/signup`
- `/login`
- `/chat`
- `/activity`
- `/projects`
- `/dashboard`
- `/leads`
- `/deals`
- `/campaigns`
- `/payments`
- `/delivery`
- `/inbox`
- `/workflows`
- `/settings`
- `/offline`

## SMTP-first Render setup

If you do not want OAuth client credentials, use SMTP.

### Core Render environment variables

```bash
APP_URL=
APP_ENCRYPTION_KEY=
DATA_DIR=/var/data/leadforge
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash
FLUTTERWAVE_SECRET_KEY=
```

### Optional fallbacks

```bash
GROQ_API_KEY=
GROQ_MODEL=llama-3.1-8b-instant
OLLAMA_BASE_URL=
OLLAMA_MODEL=llama3.2:1b
```

### Optional OAuth envs
Only needed if you deliberately choose Gmail or Outlook API mode instead of SMTP.

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
```

## SMTP connection flow

Inside `/settings`:
- enter sender email
- SMTP username
- SMTP password or app password
- SMTP host
- SMTP port
- secure on/off

This is the primary real sending path if you do not want OAuth client IDs.

## Run locally

```bash
npm install
npm run dev
```

Or use:

```bash
./scripts/leadforge-shell.sh dev
```

## Deployment

- `Dockerfile` included
- `render.yaml` included
- `output: "standalone"` enabled in Next config
- local persistence can be redirected using `DATA_DIR`

## Important note

This build is intentionally original in branding, content, and implementation. It follows the requested feature direction but does not copy protected branding or assets from other products.
