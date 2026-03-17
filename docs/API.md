# File: docs/API.md | App: primary-healthcare | Repo: abyss-v3 | Updated: 2026-03-16
# Architected and built by Claudesy.

# API Reference — primary-healthcare (AADI)

---

## Auth — `/api/auth/`

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/auth/login` | Login crew (username + password) → set session cookie |
| POST | `/api/auth/logout` | Logout, clear session cookie |
| GET | `/api/auth/session` | Get current session (username, role, profession, institution) |
| POST | `/api/auth/register` | Registrasi crew baru (menunggu approval admin) |
| GET | `/api/auth/profile` | Get profil crew yang sedang login |

---

## CDSS — `/api/cdss/`

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/cdss/diagnose` | Submit kasus ke Iskandar Engine V2 → differential diagnosis |
| GET | `/api/cdss/symptoms` | Autocomplete gejala |
| POST | `/api/cdss/autocomplete` | Autocomplete diagnosis/gejala |
| POST | `/api/cdss/red-flag-ack` | Acknowledge red flag alert |
| POST | `/api/cdss/suggestion-selected` | Catat suggestion yang dipilih dokter |
| POST | `/api/cdss/outcome-feedback` | Feedback outcome klinis (untuk evaluasi engine) |
| GET | `/api/cdss/quality-dashboard` | Dashboard kualitas CDSS |

### POST `/api/cdss/diagnose` — Request Body
```typescript
{
  keluhan_utama: string           // Chief complaint
  keluhan_tambahan?: string       // Additional complaints
  usia: number                    // Age in years
  jenis_kelamin: "L" | "P"       // Gender
  vital_signs?: {
    systolic?: number             // mmHg
    diastolic?: number            // mmHg
    heart_rate?: number           // bpm
    spo2?: number                 // %
    temperature?: number          // Celsius
    respiratory_rate?: number     // breaths/min
  }
  chronic_diseases?: string[]     // ICD-10 codes
  allergies?: string[]
  current_drugs?: string[]
  is_pregnant?: boolean
  assessment_conclusion?: string  // Doctor's synthesis
}
```

### Response
```typescript
{
  suggestions: ValidatedSuggestion[]   // Ranked differentials
  red_flags: CDSSRedFlag[]             // Hardcoded vitals + LLM flags
  alerts: CDSSAlert[]                  // Actionable alerts
  processing_time_ms: number
  source: "ai" | "error"
  model_version: string                // "IDE-V2 (deepseek-reasoner)" or fallback
  validation_summary: ValidationSummary
  next_best_questions: string[]
}
```

---

## EMR — `/api/emr/`

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET/POST | `/api/emr/bridge` | EMR bridge queue management |
| GET | `/api/emr/bridge/[id]` | Status specific bridge item |
| POST | `/api/emr/transfer/run` | Jalankan auto-fill ePuskesmas (Playwright) |
| GET | `/api/emr/transfer/status` | Status transfer yang sedang berjalan |
| GET | `/api/emr/transfer/history` | Riwayat transfer |
| POST | `/api/emr/patient-sync` | Sinkronisasi data pasien |

---

## Intelligence Dashboard — `/api/dashboard/intelligence/`

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/dashboard/intelligence/encounters` | Daftar encounter aktif |
| GET | `/api/dashboard/intelligence/metrics` | Operational metrics |
| GET | `/api/dashboard/intelligence/observability` | Observability data (Langfuse/Sentry) |
| POST | `/api/dashboard/intelligence/alerts/acknowledge` | Acknowledge alert |
| POST | `/api/dashboard/intelligence/override` | Manual override intelligence event |

---

## Telemedicine — `/api/telemedicine/`

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET/POST | `/api/telemedicine/appointments` | List / buat appointment |
| GET/PUT/DELETE | `/api/telemedicine/appointments/[id]` | Detail / update appointment |
| POST | `/api/telemedicine/appointments/[id]/diagnosis` | Input diagnosis post-konsultasi |
| POST | `/api/telemedicine/appointments/[id]/prescription` | Input e-prescription |
| GET/PUT | `/api/telemedicine/doctor-status` | Status online dokter |
| GET | `/api/telemedicine/slots` | Slot waktu tersedia |
| POST | `/api/telemedicine/request` | Request konsultasi baru |
| POST | `/api/telemedicine/request/[id]/handled` | Tandai request handled |
| POST | `/api/telemedicine/token` | Generate LiveKit room token |
| GET | `/api/telemedicine/join/[token]` | Join room via token |
| POST | `/api/consult` | Submit konsultasi (dari pasien) |
| POST | `/api/consult/accept` | Terima konsultasi |
| POST | `/api/consult/transfer-to-emr` | Transfer hasil konsultasi ke EMR |

---

## ICD-10 — `/api/icdx/`

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/icdx/lookup` | Lookup ICD-10 code atau nama diagnosis |

