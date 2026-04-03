# README_ANALYSIS.md

## Analisis Statis Repository — `primary-healthcare/dashboard`

> Status: **static analysis only**
> 
> Fokus utama: **arsitektur repo, autentikasi/otorisasi/validasi/security gates, CDSS/diagnosa, telemedicine public join flow, consult → EMR bridge, skema data/migrasi, dan artefak testing**.
> 
> Catatan scope: **flow registrasi tidak dijadikan section utama**, tetapi tetap disebut ketika mempengaruhi gate akses atau admin review.

---

## 1. Scope, metode, dan asumsi

### 1.1 Scope aktif

Dokumen ini ditulis berdasarkan **inspeksi source code dan dokumentasi repository saja**, tanpa menjalankan aplikasi, test suite, migration, atau dependency install. Karena itu, semua kesimpulan di bawah adalah **evidence from static source**, bukan hasil observasi runtime.

### 1.2 Metode

Analisis ini menggunakan pembacaan langsung terhadap file aplikasi, dokumentasi internal, Prisma schema/migration, dan test scripts, terutama pada area berikut:

- stack, scripts, dan dependensi inti di `package.json` (`package.json:8-29`, `package.json:30-62`)
- shell aplikasi dan gate global di `src/app/layout.tsx` (`src/app/layout.tsx:25-49`)
- gate akses UI di `src/components/CrewAccessGate.tsx` (`src/components/CrewAccessGate.tsx:25-36`, `src/components/CrewAccessGate.tsx:165-219`, `src/components/CrewAccessGate.tsx:221-316`)
- auth server-side di `src/lib/server/crew-access-auth.ts` (`src/lib/server/crew-access-auth.ts:59-63`, `src/lib/server/crew-access-auth.ts:201-217`, `src/lib/server/crew-access-auth.ts:400-485`)
- custom server + Socket.IO di `server.ts` (`server.ts:55-102`, `server.ts:145-180`)
- CDSS parser/engine/workflow/routes (`src/lib/cdss/diagnose-parser.ts:7-58`, `src/lib/cdss/engine.ts:159-309`, `src/lib/cdss/engine.ts:625-864`, `src/lib/cdss/workflow.ts:36-227`, `src/app/api/cdss/diagnose/route.ts:16-92`)
- telemedicine routes/UI (`src/app/api/telemedicine/appointments/route.ts:63-143`, `src/app/api/telemedicine/join/[token]/route.ts:14-179`, `src/app/join/[token]/page.tsx:4-8`, `src/app/join/[token]/page.tsx:57-103`, `src/app/api/telemedicine/token/route.ts:19-179`)
- consult flow (`src/app/api/consult/route.ts:17-111`, `src/app/api/consult/accept/route.ts:15-68`, `src/app/api/consult/transfer-to-emr/route.ts:15-83`)
- Prisma schema/migrations (`prisma/schema.prisma:41-100`, `prisma/schema.prisma:227-265`, `prisma/schema.prisma:280-350`, `prisma/schema.prisma:408-423`, `prisma/migrations/20260303_add_patient_phone_join_token/migration.sql:1-6`, `prisma/migrations/20260305_add_cdss_audit_logs/migration.sql:1-20`, `prisma/migrations/20260316_add_consult_logs/migration.sql:1-33`)
- test runners dan test scripts (`scripts/test-suite.ts:8-54`, `scripts/test-auth-hardening.ts:82-130`, `scripts/test-auth-hardening.ts:193-271`, `scripts/test-auth-hardening.ts:354-366`, `docs/TESTING.md:8-69`, `docs/TESTING.md:114-123`)

### 1.3 Asumsi eksplisit

1. Jika dokumentasi menyatakan sesuatu tetapi implementasi yang terbaca menunjukkan hal berbeda, dokumen ini mengutamakan **code evidence** dan menandai dokumentasi tersebut sebagai **doc-only claim** atau **discrepancy**.
2. Jika fitur disebut dalam docs tetapi **tidak ditemukan evidence implementasinya**, statusnya ditulis sebagai **tidak tersedia / no evidence found in scanned source**.
3. Karena ini static-only, dokumen ini **tidak menyimpulkan** bahwa suatu mekanisme “pasti bekerja di production”; yang dapat disimpulkan hanya bahwa mekanisme tersebut **diimplementasikan di source** atau **tidak terlihat di source yang dianalisis**.

---

## 2. Ringkasan eksekutif

Repository ini adalah aplikasi **Next.js App Router** dengan **custom Node server** yang menambahkan **Socket.IO**, **Gemini Live voice proxy**, dan integrasi namespace realtime untuk dashboard intelligence. Jalur start/dev memang tidak memakai `next start` biasa; server dijalankan dengan `tsx --conditions react-server server.ts` (`package.json:8-23`, `ARCHITECTURE.md:22-33`, `server.ts:46-55`).

Di level akses, aplikasi memakai **custom cookie-based auth**, bukan NextAuth. Session disign dengan **HMAC**, password di-hash dengan **scrypt**, cookie diberi `httpOnly`, `sameSite: 'lax'`, `secure` hanya di production, dan TTL sesi default adalah **12 jam** (`src/lib/crew-access.ts:108-110`, `src/lib/server/crew-access-auth.ts:59-63`, `src/lib/server/crew-access-auth.ts:375-485`, `SECURITY.md:16-21`). Hampir seluruh shell aplikasi dibungkus `CrewAccessGate`, tetapi route `/join/*` sengaja dibypass agar pasien bisa masuk ke telemedicine tanpa login crew (`src/app/layout.tsx:30-45`, `src/components/CrewAccessGate.tsx:25-36`, `src/components/CrewAccessGate.tsx:165-219`).

