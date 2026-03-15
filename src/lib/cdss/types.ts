// Masterplan and masterpiece by Claudesy.
/**
 * CDSS Types — Iskandar Diagnosis Engine V2 (LLM-First)
 * Backward compatible dengan EMR page interface.
 */

export interface VitalSigns {
  systolic?: number;
  diastolic?: number;
  heart_rate?: number;
  spo2?: number;
  temperature?: number;
  respiratory_rate?: number;
  weight_kg?: number;
  height_cm?: number;
}

export interface CDSSEngineInput {
  keluhan_utama: string;
  keluhan_tambahan?: string;
  assessment_conclusion?: string;
  usia: number;
  jenis_kelamin: "L" | "P";
  vital_signs?: VitalSigns;
  allergies?: string[];
  chronic_diseases?: string[];
  is_pregnant?: boolean;
  current_drugs?: string[];
  session_id?: string;
}

export interface ValidatedSuggestion {
  rank: number;
  llm_rank?: number;
  icd10_code: string;
  diagnosis_name: string;
  confidence: number;
  reasoning: string;
  key_reasons: string[];
  missing_information: string[];
  red_flags: string[];
  recommended_actions: string[];
  rag_verified: boolean;
  decision_status?: "recommended" | "review" | "must_not_miss" | "deferred";
  decision_reason?: string;
  deterministic_score?: number;
  rank_source?: "llm" | "hybrid";
  validation_flags?: Array<{
    type: string;
    code: string;
    message: string;
  }>;
}

export type AlertSeverity = "emergency" | "high" | "medium" | "low" | "info";
export type CDSSAlertType =
  | "red_flag"
  | "vital_sign"
  | "validation_warning"
  | "low_confidence"
  | "guideline";

export interface CDSSAlert {
  id: string;
  type: CDSSAlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  icd_codes?: string[];
  action?: string;
}

export interface CDSSEngineResult {
  suggestions: ValidatedSuggestion[];
  red_flags: Array<{
    severity: "emergency" | "urgent" | "warning";
    condition: string;
    action: string;
    criteria_met: string[];
    icd_codes?: string[];
  }>;
  alerts: CDSSAlert[];
  processing_time_ms: number;
  source: "ai" | "local" | "error";
  model_version: string;
  validation_summary: {
    total_raw: number;
    total_validated: number;
    recommended_count: number;
    review_count: number;
    must_not_miss_count: number;
    deferred_count: number;
    requires_more_data: boolean;
    unverified_codes: string[];
    warnings: string[];
  };
  next_best_questions: string[];
  _reasoning_content?: string;
}
