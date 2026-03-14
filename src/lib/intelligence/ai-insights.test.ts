// Designed and constructed by Claudesy.
import assert from "node:assert/strict";
import test from "node:test";

import type { IntelligenceEventPayload } from "@/lib/intelligence/types";

import { buildAIInsightsSnapshot } from "./ai-insights";

function createSuggestionEvent(
  overrides: Partial<IntelligenceEventPayload["data"]> = {},
): IntelligenceEventPayload {
  return {
    encounterId: "enc-001",
    status: "in_consultation",
    timestamp: "2026-03-13T10:00:00.000Z",
    data: {
      requestId: "req-001",
      engineVersion: "iskandar-v2",
      processedAt: "2026-03-13T10:00:00.000Z",
      latencyMs: 280,
      suggestions: [
        {
          engineVersion: "iskandar-v2",
          confidence: 0.08,
          reasoning: "Confidence terlalu rendah untuk ditampilkan.",
          supportingEvidence: ["Demam ringan"],
          differentialDiagnoses: [
            {
              icd10Code: "A09",
              description: "Infectious gastroenteritis",
              confidence: 0.08,
            },
          ],
          suggestedAt: "2026-03-13T10:00:00.000Z",
        },
        {
          engineVersion: "iskandar-v2",
          confidence: 0.82,
          reasoning: "Gejala dominan konsisten dengan influenza.",
          supportingEvidence: ["Demam", "Batuk", "Mialgia"],
          differentialDiagnoses: [
            {
              icd10Code: "J10.1",
              description: "Influenza with respiratory manifestations",
              confidence: 0.82,
            },
            {
              icd10Code: "J11.1",
              description: "Influenza, virus not identified",
              confidence: 0.41,
            },
          ],
          suggestedAt: "2026-03-13T10:00:00.000Z",
        },
      ],
      alerts: [
        {
          id: "alert-001",
          type: "guideline",
          severity: "warning",
          message: "Verifikasi saturasi oksigen bila batuk memberat.",
          source: "iskandar",
          actionRequired: true,
        },
      ],
      ...overrides,
    },
  };
}

test("buildAIInsightsSnapshot filters blocked confidence suggestions and keeps disclosure label", () => {
  const snapshot = buildAIInsightsSnapshot(createSuggestionEvent());

  assert.equal(snapshot.isIdle, false);
  assert.equal(snapshot.isDegraded, false);
  assert.equal(snapshot.suggestions.length, 1);
  assert.equal(snapshot.suggestions[0]?.primaryDiagnosis.icd10Code, "J10.1");
  assert.equal(snapshot.suggestions[0]?.disclosureLabel, "Saran AI");
  assert.equal(snapshot.validation.violations[0]?.code, "GR-OUTPUT-002");
});

test("buildAIInsightsSnapshot returns idle state when no CDSS event has arrived yet", () => {
  const snapshot = buildAIInsightsSnapshot(null);

  assert.equal(snapshot.isIdle, true);
  assert.equal(snapshot.isDegraded, false);
  assert.equal(snapshot.suggestions.length, 0);
  assert.equal(snapshot.degradedMessage, "");
});

test("buildAIInsightsSnapshot returns degraded state when CDSS is unavailable", () => {
  const snapshot = buildAIInsightsSnapshot(
    createSuggestionEvent({
      unavailable: true,
      unavailableReason: "engine_timeout",
      suggestions: [],
      alerts: [],
    }),
  );

  assert.equal(snapshot.isIdle, false);
  assert.equal(snapshot.isDegraded, true);
  assert.match(snapshot.degradedMessage, /cdss.*tidak tersedia/i);
  assert.equal(snapshot.suggestions.length, 0);
});

test("buildAIInsightsSnapshot degrades when all suggestions are blocked by guardrails", () => {
  const snapshot = buildAIInsightsSnapshot(
    createSuggestionEvent({
      suggestions: [
        {
          engineVersion: "iskandar-v2",
          confidence: 0.09,
          reasoning: "Semua opsi masih terlalu lemah.",
          supportingEvidence: ["Keluhan belum lengkap"],
          differentialDiagnoses: [
            {
              icd10Code: "R69",
              description: "Illness, unspecified",
              confidence: 0.09,
            },
          ],
          suggestedAt: "2026-03-13T10:00:00.000Z",
        },
      ],
    }),
  );

  assert.equal(snapshot.isIdle, false);
  assert.equal(snapshot.isDegraded, true);
  assert.match(snapshot.degradedMessage, /guardrail/i);
  assert.equal(snapshot.validation.violations[0]?.code, "GR-OUTPUT-002");
});