Fitur klinis paling matang di source yang dianalisis adalah **CDSS Iskandar Engine V2**, **telemedicine dengan join token publik**, dan **consult → EMR bridge**. CDSS memiliki parser validasi input, hardcoded vital red flags, NEWS2/early warning enrichment, retrieval hybrid, DeepSeek primary reasoning, Gemini fallback, audit workflow, dan feedback quality metrics (`src/lib/cdss/diagnose-parser.ts:7-58`, `src/lib/cdss/engine.ts:159-309`, `src/lib/cdss/engine.ts:625-864`, `src/lib/cdss/workflow.ts:53-227`, `src/app/api/cdss/diagnose/route.ts:16-92`). Telemedicine menggunakan **LiveKit token flow**, bukan WebRTC peer-to-peer mentah di route yang dianalisis, dan menyediakan patient join API publik berbasis `patientJoinToken` (`src/app/api/telemedicine/appointments/route.ts:91-143`, `src/app/api/telemedicine/join/[token]/route.ts:41-179`, `src/app/api/telemedicine/token/route.ts:72-179`, `prisma/schema.prisma:41-100`).

Temuan penting review: ada beberapa **ketidaksesuaian docs vs code**, khususnya terkait klaim “PHI tidak disimpan”, klaim bahwa `userId` audit di-hash penuh, klaim audit untuk `/api/auth/*`, dan dokumentasi health check `/api/health` yang implementasinya tidak ditemukan pada source yang discan (`docs/PRIVACY.md:8-10`, `docs/PRIVACY.md:34-38`, `docs/PRIVACY.md:65-78`, `SECURITY.md:28-33`, `src/lib/server/security-audit.ts:60-79`, `docs/DEPLOYMENT.md:100-104`).

---

## 3. Peta arsitektur repository

## 3.1 Stack utama

Stack inti yang terkonfirmasi di source/config:

- Next.js `16.1.6`, React `19.2.3`, TypeScript `5.9.3`, Prisma `6.16.1`, PostgreSQL adapter `@prisma/adapter-pg`, Socket.IO `4.8.3`, LiveKit SDK, Google Gemini SDK, dan Sentry (`package.json:30-62`, `ARCHITECTURE.md:10-24`).
- Entry dev/start memakai custom server, bukan runtime Next default (`package.json:8-23`, `ARCHITECTURE.md:22-33`).
- `next.config.ts` minimal, dan `reactStrictMode` dinonaktifkan menurut eksplorasi sebelumnya.

## 3.2 Aplikasi dibungkus global access gate

Root layout membungkus hampir seluruh aplikasi dengan `ThemeProvider` dan `CrewAccessGate`, lalu merender `AppNav`, `<main>`, dan `AppFooter`. Ini berarti **akses UI default adalah tertutup** kecuali ada pengecualian di gate (`src/app/layout.tsx:30-45`).

## 3.3 Custom server + Socket.IO

`server.ts` membangun HTTP server sendiri di atas handler Next, lalu membuat instance `SocketIOServer` dengan daftar CORS origin eksplisit. Namespace `/intelligence` dan namespace default sama-sama diproteksi oleh verifikasi cookie session melalui `getCrewSessionFromCookieHeader()` (`server.ts:46-102`).

Server juga mengontrol validasi realtime payload:

- batas panjang chat message: `5000` karakter (`server.ts:32`, `server.ts:153-180`)
- batas panjang room ID: `200` karakter (`server.ts:33`, `server.ts:145-151`)
- identity pengirim chat dan triage tidak dipercaya dari client payload; server menulis `senderId`, `senderName`, `id`, dan `time` sendiri (`server.ts:129-180`).

### Kesimpulan arsitektur

Arsitektur repo ini **bukan sekadar CRUD Next.js**. Ia memakai gabungan:

1. App Router untuk UI/API.
2. Custom server untuk socket/voice proxy.
3. Prisma/PostgreSQL untuk storage klinis dan audit.
4. LLM-backed CDSS.
5. LiveKit-backed telemedicine token orchestration.

Evidence dokumen arsitektur internal juga sejalan dengan pola besar tersebut, walau beberapa detail docs perlu dikoreksi pada level implementasi aktual (`ARCHITECTURE.md:10-24`, `ARCHITECTURE.md:34-71`, `ARCHITECTURE.md:109-146`).

---

## 4. Gate akses, autentikasi, otorisasi, validasi, dan security review

## 4.1 Gate akses UI

`CrewAccessGate` melakukan tiga hal penting:

1. mendefinisikan path publik `['/join']` (`src/components/CrewAccessGate.tsx:25-36`)
2. untuk path non-publik, melakukan pengecekan sesi ke `/api/auth/session` (`src/components/CrewAccessGate.tsx:165-195`)
3. menangani login ke `/api/auth/login` dan request akses/registrasi ke `/api/auth/register` (`src/components/CrewAccessGate.tsx:221-316`)

Implikasi penting:

- hampir semua UI membutuhkan crew session
- **pasien telemedicine** adalah pengecualian desain, karena `/join/*` dibuka publik
- login gate bersifat **client-side check + server-side API enforcement**, bukan hanya hidden navigation

## 4.2 Model session dan credential resolution

Konstanta auth utama:

