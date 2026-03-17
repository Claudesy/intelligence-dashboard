# File: DECISION_LOG.md | App: primary-healthcare | Repo: abyss-v3 | Updated: 2026-03-16
# Architected and built by Claudesy.

# Decision Log — primary-healthcare (AADI)

---

## [2026-03-16] — IDE V1 → V2: Keyword Matcher → LLM-First
**Status:** Decided
**Decider:** Chief + Claudesy
**Konteks:** IDE V1 menggunakan keyword/IDF matcher murni — tidak akurat untuk gejala ambigu
**Keputusan:** Ganti ke LLM-first dengan DeepSeek Reasoner sebagai primary reasoner
**Rationale:** LLM memahami konteks klinis, bukan hanya keyword overlap. DeepSeek Reasoner dipilih karena kemampuan chain-of-thought medis. Gemini 2.5 Flash-Lite sebagai fallback karena structured schema output
**Consequences:** API cost meningkat tapi akurasi differential jauh lebih baik. Latency +2-5 detik tapi acceptable untuk konteks klinis

---

## [2026-03-16] — Hybrid Retrieval: Keyword + Semantic Embedding
**Status:** Decided
**Decider:** Claudesy (implemented)
**Konteks:** Keyword-only retrieval melewatkan penyakit dengan nama tidak umum
**Keputusan:** Merge keyword pre-filter + semantic embedding, max 18 kandidat ke LLM
**Rationale:** Semantic embedding menangkap sinonim medis. Keyword filter cepat sebagai baseline. Merge + deduplicate memberi LLM konteks paling relevan
**Consequences:** Embedding API opsional — jika tidak tersedia, fallback ke keyword saja dengan warning

---

## [2026-03-16] — PTT Mode untuk Audrey (VAD Dimatikan)
**Status:** Decided
**Decider:** Chief
**Konteks:** VAD (Voice Activity Detection) otomatis menyebabkan false triggers di lingkungan klinik yang ramai
**Keputusan:** PTT mode — `automaticActivityDetection: { disabled: true }`, dokter kontrol via `activityStart`/`activityEnd`
**Rationale:** Lingkungan Puskesmas: banyak suara latar, pasien berbicara, alat medis. PTT memberi kontrol penuh ke dokter
**Consequences:** UX membutuhkan tombol PTT di UI, tapi jauh lebih reliable di kondisi nyata

---

## [2026-03-15] — Custom Server (tsx server.ts) vs next start
**Status:** Decided
**Decider:** Chief
**Konteks:** Perlu Socket.IO untuk realtime features (EMR, chat, Audrey, Intelligence Dashboard)
**Keputusan:** Custom HTTP server + Socket.IO digabung dengan Next.js handler
**Rationale:** Next.js App Router tidak support WebSocket native. Custom server dengan `tsx --conditions react-server server.ts` memungkinkan Socket.IO + Next.js dalam satu proses
**Consequences:** `reactStrictMode: false` diperlukan (double-render merusak Socket.IO). Dev command: `tsx server.ts`, bukan `next dev`

---

## [2026-03-15] — HMAC Cookie vs NextAuth
**Status:** Decided
**Decider:** Chief
**Konteks:** NextAuth terlalu berat untuk crew internal, membutuhkan OAuth/DB adapter kompleks
**Keputusan:** Custom HMAC-signed cookie session, scrypt password hash
**Rationale:** Crew Puskesmas adalah internal users. Simple HMAC cookie dengan 12 jam TTL cukup. Scrypt (N=16384) aman untuk password hashing
**Consequences:** Tidak ada magic link/OAuth. Admin harus manual tambah user via runtime JSON atau env vars

---

## [2026-03-15] — Playwright untuk EMR Auto-Fill
**Status:** Decided
**Decider:** Chief
**Konteks:** ePuskesmas tidak punya API resmi — hanya web interface
**Keputusan:** Playwright browser automation untuk auto-fill data ke ePuskesmas
**Rationale:** Satu-satunya cara tanpa API resmi. Browser session di-cache 30 menit untuk performa
**Consequences:** Fragile terhadap perubahan UI ePuskesmas. Perlu maintenance jika ePuskesmas update layout

---

## [2026-03-10] — Next.js 16 + React 19
**Status:** Decided
**Decider:** Chief
**Keputusan:** Next.js 16.1.6 + React 19.2.3
**Rationale:** App Router, React Server Components, concurrent features. Turbopack dinonaktifkan (`turbopack: false`) karena instabilitas dengan custom server

---

## [2026-03-10] — Port 7000 (bukan 3000)
**Status:** Decided
**Keputusan:** Default port 7000, fallback ke 7001 jika EADDRINUSE
**Rationale:** Port 3000 sering dipakai app lain di development environment. 7000 menghindari konflik

---

<sub>Architected and built by Claudesy — 2026 · Sentra Healthcare Artificial Intelligence</sub>
