# Clinical Momentum Engine (CME) — Design Document

**Date:** 2026-03-17
**Author:** Claude (Principal Engineer) + Dr. Ferdi Iskandar (Chief)
**Status:** Approved — Ready for Implementation

## Context

Puskesmas adalah satu-satunya level pelayanan kesehatan yang melihat full lifecycle pasien — dari sehat → kronik → deteriorasi → rujuk. Data longitudinal vital sign ini tidak dimiliki oleh rumah sakit (akut/one-off) maupun spesialis (sudah deteriorasi). Clinical Momentum Engine memanfaatkan keunggulan unik ini.

### Problems Identified

1. Vital sign data hilang setelah session (tidak persisted di DB)
2. Tidak ada alert otomatis berbasis trajectory
3. CDSS Iskandar Engine hanya melihat 1 kunjungan, tidak melihat trend
4. Vital sign data bukan first-class citizen di sistem

### Critical Safety Gaps Found During Audit

1. **GCS/Consciousness NOT wired into alerting** — captured in EMR but never reaches CDSS/NEWS2/red flags
2. **NEWS2 missing consciousness parameter** — only 5 of 6 standard parameters scored
3. **Supplemental O2 not tracked** — NEWS2 standard adds +2 for O2 use
4. **SpO2 not in trajectory analyzer** — no longitudinal SpO2 tracking
5. **Pain score not in clinical alerting** — exists in ePuskesmas form but not in engines
6. **No Zod validation on socket triage** — malformed vital data passes unchecked
7. **4 different VitalSigns interfaces** — no single source of truth

## Decision

Build the **Clinical Momentum Engine** with phased delivery. Each phase is clinically usable.

## Approach

### Differentiator

"Not just where a patient IS, but where they're HEADING, how FAST, and whether they're ACCELERATING toward danger."

- **Vital Velocity** (Δ/visit interval) — rate of change per parameter
- **Clinical Acceleration** (ΔΔ/visit interval) — is change speeding up or slowing
- **Personal Baseline Deviation** — distance from THIS patient's established normal
- **Convergence Alert** — multiple vitals trending bad simultaneously = multiplicative risk
- **Treatment Response Tracking** — trajectory change after medication adjustment

### Phase Structure

| Phase | Name | Focus |
|-------|------|-------|
| 1A | Safety First | Fix critical gaps: unified VitalSigns, AVPU+GCS wiring, NEWS2 complete, SpO2 in trajectory, Zod validation |
| 1B | Data Foundation | DB persistence (Prisma VitalRecord), pain score wiring, gestational age |
| 2 | Momentum Core | Velocity, acceleration, personal baseline, convergence scoring |
| 3 | Predictive Intelligence | Time-to-critical prediction, trajectory alerts, CDSS integration |
| 4 | Population Signals | Cross-patient clustering, outbreak detection, Kepala Puskesmas dashboard |

## Components

### New Files

- `src/lib/vitals/unified-vitals.ts` — Single source of truth Zod schema + types
- `src/lib/vitals/avpu-gcs-mapper.ts` — Bidirectional AVPU↔GCS mapping
- `src/lib/vitals/vital-record-service.ts` — DB persistence service (Phase 1B)
- `src/lib/clinical/momentum-engine.ts` — Velocity, acceleration, convergence (Phase 2)
- `src/lib/clinical/personal-baseline.ts` — Weighted moving average per patient (Phase 2)
- `src/lib/clinical/convergence-detector.ts` — Multi-param deterioration detection (Phase 2)
- `src/lib/clinical/prediction-engine.ts` — Time-to-critical, treatment response (Phase 3)
- `src/lib/clinical/trajectory-alert-service.ts` — Server-side alert emission (Phase 3)
- `src/lib/population/` — Aggregation, anomaly detection, outbreak signals (Phase 4)

### Modified Files

- `src/lib/cdss/types.ts` — Add AVPU, GCS, supplementalO2, painScore, gestationalWeek
- `src/lib/cdss/engine.ts` — Add consciousness to red flag checks
- `src/lib/cdss/news2.ts` — Add consciousness parameter (#6) + supplemental O2 (+2)
- `src/lib/cdss/early-warning-patterns.ts` — Wire GCS into qSOFA
- `src/lib/clinical/trajectory-analyzer.ts` — Add SpO2 + AVPU to VisitRecord
- `server.ts` — Add Zod validation to triage socket event
- `prisma/schema.prisma` — Add VitalRecord model (Phase 1B)

### Consciousness System

- **AVPU quick** (4 options: Alert/Voice/Pain/Unresponsive) — primary triage input
- **GCS detail** (E+V+M) — required only when AVPU ≠ "A"
- Auto-mapping: GCS 15→A, GCS 14(V drop)→C, GCS 9-13→V, GCS 4-8→P, GCS 3→U

### Momentum Levels

STABLE → DRIFTING → ACCELERATING → CONVERGING → CRITICAL_MOMENTUM

### Alert Decision Matrix

| Momentum Level | Convergence | Alert Level |
|---------------|-------------|-------------|
| STABLE | None | No alert |
| DRIFTING | None | Info (log) |
| DRIFTING | 2+ params | Warning |
| ACCELERATING | None | Warning |
| ACCELERATING | 2+ params | Urgent |
| CONVERGING | 3+ params | Critical |
| CRIT_MOMENTUM | Any | Emergency |

## Next Steps

_Design selesai. Jalankan `/sentra-speccing` untuk membuat PRD formal, atau proceed langsung ke implementasi Phase 1A._