- cookie name: `puskesmas_crew_session` (`src/lib/crew-access.ts:108-110`)
- TTL session: `60 * 60 * 12` detik = 12 jam (`src/lib/crew-access.ts:108-110`)
- profesi yang dipetakan ke role domain: Dokter, Dokter Gigi, Perawat, Bidan, Apoteker, Triage Officer (`src/lib/crew-access.ts:13-20`, `src/lib/crew-access.ts:42-54`)

Credential source order pada server:

1. `CREW_ACCESS_USERS_JSON` dari env
2. file runtime `runtime/crew-access-users.json`
3. fallback compiled defaults saat non-production (`src/lib/server/crew-access-auth.ts:201-217`)

Ini konsisten dengan docs security (`SECURITY.md:16-21`).

## 4.3 Password hashing, HMAC session signing, cookie options

Implementasi auth server-side memakai:

- `scrypt` dengan parameter `N=16384`, `r=8`, `p=1`, `keylen=64` (`src/lib/server/crew-access-auth.ts:59-63`)
- HMAC SHA-256 untuk signature payload session (`src/lib/server/crew-access-auth.ts:260-263`, `src/lib/server/crew-access-auth.ts:375-394`)
- cookie options: `httpOnly: true`, `sameSite: 'lax'`, `secure` hanya di production, `path: '/'`, `maxAge` = TTL session (`src/lib/server/crew-access-auth.ts:476-484`)

Verifikasi cookie session mencakup:

- token harus punya dua bagian `payload.signature`
- signature harus lolos `timingSafeEqual`
- payload version harus `v:1`
- session expiry harus belum lewat
- username harus masih ada di store user
- user berstatus `INACTIVE` ditolak (`src/lib/server/crew-access-auth.ts:400-441`)

## 4.4 Automation token fallback

`isCrewAuthorizedRequest()` tidak hanya menerima cookie session. Route server-side tertentu juga bisa lolos jika request membawa automation token yang cocok dengan `CREW_ACCESS_AUTOMATION_TOKEN` (`src/lib/server/crew-access-auth.ts:453-474`).

Ini berarti sebagian endpoint backend memiliki dua jalur auth:

- session cookie untuk manusia/crew
- bearer/header token untuk automation

## 4.5 API auth routes yang terkonfirmasi

### Login

`POST /api/auth/login`:

- mengambil IP via `getClientIp()`
- menegakkan login rate limit
- memverifikasi kredensial
- me-reset limiter saat sukses
- men-set session cookie pada response (`src/app/api/auth/login/route.ts:25-70`)

### Session

`GET /api/auth/session` mengembalikan identitas session aktif atau `401` jika tidak ada (`src/app/api/auth/session/route.ts:6-18`).

### Profile

`GET/PUT /api/auth/profile` mensyaratkan session valid sebelum load/update crew profile (`src/app/api/auth/profile/route.ts:9-49`).

### Logout

`POST /api/auth/logout` membersihkan cookie auth dengan `maxAge: 0` (`src/app/api/auth/logout/route.ts:6-15`).

## 4.6 Rate limiting yang terlihat di code

`src/lib/server/rate-limit.ts` menunjukkan in-memory limiter untuk:

- login: 5 request / 15 menit / IP (`src/lib/server/rate-limit.ts:40-44`)
- registrasi: 3 request / 1 jam / IP (`src/lib/server/rate-limit.ts:46-49`)
- IP diambil dari `x-forwarded-for`, fallback `x-real-ip`, fallback `unknown` (`src/lib/server/rate-limit.ts:51-55`)

Untuk telemedicine patient join, ada limiter terpisah di route publik:

- GET join info: per IP
- POST join token: per kombinasi token + IP
- limit 10 per 60 detik (`src/app/api/telemedicine/join/[token]/route.ts:14-29`, `src/app/api/telemedicine/join/[token]/route.ts:48-58`, `src/app/api/telemedicine/join/[token]/route.ts:104-114`)

## 4.7 Socket auth dan server-side identity

Baik namespace default maupun `/intelligence` mewajibkan cookie session valid sebelum socket connection diterima (`server.ts:77-102`).

Setelah konek, server:

- memakai session server-verified untuk presence (`server.ts:107-127`)
- men-stamp triage relay dengan `_senderId` dan `_senderName` dari session (`server.ts:129-143`)
- membuat chat message ID dan timestamp sendiri (`server.ts:153-180`)

Ini mendukung klaim security docs bahwa identity realtime tidak dipercaya dari client (`SECURITY.md:52-57`, `server.ts:153-180`).

## 4.8 Security audit logging

`writeSecurityAuditLog()`:

- hanya aktif jika `DATABASE_URL` ada
- mengambil delegate `prisma.cDSSAuditLog`
- membuat `sessionHash` dan `inputHash` berbasis SHA-256
- menyimpan `endpoint`, `result`, dan metadata audit (`src/lib/server/security-audit.ts:42-85`)

### Temuan penting

Walau docs menyatakan `userId` di-hash dan PHI tidak masuk metadata (`SECURITY.md:28-33`, `docs/PRIVACY.md:34-38`), implementasi aktual masih memasukkan `userId`, `role`, dan `ip` mentah ke `metadata` (`src/lib/server/security-audit.ts:60-79`).

Jadi, yang ter-hash di implementasi ini adalah:

- `sessionHash`
- `inputHash`

Tetapi **bukan berarti seluruh identitas audit tersimpan hanya dalam bentuk hash**.

## 4.9 Otorisasi / RBAC

### Yang benar-benar terlihat di code

