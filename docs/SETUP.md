# File: docs/SETUP.md | App: primary-healthcare | Repo: abyss-v3 | Updated: 2026-03-16
# Architected and built by Claudesy.

# Setup — primary-healthcare (AADI)

---

## Prerequisites

| Tool | Versi |
|------|-------|
| Node.js | ≥ 20.9.0 (Railway deploy: Node 22) |
| pnpm | ≥ 9.x |
| PostgreSQL | ≥ 14 |

---

## Install & Run

```bash
# Dari root monorepo
pnpm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local — isi semua nilai yang diperlukan

# Database setup
pnpm --filter primary-healthcare db:migrate
pnpm --filter primary-healthcare db:seed

# Dev server (custom server dengan Socket.IO)
pnpm --filter primary-healthcare dev
# → http://localhost:7000
```

**Catatan:** App ini menggunakan custom server (`server.ts`), bukan `next dev`.
Dev server berjalan di port 7000 (default). Jika 7000 dipakai, otomatis fallback ke 7001.

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/puskesmas_db

# AI APIs
GEMINI_API_KEY=          # Untuk Audrey voice + Gemini fallback CDSS
DEEPSEEK_API_KEY=        # Primary CDSS reasoning (DeepSeek Reasoner)

# Auth (Crew Access — custom, bukan NextAuth)
CREW_ACCESS_SECRET=      # JWT signing secret untuk session cookie

# Telemedicine (LiveKit)
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
LIVEKIT_URL=             # wss://your-livekit-server

# Email (Resend)
RESEND_API_KEY=          # Untuk email notifikasi registrasi

# Observability
SENTRY_DSN=              # Sentry error tracking
LANGFUSE_PUBLIC_KEY=     # LLM observability
LANGFUSE_SECRET_KEY=
LANGFUSE_HOST=           # https://cloud.langfuse.com atau self-hosted

# EMR Auto-Fill (ePuskesmas)
EPUSKESMAS_URL=          # Base URL sistem ePuskesmas
EPUSKESMAS_USERNAME=
EPUSKESMAS_PASSWORD=

# Perplexity AI (opsional)
PERPLEXITY_API_KEY=

# App
NODE_ENV=development
PORT=7000
HOST=0.0.0.0
```

---

## Git Guardrails

Saat `pnpm install`, script `scripts/install-git-guardrails.mjs` otomatis dijalankan.
Script ini menginstall pre-push hooks sesuai SYNAPSE pipeline.

Manual install:
```bash
pnpm --filter primary-healthcare setup:git-guardrails
```

---

## Commands

```bash
pnpm --filter primary-healthcare dev              # Dev server (port 7000)
pnpm --filter primary-healthcare dev:clean        # Dev server + clear .next lock
pnpm --filter primary-healthcare build            # Production build
pnpm --filter primary-healthcare start            # Production server
pnpm --filter primary-healthcare lint             # TypeScript check (tsc --noEmit)
pnpm --filter primary-healthcare test             # Full test suite
pnpm --filter primary-healthcare test:cdss        # CDSS engine tests saja
pnpm --filter primary-healthcare test:auth-hardening  # Auth security tests
pnpm --filter primary-healthcare db:migrate       # Prisma migrate
pnpm --filter primary-healthcare db:studio        # Prisma Studio
pnpm --filter primary-healthcare db:seed          # Seed database
```

---

## Deployment (Railway)

Config: `railway.toml`
```toml
[build]
buildCommand = "npm run build"
nixPkgs = ["nodejs_22"]

[deploy]
startCommand = "npm run start"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
```

Production URL: `https://primary-healthcare-production.up.railway.app`
Domain custom: `https://puskesmasbalowerti.com`

---

<sub>Architected and built by Claudesy — 2026 · Sentra Healthcare Artificial Intelligence</sub>
