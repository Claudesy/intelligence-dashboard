# File: SECURITY.md | App: primary-healthcare | Repo: abyss-v3 | Updated: 2026-03-16
# Architected and built by Claudesy.

# Security Policy — primary-healthcare (AADI)

---

## Melaporkan Vulnerability

Laporkan langsung ke Chief (Dr. Ferdi Iskandar). **Jangan buka GitHub issue publik** untuk celah keamanan.

---

## Implementasi Keamanan yang Ada

### Authentication — Crew Access
- **Cookie:** `puskesmas_crew_session` — HMAC-signed, TTL 12 jam
- **Password hashing:** scrypt (N=16384, r=8, p=1, keylen=64 bytes)
- **Session payload:** `{ v:1, username, displayName, email, institution, profession, role, issuedAt, expiresAt }`
- **Middleware Socket.IO:** semua koneksi Socket.IO di-verify cookie session sebelum join
- **Credential priority:** env vars → `runtime/crew-access-users.json` → compiled defaults

### Authorization — CDSS Endpoint
- `POST /api/cdss/diagnose` — requires valid crew session
- Role check: TODO (noted di route handler, pending RBAC matrix produksi)
- Semua request dicatat ke Security Audit Log

### Security Audit Log
- File: `src/lib/server/security-audit.ts`
- Setiap request ke `/api/cdss/*` dan `/api/auth/*` dicatat ke database
- Fields: endpoint, action, result, userId (SHA-256 hashed), role, IP, metadata
- IP detection: `x-forwarded-for` header (diaktifkan otomatis jika `RAILWAY_ENVIRONMENT_ID` ada)
- PHI tidak pernah masuk ke audit log — userId di-hash, bukan plain text

### PHI Protection — Sentry
- File: `src/lib/intelligence/sentry.config.ts`
- `beforeSend` hook: scrub PHI sebelum setiap event dikirim ke Sentry
- Field patterns yang di-scrub: `patientId`, `patientName`, `patientLabel`, `fullName`, `displayName`, `medicalRecordNumber`, `mrn`, `nik`
- Value patterns: NIK 16-digit → `[REDACTED-NIK]`, MRN → `[REDACTED-MRN]`
- **Session replay dinonaktifkan**: `replaysSessionSampleRate = 0`, `replaysOnErrorSampleRate = 0`

### PHI Protection — CDSS
- `CDSSEngineInput` tidak memiliki field nama pasien atau identifier
- Audit entry CDSS: hanya summary numerik (jumlah suggestion, red flag count) — bukan konten klinis
- `session_id` bersifat opsional dan tidak diikat ke identitas pasien

### Input Validation
- CDSS request body: diparse via `parseDiagnoseRequestBody()` dengan validasi ketat
- Socket.IO message: max 5.000 karakter, room ID max 200 karakter
- Server-side identity: semua socket events menggunakan identity dari session cookie — tidak dari client payload
- Message ID + timestamp: server-generated, tidak dipercaya dari client

### CORS
Production whitelist:
```
https://puskesmasbalowerti.com
https://www.puskesmasbalowerti.com
https://crew.puskesmasbalowerti.com
https://primary-healthcare-production.up.railway.app
```

---

## Versi yang Didukung

| Versi | Didukung |
|-------|---------|
| 0.2.x | ✅ Ya   |
| < 0.2 | ❌ Tidak |

---

## Known Issues / TODOs Security

- Role-based authorization di `/api/cdss/diagnose` belum diimplementasi (lihat comment `TODO(security)` di route handler)
- `RBAC_BACKEND` masih OPEN di `infra/ci/missing-inputs.md` (#3)

---

<sub>Architected and built by Claudesy — 2026 · Sentra Healthcare Artificial Intelligence</sub>