---

## Report — `/api/report/`

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET/POST | `/api/report` | List / buat report |
| POST | `/api/report/clinical` | Buat clinical report |
| GET | `/api/report/clinical/[id]/pdf` | Download report PDF |
| POST | `/api/report/automation/run` | Jalankan LB1 report automation |
| GET | `/api/report/automation/status` | Status automation berjalan |
| POST | `/api/report/automation/preflight` | Preflight check sebelum run |
| GET | `/api/report/automation/history` | Riwayat automation |
| GET | `/api/report/files` | Daftar file report |
| GET | `/api/report/files/download` | Download file report |

---

## Admin — `/api/admin/`

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/admin/overview` | Overview statistik admin |
| GET/POST | `/api/admin/users` | List / manage crew users |
| GET/PUT | `/api/admin/users/[username]/profile` | Edit profil user |
| POST | `/api/admin/users/[username]/deactivate` | Deactivate user |
| POST | `/api/admin/users/[username]/reactivate` | Reactivate user |
| POST | `/api/admin/users/[username]/reset-password` | Reset password |
| GET | `/api/admin/users/[username]/logbook` | Logbook aktivitas user |
| GET/POST | `/api/admin/registrations` | Daftar registrasi pending |
| POST | `/api/admin/registrations/[id]/approve` | Approve registrasi |
| POST | `/api/admin/registrations/[id]/reject` | Reject registrasi |
| GET/POST | `/api/admin/notam` | NOTAM (Notice to All Members) |
| GET/PUT/DELETE | `/api/admin/notam/[id]` | CRUD NOTAM |
| GET/POST | `/api/admin/institutions` | Manage institutions |
| GET/POST | `/api/admin/dev-updates` | Dev updates |

---

## Socket.IO Events — Namespace `/` (Crew)

| Event | Arah | Deskripsi |
|-------|------|-----------|
| `user:join` | Client → Server | Register presence crew |
| `users:online` | Server → Client | Broadcast daftar user online |
| `emr:triage-send` | Client → Server | Kirim data triage ke dokter target |
| `emr:triage-receive` | Server → Client | Terima data triage |
| `room:join` | Client → Server | Join chat room |
| `message:send` | Client → Server | Kirim pesan chat |
| `message:receive` | Server → Client | Terima pesan chat |
| `typing:start/stop` | Client ↔ Server | Indikator mengetik |
| `voice:start` | Client → Server | Mulai sesi Audrey |
| `voice:audio_chunk` | Client → Server | Stream audio PCM ke Gemini |
| `voice:ptt_start` | Client → Server | PTT: dokter mulai bicara |
| `voice:end_turn` | Client → Server | PTT: dokter selesai bicara |
| `voice:interrupt` | Client → Server | Interrupt Audrey |
| `voice:stop` | Client → Server | Stop sesi Audrey |
| `voice:ready` | Server → Client | Gemini Live connected |
| `voice:audio` | Server → Client | Stream audio response Audrey |
| `voice:text` | Server → Client | Text response Audrey |
| `voice:user_text` | Server → Client | Transkrip input dokter |
| `voice:turn_complete` | Server → Client | Audrey selesai turn |
| `voice:interrupted` | Server → Client | Turn interrupted |
| `voice:error` | Server → Client | Error Gemini Live |
| `voice:closed` | Server → Client | Session closed |

---

## Socket.IO Events — Namespace `/intelligence`

| Event | Arah | Deskripsi |
|-------|------|-----------|
| `encounter:updated` | Server → Client | Update encounter pasien |
| `alert:critical` | Server → Client | Alert klinis kritis |
| `eklaim:status-changed` | Server → Client | Status e-klaim berubah |
| `cdss:suggestion-ready` | Server → Client | CDSS suggestion baru |

---

<sub>Architected and built by Claudesy — 2026 · Sentra Healthcare Artificial Intelligence</sub>