- CDSS `diagnose` mensyaratkan request authorized, tetapi comment route masih menyatakan semua authenticated clinical staff boleh akses; tidak ada matrix role eksplisit di route tersebut (`src/app/api/cdss/diagnose/route.ts:20-31`, `SECURITY.md:23-26`, `SECURITY.md:77-80`).
- Telemedicine staff room token memakai helper `hasTelemedicineAccess(...)`; jika gagal, route menulis audit `TOKEN_REQUEST_DENIED` dan return `403` (`src/app/api/telemedicine/token/route.ts:72-98`).
- Admin registration routes menurut eksplorasi sebelumnya memang dibatasi ke set role tertentu, namun itu bukan fokus utama dokumen ini.

### Kesimpulan RBAC

RBAC di repository ini **bersifat parsial dan endpoint-specific**:

- ada RBAC eksplisit pada telemedicine room token
- ada TODO / gap pada CDSS diagnose backend
- ada client-side gate juga pada admin UI menurut eksplorasi sebelumnya

## 4.10 CSRF, CORS HTTP, dan hardening lain

### CORS

Evidence CORS yang eksplisit ditemukan pada **Socket.IO server**, bukan pada seluruh HTTP API route. Origin whitelist production terlihat di `server.ts` dan sejalan dengan docs (`server.ts:55-69`, `SECURITY.md:58-65`, `ARCHITECTURE.md:40-45`).

### CSRF

**No evidence found** untuk mekanisme CSRF token/middleware khusus pada route auth/CDSS/telemedicine yang dianalisis. Cookie memakai `sameSite: 'lax'`, tetapi tidak terlihat anti-CSRF token dedicated pada source yang discan (`src/lib/server/crew-access-auth.ts:476-484`, `src/app/api/auth/login/route.ts:25-83`, `src/app/api/auth/profile/route.ts:9-49`, `src/app/api/cdss/diagnose/route.ts:16-92`).

### Rate limit persistence

Limiter yang terlihat memakai **in-memory Map**, jadi dari static code saja tidak ada evidence distributed/shared limiter lintas instance (`src/lib/server/rate-limit.ts:9-37`, `src/app/api/telemedicine/join/[token]/route.ts:14-29`).

---

## 5. Diagnosa / CDSS end-to-end

## 5.1 Entry point route

`POST /api/cdss/diagnose` melakukan alur berikut:

1. ambil IP dan session
2. tolak request unauthorized dengan `401` + security audit
3. parse JSON body
4. validasi body via `parseDiagnoseRequestBody()`
5. jalankan `runDiagnosisEngine()`
6. tulis audit CDSS
7. tulis security audit
8. return hasil engine (`src/app/api/cdss/diagnose/route.ts:16-92`)

## 5.2 Validasi input request

Parser request mewajibkan:

- `keluhan_utama` string non-kosong
- `usia` angka 1–150
- `jenis_kelamin` harus `'L'` atau `'P'`
- pasien laki-laki tidak boleh `is_pregnant: true`
- `session_id` bersifat opsional (`src/lib/cdss/diagnose-parser.ts:7-58`)

Ini sesuai docs bahwa request body CDSS memang divalidasi ketat, walau code adalah sumber yang lebih otoritatif daripada docs (`SECURITY.md:52-57`, `docs/API.md:19-52`).

## 5.3 Pipeline engine yang benar-benar terimplementasi

### 5.3.1 Hardcoded physiological safety net

Engine memulai dari `checkVitalRedFlags()` dan menandai kondisi-kondisi seperti:

- sistolik `>= 180` → Hipertensi Krisis
- sistolik `< 90` → Hipotensi / suspek syok
- diastolik `>= 120`
- SpO2 `< 90`
- heart rate `> 140` atau `< 45`
- suhu `>= 40` atau `< 35`
- respiratory rate `> 30` atau `< 8`
- AVPU/GCS consciousness impairment
- pain score `>= 8` (`src/lib/cdss/engine.ts:159-309`, `docs/CLINICAL_LOGIC.md:13-31`)

### 5.3.2 Composite + hybrid enrichment

Sesudah hardcoded flags, engine juga menjalankan:

- NEWS2 scoring (`src/lib/cdss/engine.ts:637-645`)
- disease-specific early warning patterns (`src/lib/cdss/engine.ts:646-648`)
- keyword pre-filter + optional embedding retrieval (`src/lib/cdss/engine.ts:663-679`)

Jika embedding belum siap, engine tetap berjalan dan menambahkan warning retrieval (`src/lib/cdss/engine.ts:666-676`).

### 5.3.3 LLM reasoning path

Primary reasoner:

- DeepSeek `deepseek-reasoner`
- temperature `0.2`
- timeout `30 detik`
- circuit breaker setelah 3 kegagalan beruntun (`src/lib/cdss/engine.ts:31-54`, `src/lib/cdss/engine.ts:78-133`)

Fallback reasoner:

- Gemini `gemini-2.5-flash-lite`
- JSON structured output via schema (`src/lib/cdss/engine.ts:311-421`, `src/lib/cdss/engine.ts:688-733`)

Jika **DeepSeek dan Gemini sama-sama tidak tersedia**, engine return safe fallback dengan `source: 'error'`, suggestion kosong, red flags yang masih bisa dihitung, dan warning eksplisit (`src/lib/cdss/engine.ts:575-621`, `src/lib/cdss/engine.ts:650-661`).

### 5.3.4 Validation + hybrid decisioning

Sesudah LLM response di-map, engine:

