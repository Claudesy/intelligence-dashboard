<!-- Claudesy's vision, brought to life. -->

# Changelog

_Claudesy's vision, brought to life._

All notable changes to the Intelligence Dashboard are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Claudesy brand signature across all source files (comprehensive identity protocol)
- `CONTRIBUTING.md` — contribution guidelines and development workflow
- `CHANGELOG.md` — this file, tracking all notable changes
- `SECURITY.md` — responsible disclosure policy and security practices
- `CODE_OF_CONDUCT.md` — Contributor Covenant 2.1
- `COMMIT_CONVENTION.md` — Conventional Commits specification
- `.gitattributes` — line endings and diff driver configuration
- `.github/workflows/ci.yml` — GitHub Actions CI/CD pipeline (lint, test, build, security-scan)
- `REVIEW_REPORT.md` — comprehensive production-grade audit report

### Recommended (Future)
- OpenAPI 3.1 specification for all 70+ API endpoints
- OpenTelemetry SDK instrumentation for distributed tracing
- ESLint configuration for runtime safety linting
- Expand test suite to ≥80% coverage threshold
- API versioning (`/v1/` prefix)
- Prisma connection pooling via PgBouncer or Prisma Accelerate

---

## [0.8.0] — 2026-03-14

### Added
- ClinicalCaseAuditEvent model and migration (`20260315_add_clinical_case_audit_events`)
- ClinicalReport model and migration (`20260314_add_clinical_reports`)
- Clinical report generation and storage pipeline (`src/lib/report/`)
- EMR component suite: ClinicalPrognosisChart, ClinicalTrajectoryChart, TrajectoryPanel, TrustLayerGhost

### Changed
- Intelligence Dashboard scaffold updated with AI disclosure badge and real-time status

---

## [0.7.0] — 2026-03-09

### Added
- AssistantKnowledgeEntry model and migration (`20260309_add_assistant_knowledge_entries`)
- Knowledge base management system (`src/lib/assistant-knowledge.ts`)
- Admin knowledge management tab

---

## [0.6.0] — 2026-03-05

### Added
- CDSSAuditLog model and migration (`20260305_add_cdss_audit_logs`)
- CDSSOutcomeFeedback model and migration (`20260305_add_cdss_outcome_feedback`)
- CDSS quality dashboard endpoint (`/api/cdss/quality-dashboard`)
- CDSS outcome feedback endpoint (`/api/cdss/feedback`)
- Clinical safety alert banner component

---

## [0.5.0] — 2026-03-03

### Added
- Full telemedicine module with LiveKit WebRTC integration
- TelemedicineAppointment, TelemedicineSession, TelemedicineParticipant models
- Patient join-by-token system (no login required for patients)
- E-prescription modal with ICD-X integration
- Diagnosis modal with SOAP note generation
- Appointment booking component
- Network quality badge
- Migration: `20260303114404_init_telemedicine`
- Migration: `20260303_add_patient_phone_join_token`
- WhatsApp Cloud API integration for patient notifications

---

## [0.4.0] — 2026-02-15

### Added
- Audrey voice assistant powered by Google Gemini 2.5 Flash Live
- Push-to-Talk (PTT) audio streaming over Socket.IO
- Real-time latency tracking (first chunk, turn complete times)
- Audrey persona calibrated for Puskesmas-level resources

---

## [0.3.0] — 2026-02-01

### Added
- Clinical Decision Support System (CDSS) with local disease knowledge base
- 159 diseases, 45,030 real encounter records for CDSS reasoning
- ICD-X finder with dynamic ICD-10 lookup
- LB1 report automation pipeline

### Changed
- Migrated from basic auth to HMAC-signed session cookies
- Password hashing upgraded from bcrypt to scrypt (N=16384)

---

## [0.2.0] — 2026-01-15

### Added
- EMR auto-fill via Playwright RPA automation
- Real-time Socket.IO progress streaming for long-running operations
- ACARS internal messaging system
- Staff location map (Leaflet)
- Medical calculators workspace

---

## [0.1.0] — 2026-01-01

### Added
- Initial Next.js 15 + React 19 application scaffold
- Custom Node.js HTTP + Socket.IO server
- Crew Access authentication system
- PostgreSQL database with Prisma ORM
- Railway.app deployment configuration
- Intelligence dashboard with real-time operational metrics
- Staff roster hub (Hub module)
- Admin console with role-based access control

---

_Architected and built by the one and only Claudesy._
