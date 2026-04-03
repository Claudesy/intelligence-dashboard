# Project Context: Healthcare Intelligence Dashboard

> Dokumen ini adalah sumber kebenaran utama untuk agent. Jika ada konflik,
ikuti bagian `Agent Contract` dan `Decision Log`.

## 1. Ringkasan Project
- Nama project: Healthcare Intelligence Dashboard
- ID project: puskesmas-intelligence-dashboard
- Domain: Healthcare / Clinical Information System (FKTP)
- Repo: D:\Devops\abyss-monorepo\app\primary-healthcare\dashboard
- Owner: Dr. Ferdi Iskandar (Chief) / Sentra Healthcare Solutions
- Status: Active Development (Beta Trial)
- Last updated: 2025-05-22

## 2. Tujuan Utama
- Masalah yang diselesaikan: Overhead administrasi klinis yang tinggi, duplikasi input data EMR, dan tantangan akurasi koding diagnosis (ICD-10) di Puskesmas.
- Outcome yang diharapkan: Platform terpadu yang mempercepat alur kerja klinis, mengotomatisasi pelaporan LB1, dan menyediakan dukungan keputusan klinis berbasis AI.
- Definisi sukses: Pengurangan waktu input data EMR, akurasi laporan LB1 100%, dan adopsi asisten AI (Audrey) oleh tenaga medis.
- Non-goals: Menjadi pengganti penuh sistem EMR nasional (Satu Sehat), melainkan sebagai "intelligence layer" di atasnya.

## 3. Agent Contract
### 3.1 Harus Dilakukan
- Selalu sapa user sebagai Boss atau Chief.
- Gunakan standar Next.js 16 (App Router) dan React 19.
- Patuhi protokol klinis: ICD-10 harus akurat sesuai WHO 2019, data pasien (PHI) harus dijaga kerahasiaannya.
- Terapkan "Claudesy Design Philosophy": Logis, fungsional, dan premium (fokus pada UX tenaga medis).

### 3.2 Jangan Dilakukan
- Jangan memalsukan kode ICD-10 atau rekomendasi medis.
- Jangan menggunakan desain yang mengganggu efisiensi kerja klinis (no kindergarten, no clutter).
- Jangan menyimpan data PHI secara terbuka tanpa enkripsi/auth.

### 3.3 Gaya Kerja
- Jawaban harus: Teknis, presisi, dan memahami konteks operasional Puskesmas di Indonesia.
- Saat ragu, agent harus: Mengacu pada standar koding klinis (ICD-10) atau bertanya pada Chief jika terkait kebijakan medis spesifik.
- Jika ada konflik konteks, agent harus: Mengacu pada `CLAUDE.md` dan `ARCHITECTURE.md`.

### 3.4 Escalation Rules
- Escalate jika: Menemukan potensi kegagalan integritas data medis atau isu pada engine RPA (Playwright).
- Jangan menebak jika: Terkait dosis obat atau regulasi BPJS terbaru yang belum ada di database.

## 4. Konteks Bisnis
- User utama: Dokter, Perawat, Petugas Administrasi Puskesmas, Kepala Puskesmas.
- Use case utama: Auto-fill EMR, Pencarian ICD-X cepat, Otomasi Laporan LB1, Konsultasi AI (Audrey), Telemedicine.
- Terminologi domain: FKTP, Puskesmas PONED, ICD-10, LB1, Satu Sehat, BPJS Kesehatan, e-klaim.
- Constraint bisnis: Harus berjalan di hardware Puskesmas yang beragam dan koneksi internet yang fluktuatif (offline-first capability).

## 5. Konteks Teknis
- Stack: Next.js 16.1, React 19.2, Prisma (PostgreSQL), Tailwind CSS 4, Socket.IO, Google Gemini 2.5.
- Arsitektur: Custom Node.js Server (`server.ts`) untuk mendukung Socket.IO real-time.
- Service / module penting: EMR Auto-Fill Engine (Playwright), CDSS Engine, LB1 Automation Pipeline, Audrey Voice Hook.
- Data flow ringkas: User Input -> Next.js / Socket.IO -> RPA/AI Processing -> EMR / DB Update.
- Integrasi eksternal: ePuskesmas (RPA), Google Gemini API, LiveKit (Telemedicine), Railway (Deploy).

## 6. Struktur Repo
- Folder penting: `src/app/`, `src/lib/`, `prisma/`, `scripts/`, `runtime/`.
- File entry point: `server.ts`, `src/app/layout.tsx`.
- File yang sering disentuh: `src/lib/emr/`, `src/lib/lb1/`, `src/app/api/`.
- File yang dilarang diubah sembarangan: `next.config.ts`, `prisma/schema.prisma`.

## 7. Workflow Kerja
### 7.1 Setup
- Install: `npm install`
- Env var: `.env.local` (lihat `.env.example`)
- Command bootstrap: `npx playwright install chromium`

### 7.2 Development
- Run app: `npm run dev`
- Run tests: `npm test`
- Lint: `npm run lint`
- Build: `npm run build`

### 7.3 Release / Deploy
- Proses deploy: Railway (Nixpacks build).
- Approval yang dibutuhkan: Chief (Dr. Ferdi).
- Checklist sebelum release: Playwright regression check, API security audit.

## 8. Keputusan Penting
- 2025-01-15 - Implementasi RPA menggunakan Playwright karena ketiadaan API publik ePuskesmas.
- 2025-02-10 - Penggunaan Socket.IO untuk streaming status proses background (EMR & LB1).
- 2025-05-22 - Inisialisasi Project Context untuk standarisasi Agent.