- memfilter suggestion tanpa core fields
- memvalidasi suggestion terhadap KB lokal
- menjalankan `applyHybridDecisioning()`
- membangun `validation_summary`
- menggabungkan red flags dari vitals, early warning, NEWS2, dan LLM (`src/lib/cdss/engine.ts:738-846`)

Output akhir mencakup:

- `suggestions`
- `red_flags`
- `alerts`
- `processing_time_ms`
- `source`
- `model_version`
- `validation_summary`
- `next_best_questions` (`src/lib/cdss/engine.ts:826-846`, `docs/API.md:38-52`)

## 5.4 Audit dan quality workflow CDSS

`src/lib/cdss/workflow.ts` menunjukkan bahwa:

- `sessionId` di-hash jadi `sessionHash` memakai SHA-256 (`src/lib/cdss/workflow.ts:36-39`)
- audit result CDSS ditulis ke `cDSSAuditLog` (`src/lib/cdss/workflow.ts:53-82`)
- outcome feedback ditulis ke `cDSSOutcomeFeedback` (`src/lib/cdss/workflow.ts:84-120`)
- quality dashboard mengagregasi total request, selection rate, red flag rate, unverified ICD average, latency P95, override rate, concordance rate, dan must-not-miss count (`src/lib/cdss/workflow.ts:122-227`)

## 5.5 Endpoint workflow lanjutan CDSS

Selain diagnose route, masih ada endpoint pendukung:

- `red-flag-ack` untuk acknowledge red flags (`src/app/api/cdss/red-flag-ack/route.ts:13-61`)
- `suggestion-selected` untuk pencatatan ICD terpilih + review reason bila perlu (`src/app/api/cdss/suggestion-selected/route.ts:17-76`)
- `outcome-feedback` untuk membandingkan `selected_icd` vs `final_icd` (`src/app/api/cdss/outcome-feedback/route.ts:17-75`)
- `quality-dashboard` untuk metrik agregat dengan cap `days <= 90` (`src/app/api/cdss/quality-dashboard/route.ts:8-34`)

### Kesimpulan CDSS

CDSS di repo ini **bukan sekadar wrapper LLM**. Ia sudah memiliki:

- parser validasi request
- deterministic safety checks
- hybrid retrieval + hybrid decisioning
- audit trail
- outcome feedback
- quality metrics

Gap utama yang masih terlihat justru di sisi **RBAC backend diagnose** dan **klaritas dokumentasi privacy/audit**.

---

## 6. Telemedicine: appointment, public join token, dan staff room token

## 6.1 Pembuatan appointment

`POST /api/telemedicine/appointments`:

- mensyaratkan crew session (`src/app/api/telemedicine/appointments/route.ts:63-76`)
- memvalidasi input dengan Zod (`src/app/api/telemedicine/appointments/route.ts:11-22`, `src/app/api/telemedicine/appointments/route.ts:77-89`)
- membuat `patientJoinToken = crypto.randomUUID()` (`src/app/api/telemedicine/appointments/route.ts:91-105`)
- menyimpan `patientPhone`, `patientJoinToken`, dan `createdByStaffId` (`src/app/api/telemedicine/appointments/route.ts:96-105`)
- secara opsional mengirim WhatsApp notification berisi URL `/join/${patientJoinToken}` (`src/app/api/telemedicine/appointments/route.ts:118-134`)

## 6.2 Public patient join flow

Ada dua lapisan evidence bahwa pasien dapat join tanpa login crew:

1. UI gate membypass `/join/*` (`src/components/CrewAccessGate.tsx:25-36`, `src/components/CrewAccessGate.tsx:165-219`)
2. route dan page join pasien sendiri memang didesain publik (`src/app/api/telemedicine/join/[token]/route.ts:1-7`, `src/app/join/[token]/page.tsx:4-8`)

### GET `/api/telemedicine/join/[token]`

Route ini:

- tidak memerlukan auth crew
- rate limited per IP
- mencari appointment berdasarkan `patientJoinToken`
- mengembalikan info jadwal/room join (`src/app/api/telemedicine/join/[token]/route.ts:41-95`)

### POST `/api/telemedicine/join/[token]`

Route ini:

- rate limited per token + IP
- menerima `displayName`, dipotong maksimum 50 karakter
- menolak appointment `CANCELLED` atau `NO_SHOW`
- mengecek LiveKit config
- membuat JWT LiveKit untuk participant identity `patient-${token.slice(0, 8)}` (`src/app/api/telemedicine/join/[token]/route.ts:97-179`)

### Halaman `/join/[token]`

Page publik pasien melakukan:

1. fetch join info saat load (`src/app/join/[token]/page.tsx:57-74`)
2. meminta nama pasien
3. POST ke join API untuk token room (`src/app/join/[token]/page.tsx:76-103`)
4. connect ke LiveKit room dan enable camera/mic (`src/app/join/[token]/page.tsx:91-103`)

## 6.3 Staff room token / telemedicine RBAC

`POST /api/telemedicine/token` adalah jalur **staff-side** untuk masuk ke room:

