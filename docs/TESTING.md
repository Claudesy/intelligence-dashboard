# File: docs/TESTING.md | App: primary-healthcare | Repo: abyss-v3 | Updated: 2026-03-16
# Architected and built by Claudesy.

# Testing Guide — primary-healthcare (AADI)

---

## Menjalankan Tests

```bash
# Semua test suites (dari root monorepo)
pnpm --filter primary-healthcare test

# CDSS engine saja
pnpm --filter primary-healthcare test:cdss

# Auth hardening saja
pnpm --filter primary-healthcare test:auth-hardening

# CDSS protected route (Node module test)
pnpm --filter primary-healthcare test:cdss:protected

# TypeScript check
pnpm --filter primary-healthcare lint
```

---

## Test Suites

App menggunakan **Node.js built-in test runner** (`node:test`) via `tsx`, bukan Vitest/Jest.

### Suite 1: `auth-hardening`
**File:** `scripts/test-auth-hardening.ts`
**Menguji:**
- HMAC cookie signing/verification
- Session expiry enforcement
- Unauthorized request rejection (401)
- CORS enforcement

### Suite 2: `safety-net` (CDSS)
**File:** `scripts/test-cdss.ts`
**Menguji:**
- IDE-V2 engine dengan berbagai kombinasi gejala
- Vital signs red flag detection (SpO2 < 90%, sistolik ≥ 180, dll)
- Fallback behavior jika LLM API tidak tersedia
- Confidence scoring plausibility

### Suite 3: `intelligence-route` (22 test files)
**Runner:** `tsx --test [files...]`

| Test File | Menguji |
|-----------|---------|
| `useEncounterQueue.test.ts` | Hook untuk antrian encounter pasien |
| `useOperationalMetrics.test.ts` | Hook untuk metrics operasional |
| `trajectory-analyzer.test.ts` | Analisis trend vital signs antar kunjungan |
| `visit-history.test.ts` | Riwayat kunjungan EMR |
| `ai-insights.test.ts` | AI insights generation |
| `observability.test.ts` | Langfuse/Sentry observability pipeline |
| `intelligence/server.test.ts` | Intelligence server-side logic |
| `socket-payload.test.ts` | Socket.IO payload validation |
| `consult-to-bridge.test.ts` | Transfer konsultasi ke EMR bridge |
| `consult-accepted.test.ts` | Flow penerimaan konsultasi |
| `consult-api-validation.test.ts` | Validasi API telemedicine |
| `intelligence/routes.test.ts` | Route handler intelligence dashboard |
| `observability-handler.test.ts` | Observability route handler |
| `acknowledge-handler.test.ts` | Alert acknowledge handler |
| `AIDisclosureBadge.test.tsx` | AI disclosure badge component |
| `AIInsightsPanel.test.tsx` | AI insights panel component |
| `ClinicalSafetyAlertBanner.test.tsx` | Clinical safety alert component |
| `IntelligenceDashboardScaffold.test.tsx` | Dashboard scaffold |
| `IntelligenceSocketProvider.test.tsx` | Socket provider component |
| `OperationalSummaryPanel.test.tsx` | Operational summary component |
| `loading.test.tsx` | Loading state component |
| `error.test.tsx` | Error state component |

---

## Contoh Test Pattern

Tests menggunakan `node:assert/strict` + `node:test`:

```typescript
import assert from "node:assert/strict"
import test from "node:test"

test("acknowledge route returns 401 when session is missing", async () => {
  const handler = createAcknowledgePostHandler({
    getSession: () => null,        // simulasi: tidak ada session
    getIp: () => null,
    recordInteraction: async () => { throw new Error("should not be called") },
    writeSecurityAuditLog: async () => undefined,
  })

  const response = await handler(
    new Request("http://localhost/api/dashboard/intelligence/alerts/acknowledge", {
      method: "POST",
      body: JSON.stringify({ encounterId: "enc-001", ... })
    })
  )

  assert.equal(response.status, 401)
})
```

```typescript
// Clinical trajectory test
test("trajectory reads hypotension moving toward normal as improving", () => {
  const analysis = analyzeTrajectory([
    createVisit("enc-1", "2026-03-10T08:00:00.000Z", { sbp: 82, dbp: 48, hr: 110 }),
    createVisit("enc-2", "2026-03-12T08:00:00.000Z", { sbp: 110, dbp: 70, hr: 80 }),
  ])
  assert.equal(analysis.trend, "improving")
})
```

---

## Env Variables untuk Testing

```env
NODE_ENV=test
CDSS_VERBOSE_TEST_ERRORS=1   # Aktifkan verbose CDSS error logging saat test
```

---

## Coverage Target (Gate 4)

| Metric | Target | Status |
|--------|--------|--------|
| Test suite pass rate | 100% | Aktif dijalankan |
| CDSS red flag coverage | 100% threshold cases | Dalam `test:cdss` |
| Auth security cases | 100% | Dalam `test:auth-hardening` |
| Unit coverage % | ≥ 80% | TestSprite pending (missing-inputs #8) |

---

<sub>Architected and built by Claudesy — 2026 · Sentra Healthcare Artificial Intelligence</sub>
