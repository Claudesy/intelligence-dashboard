# File: ROADMAP.md | App: primary-healthcare | Repo: abyss-v3 | Updated: 2026-03-16
# Architected and built by Claudesy.

# Roadmap — primary-healthcare (AADI)

> Deployed live di UPTD Puskesmas PONED Balowerti, Kota Kediri

---

## Active — Q1 2026

### Bug Fixes
- [ ] **Autocomplete non-alias words** — symptom autocomplete tidak muncul untuk kata yang bukan alias
- [ ] CDSS confidence calibration untuk keluhan minimal (1-2 gejala)

### Features
- [ ] **ICD-10 e-klaim integration** — output kode ICD-10 langsung ke format BPJS e-klaim
- [ ] FORNAS formulary live lookup di CDSS recommendations
- [ ] SOAP note auto-generation dari hasil CDSS

### Architecture
- [ ] **CDSS extraction** — pindahkan `server.ts` inline CDSS logic ke `platform/cognitive`
- [ ] Audrey `platform/audrey` — pindahkan voice proxy dari `server.ts` ke platform module

---

## Q2 2026

### Clinical Pilot
- [ ] Pilot di 3 Puskesmas tambahan (selain Balowerti)
- [ ] Kumpulkan outcome feedback dari dokter untuk evaluasi IDE-V2
- [ ] Sensitivity/specificity baseline dari pilot data

### Features
- [ ] Multi-facility support — satu instance untuk beberapa Puskesmas
- [ ] BPJS P-Care integration — sinkronisasi data kunjungan otomatis
- [ ] Riwayat pasien antar kunjungan (de-identified)
- [ ] Clinical trajectory alerts — notifikasi jika vital trend memburuk

### Testing
- [ ] TestSprite clinical acceptance suite (pending config dari Chief — missing-inputs #8)
- [ ] Vitest unit coverage ≥ 80%
- [ ] Role-based authorization di semua CDSS endpoints (TODO security note)

---

## Q3 2026

### Production Hardening
- [ ] Gate 5: Chief approval + security review → production sign-off
- [ ] OPA runtime untuk `.rego` policy enforcement (missing-inputs #6)
- [ ] RBAC backend implementation (missing-inputs #3)
- [ ] Load testing untuk peak hours Puskesmas (>50 concurrent users)

### Regulatory
- [ ] Clinical validation report (Gate 4 acceptance criteria)
- [ ] BPOM SaMD pathway assessment
- [ ] Kemenkes regulatory submission preparation

---

## Backlog (No ETA)

- POGS module (Puskesmas Operational Guidance System)
- CDOS module (Clinical Decision Outcome System)
- TRIAGE module — risk scoring otomatis di IGD
- PREDICTION module — prediksi kebutuhan stok obat
- Offline mode — partial functionality tanpa internet
- Mobile app untuk dokter lapangan

---

<sub>Architected and built by Claudesy — 2026 · Sentra Healthcare Artificial Intelligence</sub>
