// Designed and constructed by Claudesy.
/**
 * @abyss/guardrails
 * ──────────────────
 * Sentra Healthcare AI — Safety & Compliance Layer
 *
 * CRITICAL: Every AI output must pass through guardrails
 * before reaching clinicians or patients.
 *
 * Usage:
 *   import { validateCDSSOutput, runFullComplianceCheck } from "@abyss/guardrails";
 */

export {
  validateAnamnesisInput,
  validateCDSSOutput,
  validateDiagnosisAssignment,
} from "./validators";

export type { ValidationResult, Violation, Warning, AuditItem } from "./validators";

export {
  checkDataPrivacy,
  checkAITransparency,
  checkEklaimReadiness,
  checkDocumentationCompleteness,
  runFullComplianceCheck,
} from "./compliance";

export type {
  ComplianceCheckResult,
  ComplianceCheck,
  ComplianceCategory,
} from "./compliance";
