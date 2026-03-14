// Designed and constructed by Claudesy.
/**
 * @abyss/types
 * ─────────────
 * Sentra Healthcare AI — Shared Type Definitions
 *
 * Usage:
 *   import type { Patient, Diagnosis, CDSSResponse } from "@abyss/types";
 *   import type { ApiResponse, PaginatedResponse } from "@abyss/types";
 *   import type { ICD10Code } from "@abyss/types/clinical";
 */

// Clinical domain types
export type {
  Anamnesis,
  AnamnesisSource,
  AudreyConfig,
  AudreySession,
  BloodType,
  CDSSRequest,
  CDSSResponse,
  ClinicalAlert,
  Diagnosis,
  DiagnosisSource,
  DiagnosisType,
  EklaimMapping,
  Encounter,
  EncounterStatus,
  EncounterType,
  Facility,
  ICD10Code,
  ICD10SearchResult,
  IskandarSuggestion,
  Patient,
  Practitioner,
  PractitionerRole,
  Prescription,
  Referral,
  ReviewOfSystems,
  TriageLevel,
  VitalSigns,
} from "./clinical";

// Common types
export type {
  AppError,
  AuditEntry,
  AuthUser,
  DeepPartial,
  Notification,
  Nullable,
  Optional,
  PaginatedRequest,
  PaginatedResponse,
  Permission,
  Result,
  Session,
  UserRole,
  WithId,
  WithTimestamps,
} from "./common";

// API types
export type {
  ApiEndpoint,
  ApiError,
  ApiMeta,
  ApiResponse,
  ConnectionStatus,
  HttpMethod,
  RealtimeEvent,
  SearchRequest,
  SearchResponse,
  ValidationError,
  WebhookPayload,
} from "./api";

// Intelligence dashboard types
export type {
  DashboardAlertFeed,
  DashboardComplianceIssue,
  DashboardEklaimReadiness,
  DashboardEncounterStatus,
  DashboardEncounterSummary,
  DashboardOperationalMetrics,
} from "./dashboard";