- wajib session crew (`src/app/api/telemedicine/token/route.ts:19-30`)
- validasi body via Zod (`src/app/api/telemedicine/token/route.ts:14-17`, `src/app/api/telemedicine/token/route.ts:43-53`)
- cek appointment existence + status (`src/app/api/telemedicine/token/route.ts:57-70`)
- cek RBAC via `hasTelemedicineAccess()` (`src/app/api/telemedicine/token/route.ts:72-78`)
- tulis audit deny bila forbidden (`src/app/api/telemedicine/token/route.ts:79-98`)
- memastikan room LiveKit ada, update appointment jika room name belum ada, upsert session, upsert participant, lalu set appointment menjadi `IN_PROGRESS` bila sebelumnya `PENDING`/`CONFIRMED` (`src/app/api/telemedicine/token/route.ts:100-155`)
- generate LiveKit JWT untuk staff participant (`src/app/api/telemedicine/token/route.ts:157-179`)

### Kesimpulan telemedicine

Implementasi telemedicine yang terlihat di source adalah **LiveKit-centered**, dengan:

- appointment storage di DB
- public patient join token
- staff token issuance dengan RBAC
- session/participant persistence

Ini **lebih sesuai disebut tokenized LiveKit telemedicine flow** daripada raw Socket.IO signaling-only telemedicine.

---

## 7. Consult intake → accept → transfer-to-EMR

## 7.1 Consult intake

`POST /api/consult`:

- mensyaratkan request authorized (`src/app/api/consult/route.ts:17-23`)
- memerlukan minimal `patient.name`, `keluhan_utama`, `target_doctor_id` (`src/app/api/consult/route.ts:25-44`)
- meng-emit assist consult ke socket bridge (`src/app/api/consult/route.ts:46-59`)
- menulis `ConsultLog` ke database termasuk `patientName`, `patientRm`, `patientAge`, `patientGender`, complaint, risk factors, dll (`src/app/api/consult/route.ts:61-81`)
- menulis `CONSULT_RECEIVED` ke clinical case audit trail (`src/app/api/consult/route.ts:87-105`)

## 7.2 Accept consult

`POST /api/consult/accept`:

- mensyaratkan session crew (`src/app/api/consult/accept/route.ts:15-18`)
- memvalidasi body via `validateAcceptBody()` (`src/app/api/consult/accept/route.ts:22-29`)
- menyimpan accepted consult ke memory/store bridge (`src/app/api/consult/accept/route.ts:30-37`)
- menulis audit event `CONSULT_ACCEPTED` (`src/app/api/consult/accept/route.ts:39-52`)
- mengubah `consultLog.status` menjadi `accepted` (`src/app/api/consult/accept/route.ts:54-63`)

## 7.3 Transfer ke EMR

`POST /api/consult/transfer-to-emr`:

- mensyaratkan session crew (`src/app/api/consult/transfer-to-emr/route.ts:15-18`)
- memvalidasi body via `validateTransferBody()` (`src/app/api/consult/transfer-to-emr/route.ts:22-29`)
- mengambil accepted consult dari store bridge (`src/app/api/consult/transfer-to-emr/route.ts:32-39`)
- membuat bridge entry EMR (`src/app/api/consult/transfer-to-emr/route.ts:41-47`)
- menulis audit event `CONSULT_TRANSFERRED_TO_EMR` (`src/app/api/consult/transfer-to-emr/route.ts:49-63`)
- mengubah `consultLog.status` menjadi `transferred` dan menyimpan `bridgeEntryId` (`src/app/api/consult/transfer-to-emr/route.ts:65-74`)

### Kesimpulan consult flow

Consult flow di repo ini bukan hanya realtime relay; ia juga punya:

- persistence `ConsultLog`
- audit event klinis
- tahapan status `received → accepted → transferred`
- bridge ke engine EMR

---

## 8. Skema data dan migrasi yang relevan

## 8.1 Telemedicine models

`TelemedicineAppointment` menyimpan field penting berikut:

- `patientId`
- `patientPhone`
- `patientJoinToken @unique`
- `doctorId`
- `createdByStaffId`
- jadwal/status
- hasil konsultasi
- `livekitRoomName` (`prisma/schema.prisma:41-100`)

`TelemedicineSession` dan `TelemedicineParticipant` memodelkan room/session dan siapa yang join (`prisma/schema.prisma:102-136`).

Migrasi `20260303_add_patient_phone_join_token` menegaskan bahwa `patientPhone` dan `patientJoinToken` memang ditambahkan ke storage persisten, plus unique index untuk token (`prisma/migrations/20260303_add_patient_phone_join_token/migration.sql:1-6`).

## 8.2 CDSS audit models

`CDSSAuditLog` menyimpan:

- `sessionHash`
- `action`
- `inputHash`
- `outputSummary`
- `modelVersion`
- `latencyMs`
- `validationStatus`
- `metadata` (`prisma/schema.prisma:227-244`)

`CDSSOutcomeFeedback` menyimpan selected vs final ICD, override reason, outcome confirmation, dan metadata (`prisma/schema.prisma:246-265`).

Migrasi audit CDSS membuat tabel dan index yang sesuai (`prisma/migrations/20260305_add_cdss_audit_logs/migration.sql:1-20`).

## 8.3 Clinical report dan consult persistence

`ClinicalReport` masih menyimpan patient-linked fields seperti `patientMrn`, `patientName`, `sourceAppointmentId`, dan `sourceConsultId` (`prisma/schema.prisma:280-308`).

`ConsultLog` menyimpan langsung:

- `patientName`
- `patientRm`
- `patientAge`
- `patientGender`
- `keluhanUtama`
- risk factors / chronic diseases / anthropometrics
- sender / target doctor / acceptedBy / bridge metadata (`prisma/schema.prisma:310-350`)

Migrasi consult log memperlihatkan kolom-kolom patient dan status tersebut di level SQL nyata (`prisma/migrations/20260316_add_consult_logs/migration.sql:1-33`).