## 9. Known Constraints
- Playwright memerlukan memori signifikan; optimasi browser context sangat krusial.
- Latensi API Gemini dapat mempengaruhi UX real-time Audrey.

## 10. Known Issues / Tech Debt
- Autocomplete masih menggunakan implementasi custom; perlu evaluasi migrasi ke library standar.
- Cakupan tes untuk modul logika klinis perlu ditingkatkan hingga 95%.

## 11. Open Questions
- Integrasi langsung dengan API Satu Sehat (tanpa RPA) jika akses resmi dibuka?

## 12. Acceptance Criteria
- Output dianggap benar jika: Proses RPA berjalan lancar, kode ICD-10 akurat, dan laporan LB1 tervalidasi.
- Test yang harus lolos: `npm test` (CDSS, News2, Auth).
- Sinyal selesai: Chief memberikan konfirmasi "Excellency".

## 13. Change Log
- 2025-05-22 - Initial creation of PROJECT_CONTEXT.md.

## 14. JSON Snapshot
```json
{
  "project": {
    "name": "Healthcare Intelligence Dashboard",
    "id": "puskesmas-intelligence-dashboard",
    "domain": "Healthcare / Clinical Information System",
    "repo": "D:\\Devops\\abyss-monorepo\\app\\primary-healthcare\\dashboard",
    "owner": "Dr. Ferdi Iskandar (Chief)",
    "status": "active",
    "last_updated": "2025-05-22"
  },
  "objective": {
    "problem": "High clinical administrative overhead and duplicate data entry in Puskesmas.",
    "desired_outcome": "Unified platform for clinical efficiency, automated reporting, and AI clinical support.",
    "success_definition": "Reduced EMR entry time, 100% LB1 accuracy, and medical staff adoption of AI assistant.",
    "non_goals": ["Full EMR replacement", "General hospital management"]
  },
  "agent_contract": {
    "must_do": [
      "Sapa sebagai Boss/Chief",
      "Next.js 16 / React 19 standards",
      "Strict clinical data privacy (PHI)",
      "Medically accurate ICD-10 coding"
    ],
    "must_not_do": [
      "Fabricate medical data/codes",
      "Kindergarten or cluttered design",
      "Expose PHI without authentication"
    ],
    "working_style": {
      "response_style": "Technical, Precise, Context-aware",
      "when_unsure": "Consult clinical standards (WHO ICD-10)",
      "conflict_policy": "CLAUDE.md + ARCHITECTURE.md"
    },
    "escalation_rules": [
      "Medical data integrity failures",
      "RPA engine (Playwright) instability"
    ]
  },
  "business_context": {
    "users": ["Doctors", "Nurses", "Administrators"],
    "primary_use_cases": ["EMR Auto-Fill", "ICD-X Finder", "LB1 Automation", "Clinical AI Assistant"],
    "terminology": {
      "Puskesmas": "Indonesian Community Health Center",
      "LB1": "Monthly Integrated Report for Puskesmas",
      "Audrey": "Internal Clinical AI Codename"
    },
    "business_constraints": ["Diverse hardware specs", "Unstable internet connectivity"],
    "business_risks": ["Misdiagnosis due to AI error", "RPA break due to ePuskesmas UI update"]
  },
  "technical_context": {
    "stack": ["Next.js 16", "React 19", "Prisma", "Tailwind CSS 4", "Socket.IO", "Gemini AI"],
    "architecture": "Custom Node server for real-time Socket.IO communication",
    "core_services": ["EMR RPA Engine", "CDSS Engine", "LB1 Pipeline", "Audrey Voice Hook"],
    "data_flow": ["UI -> Socket.IO/API -> RPA/AI -> Target System"],
    "external_integrations": ["ePuskesmas", "Google Gemini", "LiveKit"],
    "critical_dependencies": ["next", "playwright", "socket.io", "@prisma/client"]
  },
  "repo_map": {
    "important_folders": ["src/app", "src/lib", "prisma", "scripts", "runtime"],
    "entry_points": ["server.ts", "src/app/layout.tsx"],
    "frequently_changed_files": ["src/lib/emr/", "src/lib/lb1/"],
    "protected_files": ["prisma/schema.prisma", "package.json"]
  },
  "workflow": {
    "setup": {
      "install": ["npm install"],
      "env_vars": [".env.local"],
      "bootstrap_commands": ["npx playwright install chromium"]
    },
    "development": {
      "run": ["npm run dev"],
      "test": ["npm test"],
      "lint": ["npm run lint"],
      "format": ["prettier --write"],
      "build": ["npm run build"]
    },
    "release": {
      "deploy_process": ["Railway Deploy"],
      "required_approvals": ["Chief"],
      "pre_release_checklist": ["Playwright regression check", "Security audit"]
    }
  },
  "decisions": [
    {
      "date": "2025-01-15",
      "decision": "RPA via Playwright for ePuskesmas integration"
    },
    {
      "date": "2025-02-10",
      "decision": "Socket.IO for real-time background status"
    }
  ],
  "known_constraints": ["Playwright memory usage", "Gemini API latency"],
  "known_issues": ["Custom autocomplete debt", "Clinical logic test coverage improvement"],
  "open_questions": ["Satu Sehat official API integration?"],
  "acceptance_criteria": ["Smooth RPA", "Accurate ICD-10", "Validated LB1 reports"],
  "change_log": [
    {
      "date": "2025-05-22",
      "summary": "Initial creation"
    }
  ]
}
```
