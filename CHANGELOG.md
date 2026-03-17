<!-- Claudesy's vision, brought to life. -->

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Clinical Report module — full CRUD for clinical reports with Zod validation, audit trail, and PDF rendering support

### Changed
- `src/lib/report/clinical-report.ts` — added comprehensive Zod schemas (`ClinicalReportDraftInputSchema`)
- `src/app/api/report/clinical/route.ts` — improved input validation and error handling
- `src/lib/report/clinical-report-store.ts` — removed PHI from audit payload

### Security
- Removed patient name & MRN from audit events (PHI compliance)

- `CODE_OF_CONDUCT.md` — Contributor Covenant v2.1
- `SECURITY.md` — responsible disclosure policy and security contact
- `CHANGELOG.md` — this file, following Keep a Changelog format
- `LICENSE` — proprietary licence for Sentra Healthcare Solutions
- `.editorconfig` — cross-editor formatting rules
- `.gitattributes` — line-ending normalisation and diff drivers
- `COMMIT_CONVENTION.md` — Conventional Commits specification
- `.github/PULL_REQUEST_TEMPLATE.md` — PR checklist template
- `.github/ISSUE_TEMPLATE/bug_report.md` — structured bug report template
- `.github/ISSUE_TEMPLATE/feature_request.md` — structured feature request template
- `.github/workflows/ci.yml` — lint, type-check, and test pipeline
- `.github/workflows/security.yml` — dependency audit and secret scan
- `docs/architecture.md` — system architecture overview
- `docs/adr/0001-custom-server.md` — ADR: custom Node.js server wrapping Next.js
- `docs/adr/0002-hmac-session-cookies.md` — ADR: stateless HMAC session tokens
- `docs/adr/0003-in-process-rate-limiter.md` — ADR: in-process rate limiter and its limitations
- `REVIEW_REPORT.md` — comprehensive repository audit report

### Changed
- `README.md` — updated with CI/CD badge placeholders and corrected cross-references
- `.env.example` — added `RESEND_API_KEY`, `CREW_ACCESS_AUTOMATION_TOKEN`, and `TRUST_PROXY_HEADERS`; changed `MONAI_API_TOKEN` placeholder from `changeme-shared-secret` to an empty value

### Security
- Documented in-process rate limiter single-instance limitation (see `docs/adr/0003`)
- Noted `xlsx >= 0.18.5` open version range as a medium-priority supply-chain risk
- Noted React Strict Mode disabled; recommended re-enabling for development

## [0.1.0] — 2025-01-01

### Added
- Initial release of the Puskesmas Intelligence Dashboard
- Custom Node.js HTTP server wrapping Next.js with Socket.IO integration
- Crew Access Portal — HMAC-signed stateless session cookies with scrypt password hashing
- EMR Auto-Fill Engine — Playwright-based RPA for ePuskesmas integration
- CDSS — Clinical Decision Support System with BM25 + embedding hybrid search (159 diseases)
- LB1 Report Automation — SP3 LB1 monthly report generation from EMR exports
- Audrey — Google Gemini Live voice consultation AI with push-to-talk
- ACARS — Internal real-time chat system via Socket.IO
- ICD-X Finder — Multi-version ICD-10 lookup with offline database
- Telemedicine Module — WebRTC video consultation via LiveKit
- Intelligence Dashboard — Real-time operational metrics and clinical alerts
- Prisma ORM with PostgreSQL for telemedicine and audit data
- Railway deployment configuration with Nixpacks builder