## 8.4 Clinical case audit

Model `ClinicalCaseAuditEvent` disediakan untuk event trail lintas appointment/consult/report (`prisma/schema.prisma:408-423`). Ini konsisten dengan penggunaan pada flow consult yang dianalisis.

---

## 9. Testing dan artefak verifikasi

## 9.1 Orkestrasi test

`scripts/test-suite.ts` menjalankan tiga suite utama:

- `auth-hardening`
- `safety-net`
- `intelligence-route` (`scripts/test-suite.ts:8-54`)

Ini juga konsisten dengan `package.json` dan docs testing (`package.json:16-23`, `docs/TESTING.md:8-69`).

## 9.2 Auth hardening suite

`scripts/test-auth-hardening.ts` secara eksplisit menguji hal-hal seperti:

- login hashed password sukses (`scripts/test-auth-hardening.ts:82-97`)
- registration request mengembalikan `202` (`scripts/test-auth-hardening.ts:99-130`)
- anonymous profile request = `401` (`scripts/test-auth-hardening.ts:193-196`)
- anonymous diagnose request = `401` (`scripts/test-auth-hardening.ts:198-213`)
- anonymous voice token/TTS ditolak (`scripts/test-auth-hardening.ts:215-239`)
- authenticated voice token sukses `200` dan tidak membocorkan API key (`scripts/test-auth-hardening.ts:240-271`)
- authenticated TTS sukses return `audio/mpeg` (`scripts/test-auth-hardening.ts:354-366`)

## 9.3 CDSS safety-net suite

`scripts/test-cdss.ts` adalah suite besar yang dari static reading jelas mencakup:

- parser validation
- fallback CDSS saat API key tidak ada
- hybrid decisioning / KB validation
- route failure audit behavior
- workflow audit + quality dashboard
- telemedicine token auth `401` / RBAC `403` / success `200`

Evidence paling jelas terlihat dari struktur suite runner dan test descriptions di file tersebut (`scripts/test-suite.ts:8-54`, `scripts/test-cdss.ts:1-120`, `scripts/test-cdss.ts:300-841`).

## 9.4 Perintah verifikasi statis yang relevan

Dokumen/testing config menunjukkan command berikut sebagai baseline verifikasi manual di repo ini:

```bash
npm test
npm run test:auth-hardening
npm run test:cdss
npm run lint
npm run build
```

Evidence: `package.json:14-23`, `docs/TESTING.md:8-20`.

> Catatan: command di atas **tidak dijalankan** dalam task ini karena scope user adalah **static analysis only**.

---

## 10. Temuan review: discrepancy, risiko, dan no-evidence items

## 10.1 Privacy docs vs actual persistence

### Klaim docs

`docs/PRIVACY.md` menyatakan aplikasi tidak menyimpan data identitas pasien “di manapun — by architecture” (`docs/PRIVACY.md:8-10`).

### Evidence code/schema yang bertentangan

- `TelemedicineAppointment` menyimpan `patientPhone` dan `patientJoinToken` (`prisma/schema.prisma:45-49`)
- `ConsultLog` menyimpan `patientName`, `patientRm`, `patientAge`, `patientGender` (`prisma/schema.prisma:315-319`, `prisma/migrations/20260316_add_consult_logs/migration.sql:1-20`)
- `ClinicalReport` menyimpan `patientMrn` dan `patientName` (`prisma/schema.prisma:283-286`)
- route consult memang menulis patient data itu ke DB (`src/app/api/consult/route.ts:61-81`)

### Kesimpulan

Klaim “PHI tidak pernah disimpan” **tidak sesuai** dengan source yang dianalisis.

## 10.2 Security audit docs vs implementation

### Klaim docs

Docs menyebut `userId` di-hash SHA-256 sebelum disimpan dan PHI tidak masuk metadata (`SECURITY.md:28-33`, `docs/PRIVACY.md:34-38`).

### Evidence code

Implementasi audit memang membuat `sessionHash` dan `inputHash`, tetapi juga menaruh `userId`, `role`, dan `ip` mentah ke `metadata` (`src/lib/server/security-audit.ts:60-79`).

### Kesimpulan

Perlu koreksi docs atau koreksi implementasi agar keduanya konsisten.

## 10.3 Klaim audit untuk `/api/auth/*`

`SECURITY.md` menyatakan request ke `/api/cdss/*` dan `/api/auth/*` dicatat ke database (`SECURITY.md:28-31`).

Namun pada auth routes yang dibaca langsung:

- login (`src/app/api/auth/login/route.ts:25-83`)
- session (`src/app/api/auth/session/route.ts:6-18`)
- profile (`src/app/api/auth/profile/route.ts:9-49`)
- logout (`src/app/api/auth/logout/route.ts:6-15`)

tidak terlihat pemanggilan `writeSecurityAuditLog()`.

Jadi untuk area auth, status yang paling akurat adalah:

- **doc claims broader coverage**
- **implementation evidence not found in explored auth route handlers**

## 10.4 Health check route terdokumentasi, implementasi tidak ditemukan

`docs/DEPLOYMENT.md` mendokumentasikan `GET /api/health → { status: "ok" }` (`docs/DEPLOYMENT.md:100-104`).

Namun selama static scan di `src/app/api`, **tidak ditemukan implementation evidence** untuk route tersebut.

Status: **documented, but no evidence found in scanned source tree**.

## 10.5 `/pasien` bukan patient records page aktif

