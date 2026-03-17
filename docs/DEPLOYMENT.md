# File: docs/DEPLOYMENT.md | App: primary-healthcare | Repo: abyss-v3 | Updated: 2026-03-16
# Architected and built by Claudesy.

# Deployment — primary-healthcare (AADI)

---

## Environments

| Environment | Provider | URL | Trigger |
|-------------|----------|-----|---------|
| Local dev | localhost:7000 | http://localhost:7000 | `pnpm dev` |
| Production | Railway | https://primary-healthcare-production.up.railway.app | Manual / Gate 5 |
| Domain custom | Railway | https://puskesmasbalowerti.com | DNS → Railway |

---

## Railway Configuration

File: `railway.toml`

```toml
[build]
builder = "nixpacks"
buildCommand = "npm run build"

[build.nixpacksPlan.phases.setup]
nixPkgs = ["nodejs_22"]          # Node 22 di production

[deploy]
startCommand = "npm run start"    # npm run start = tsx server.ts (production mode)
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3

[environments.production]
NODE_ENV = "production"
```

**Catatan penting:**
- Build command: `next build`
- Start command: `tsx --conditions react-server server.ts` (custom server)
- Port: otomatis dari Railway env var `PORT`. Default fallback ke 7000

---

## Build & Deploy Manual

```bash
# 1. Build production
pnpm --filter primary-healthcare build

# 2. Test production build lokal
NODE_ENV=production pnpm --filter primary-healthcare start

# 3. Deploy ke Railway (staging)
railway up

# 4. Cek logs
railway logs --environment production
```

---

## Gate 5 — Production Deploy (Wajib)

Production deployment **tidak bisa** tanpa:
1. Gate 1–4 semua passing di GitHub Actions
2. Security review completed
3. File `genesis/05-trust-bridge/preview/chief-approval.md` ditandatangani Chief
4. Pipeline `infra/ci/pipelines/05-deploy-gate.yaml` passing

---

## Environment Variables Production (Railway)

Set via Railway dashboard atau `railway variables set KEY=VALUE`:

```
NODE_ENV=production
PORT=                        # Railway auto-set
DATABASE_URL=                # PostgreSQL production URL
GEMINI_API_KEY=              # Audrey + CDSS fallback
DEEPSEEK_API_KEY=            # CDSS primary reasoner
CREW_ACCESS_SECRET=          # HMAC session signing secret
LIVEKIT_API_KEY=             # Telemedicine
LIVEKIT_API_SECRET=
LIVEKIT_URL=
RESEND_API_KEY=              # Email notifikasi
SENTRY_DSN=                  # Error monitoring
SENTRY_AUTH_TOKEN=           # Source map upload
SENTRY_ORG=
SENTRY_PROJECT=
LANGFUSE_PUBLIC_KEY=         # LLM observability
LANGFUSE_SECRET_KEY=
LANGFUSE_HOST=
EPUSKESMAS_URL=              # EMR auto-fill target
EPUSKESMAS_USERNAME=
EPUSKESMAS_PASSWORD=
TRUST_PROXY_HEADERS=true     # Aktifkan x-forwarded-for (wajib di Railway)
RAILWAY_ENVIRONMENT_ID=      # Auto-set oleh Railway
```

---

## Rollback

```bash
# Railway rollback ke deployment sebelumnya
railway rollback
```

---

## Health Check

```
GET /api/health → { status: "ok" }
```

Atau cek langsung URL Railway dashboard untuk deployment status.

---

<sub>Architected and built by Claudesy — 2026 · Sentra Healthcare Artificial Intelligence</sub>
