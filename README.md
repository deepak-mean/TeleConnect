# TeleConnect — WhatsApp Clinic Bot Platform

WhatsApp-based teleconnect bot platform for small clinics, starting with pediatricians in India.

## Architecture

| Layer | Tech |
|-------|------|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Database | PostgreSQL via Supabase |
| WhatsApp | Twilio WhatsApp Sandbox (MVP) |
| AI | Anthropic Claude API |
| Auth | Supabase Phone OTP |

## Quick Start

### 1. Database Setup

Run `database/schema.sql` in your Supabase SQL editor.

### 2. Backend

```bash
cd backend
cp .env.example .env
# Fill in your keys
npm install
npm run dev
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

### 4. WhatsApp Webhook (Twilio Sandbox)

1. Go to Twilio Console → Messaging → Try it out → WhatsApp
2. Set webhook URL: `https://your-domain.com/api/webhook`
3. Use ngrok for local development: `ngrok http 3000`

## Environment Variables

### Backend (`backend/.env`)

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
ANTHROPIC_API_KEY=
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Frontend (`frontend/.env`)

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Build Phases

- [x] **Phase 1** — Project structure, DB schema, Express skeleton, React app with routing
- [ ] **Phase 2** — Doctor onboarding, NMC verification, AI FAQ suggestions
- [ ] **Phase 3** — Patient management, CSV import
- [ ] **Phase 4** — WhatsApp bot core, conversation state machine
- [ ] **Phase 5** — Triage system, urgency scoring, doctor alerts
- [ ] **Phase 6** — Hindi/English detection, voice notes, rate limiting

## WhatsApp Bot Flow

```
Patient messages → Twilio → POST /api/webhook
  → Identify patient by phone
  → Load conversation state from DB
  → Route: IDLE → GREETING → MAIN_MENU
       ↓
  TRIAGE_FLOW | FAQ_FLOW | APPOINTMENT_FLOW
       ↓
  RESOLUTION or ESCALATE_TO_DOCTOR
```

## Key Constraints

- Bot never sends medical diagnosis — only triage guidance
- Every conversation starts with disclaimer: "Yeh bot medical advice nahi deta"
- Urgent symptoms always escalate to doctor via WhatsApp alert
- Conversation state persists across sessions (30-min inactivity timeout)
- Works on basic WhatsApp — numbered text menus only (Phase 1)