README/project structure dan deskripsi produk memberi kesan ada patient records page, tetapi implementasi `src/app/pasien/page.tsx` hanya melakukan redirect ke `/` (`src/app/pasien/page.tsx:1-12`).

Status: **no evidence that `/pasien` is an implemented patient-records UI in current source**.

## 10.6 README telemedicine docs vs current implementation

README menggambarkan telemedicine sebagai **WebRTC peer-to-peer + Socket.IO signaling + STUN/TURN fallback** (`README.md:69-71`).

Sementara code yang dianalisis memperlihatkan:

- issuance token via LiveKit (`src/app/api/telemedicine/token/route.ts:157-179`)
- patient public join via LiveKit token (`src/app/api/telemedicine/join/[token]/route.ts:152-179`)
- UI pasien connect ke `Room` LiveKit (`src/app/join/[token]/page.tsx:91-103`)

Status: **README telemedicine section tidak lagi sepenuhnya merepresentasikan implementasi aktual**.

---

## 11. Ringkasan “apa yang ada” vs “apa yang belum terbukti”

| Area | Tersedia di code | Catatan |
|---|---|---|
| Custom server + Socket.IO | Ya | `server.ts` aktif memegang CORS, socket auth, chat, voice proxy |
| Cookie-based HMAC auth | Ya | Session signed, TTL 12 jam, scrypt password hashing |
| UI access gate | Ya | Global gate aktif, `/join/*` dikecualikan |
| Login rate limit | Ya | In-memory, 5/15m/IP |
| Registration flow | Ya, tapi bukan fokus | UI dan backend ada, tidak dibahas mendalam di dokumen ini |
| CDSS parser + engine + audit + feedback | Ya | Salah satu subsystem paling matang |
| Telemedicine public patient join | Ya | Token publik + LiveKit |
| Telemedicine staff RBAC | Ya | Ada deny-audit dan `403` |
| Consult → accept → transfer-to-EMR | Ya | Ada persistence + audit trail |
| PHI-free architecture | Tidak terbukti | Code justru menyimpan beberapa patient-identifying fields |
| Full `/api/auth/*` security audit coverage | Tidak terbukti | Docs claim lebih luas dari code yang dibaca |
| `/api/health` route | Tidak ditemukan | Doc ada, implementation evidence tidak ditemukan |
| Dedicated CSRF protection | Tidak ditemukan | No evidence pada route yang dianalisis |

---

## 12. Rekomendasi dokumentasi dan engineering follow-up

## 12.1 Dokumentasi yang sebaiknya segera dikoreksi

1. **`docs/PRIVACY.md`**
   - ganti klaim absolut “PHI tidak disimpan”
   - jelaskan mana data yang benar-benar disimpan: patient phone, join token, patient name/MRN pada consult/report

2. **`SECURITY.md`**
   - perjelas bahwa audit log saat ini menyimpan `userId`/`role`/`ip` di metadata, kecuali implementasi diubah
   - perjelas bahwa audit coverage untuk `/api/auth/*` belum terbukti di route yang dianalisis

3. **`docs/DEPLOYMENT.md`**
   - hapus/revisi health check doc jika route memang belum ada

4. **`README.md`**
   - revisi telemedicine section dari WebRTC peer-to-peer generic menjadi implementasi LiveKit aktual
   - revisi narasi `/pasien` bila memang bukan page aktif

## 12.2 Perbaikan engineering yang paling bernilai

1. Tambahkan **RBAC backend eksplisit** untuk `/api/cdss/diagnose`.
2. Putuskan apakah `writeSecurityAuditLog()` harus:
   - benar-benar meng-hash `userId` sebelum persist, atau
   - docs diperbarui agar sesuai implementasi aktual.
3. Tambahkan **health check route** jika memang dibutuhkan deployment docs.
4. Jika app ini dipakai lintas origin/sensitive cookie workflows, pertimbangkan **anti-CSRF mechanism** yang lebih eksplisit.

---

## 13. Checklist verifikasi manual (tidak dijalankan di task ini)

Checklist berikut disusun dari script/docs yang ada, tetapi **belum dieksekusi**:

- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run test:auth-hardening`
- [ ] `npm run test:cdss`
- [ ] `npm run build`
- [ ] verifikasi bahwa `/api/health` memang ada atau perbarui dokumen deployment
- [ ] audit ulang docs privacy/security agar sinkron dengan schema dan route saat ini

Evidence sumber command dan target coverage: `package.json:14-28`, `docs/TESTING.md:8-20`, `docs/TESTING.md:114-123`.

---

## 14. Penutup

Secara keseluruhan, repository ini menunjukkan implementasi yang cukup kuat pada tiga area inti: **custom crew access**, **CDSS hybrid**, dan **telemedicine public join + staff token flow**. Dari static source, CDSS dan telemedicine terlihat jauh lebih konkret daripada sekadar prototype, karena keduanya sudah punya validation, persistence, audit, dan test artifacts (`src/lib/server/crew-access-auth.ts:59-485`, `src/lib/cdss/engine.ts:625-864`, `src/app/api/telemedicine/token/route.ts:19-179`).

Masalah utamanya bukan ketiadaan fitur, melainkan **ketidaksinkronan dokumentasi terhadap implementasi aktual**, terutama pada area privacy, audit semantics, telemedicine description, dan health check. Karena itu, langkah paling mendesak setelah dokumen ini adalah **documentation reconciliation** sebelum perubahan perilaku code yang lebih besar dilakukan.