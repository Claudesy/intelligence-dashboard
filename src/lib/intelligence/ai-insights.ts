import { type ValidationResult, validateCDSSOutput } from '@abyss/guardrails'
import type { CDSSResponse, ClinicalAlert, IskandarSuggestion } from '@abyss/types'

import { AI_DISCLOSURE_LABEL } from './disclosure'
import type { IntelligenceEventPayload } from './types'

export interface AIInsightDiagnosisOption {
  icd10Code: string
  description: string
  confidence: number
}

export interface AIInsightSuggestionView {
  id: string
  engineVersion: string
  confidence: number
  reasoning: string
  supportingEvidence: string[]
  suggestedAt: string
  disclosureLabel: typeof AI_DISCLOSURE_LABEL
  primaryDiagnosis: AIInsightDiagnosisOption
  differentials: AIInsightDiagnosisOption[]
}

export interface AIInsightsSnapshot {
  encounterId: string | null
  requestId: string | null
  engineVersion: string | null
  processedAt: string | null
  latencyMs: number | null
  alerts: ClinicalAlert[]
  suggestions: AIInsightSuggestionView[]
  validation: ValidationResult
  isIdle: boolean
  isDegraded: boolean
  degradedMessage: string
}

function createEmptyValidationResult(): ValidationResult {
  return {
    valid: false,
    violations: [],
    warnings: [],
    auditTrail: [],
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && Array.isArray(value) === false
}

function coerceDiagnosisOption(value: unknown): AIInsightDiagnosisOption | null {
  if (!isRecord(value)) {
    return null
  }

  const icd10Code = typeof value.icd10Code === 'string' ? value.icd10Code : ''
  const description = typeof value.description === 'string' ? value.description : ''
  const confidence = typeof value.confidence === 'number' ? value.confidence : 0

  if (!icd10Code || !description) {
    return null
  }

  return {
    icd10Code,
    description,
    confidence,
  }
}

function coerceSuggestion(value: unknown, fallbackTimestamp: string): IskandarSuggestion | null {
  if (!isRecord(value)) {
    return null
  }

  const confidence = typeof value.confidence === 'number' ? value.confidence : null
  const reasoning = typeof value.reasoning === 'string' ? value.reasoning : ''
  const engineVersion = typeof value.engineVersion === 'string' ? value.engineVersion : 'unknown'
  const suggestedAt = typeof value.suggestedAt === 'string' ? value.suggestedAt : fallbackTimestamp

  if (confidence === null || !reasoning) {
    return null
  }

  const supportingEvidence = Array.isArray(value.supportingEvidence)
    ? value.supportingEvidence.filter((item): item is string => typeof item === 'string')
    : []
  const differentialDiagnoses = Array.isArray(value.differentialDiagnoses)
    ? value.differentialDiagnoses
        .map(item => coerceDiagnosisOption(item))
        .filter((item): item is AIInsightDiagnosisOption => item !== null)
    : []

  if (differentialDiagnoses.length === 0) {
    return null
  }

  return {
    engineVersion,
    confidence,
    reasoning,
    supportingEvidence,
    differentialDiagnoses,
    suggestedAt,
  }
}

function coerceAlert(value: unknown): ClinicalAlert | null {
  if (!isRecord(value)) {
    return null
  }

  const id = typeof value.id === 'string' ? value.id : ''
  const type = typeof value.type === 'string' ? value.type : ''
  const severity = typeof value.severity === 'string' ? value.severity : ''
  const message = typeof value.message === 'string' ? value.message : ''
  const source = typeof value.source === 'string' ? value.source : 'unknown'
  const actionRequired = typeof value.actionRequired === 'boolean' ? value.actionRequired : false

  if (
    !id ||
    !message ||
    (type !== 'drug_interaction' &&
      type !== 'allergy' &&
      type !== 'contraindication' &&
      type !== 'critical_value' &&
      type !== 'guideline') ||
    (severity !== 'info' && severity !== 'warning' && severity !== 'critical')
  ) {
    return null
  }

  return {
    id,
    type,
    severity,
    message,
    source,
    actionRequired,
  }
}

function coerceCDSSResponse(event: IntelligenceEventPayload): CDSSResponse | null {
  const source = isRecord(event.data.response) ? event.data.response : event.data
  if (!isRecord(source)) {
    return null
  }

  const suggestions = Array.isArray(source.suggestions)
    ? source.suggestions
        .map(item => coerceSuggestion(item, event.timestamp))
        .filter((item): item is IskandarSuggestion => item !== null)
    : []

  const alerts = Array.isArray(source.alerts)
    ? source.alerts
        .map(item => coerceAlert(item))
        .filter((item): item is ClinicalAlert => item !== null)
    : []

  return {
    requestId:
      typeof source.requestId === 'string' ? source.requestId : `socket-${event.encounterId}`,
    engineVersion:
      typeof source.engineVersion === 'string'
        ? source.engineVersion
        : (suggestions[0]?.engineVersion ?? 'unknown'),
    suggestions,
    triageLevel:
      source.triageLevel === 1 ||
      source.triageLevel === 2 ||
      source.triageLevel === 3 ||
      source.triageLevel === 4 ||
      source.triageLevel === 5
        ? source.triageLevel
        : undefined,
    alerts,
    processedAt: typeof source.processedAt === 'string' ? source.processedAt : event.timestamp,
    latencyMs: typeof source.latencyMs === 'number' ? source.latencyMs : 0,
  }
}

function isUnavailable(event: IntelligenceEventPayload): boolean {
  return event.data.unavailable === true || event.data.status === 'unavailable'
}

function mapSuggestionView(suggestion: IskandarSuggestion, index: number): AIInsightSuggestionView {
  const [primaryDiagnosis, ...differentials] = suggestion.differentialDiagnoses

  return {
    id: `${primaryDiagnosis.icd10Code}-${index + 1}`,
    engineVersion: suggestion.engineVersion,
    confidence: suggestion.confidence,
    reasoning: suggestion.reasoning,
    supportingEvidence: suggestion.supportingEvidence,
    suggestedAt: suggestion.suggestedAt,
    disclosureLabel: AI_DISCLOSURE_LABEL,
    primaryDiagnosis,
    differentials,
  }
}

export function buildAIInsightsSnapshot(
  event: IntelligenceEventPayload | null
): AIInsightsSnapshot {
  if (!event) {
    return {
      encounterId: null,
      requestId: null,
      engineVersion: null,
      processedAt: null,
      latencyMs: null,
      alerts: [],
      suggestions: [],
      validation: createEmptyValidationResult(),
      isIdle: true,
      isDegraded: false,
      degradedMessage: '',
    }
  }

  if (isUnavailable(event)) {
    return {
      encounterId: event.encounterId,
      requestId: null,
      engineVersion: null,
      processedAt: event.timestamp,
      latencyMs: null,
      alerts: [],
      suggestions: [],
      validation: createEmptyValidationResult(),
      isIdle: false,
      isDegraded: true,
      degradedMessage: 'CDSS tidak tersedia saat ini. Lanjutkan review klinis manual.',
    }
  }

  const response = coerceCDSSResponse(event)
  if (!response) {
    return {
      encounterId: event.encounterId,
      requestId: null,
      engineVersion: null,
      processedAt: event.timestamp,
      latencyMs: null,
      alerts: [],
      suggestions: [],
      validation: createEmptyValidationResult(),
      isIdle: false,
      isDegraded: true,
      degradedMessage: 'Payload CDSS tidak valid untuk dirender di dashboard.',
    }
  }

  const validation = validateCDSSOutput(response)
  const safeSuggestions = response.suggestions.filter(suggestion => suggestion.confidence >= 0.1)

  if (safeSuggestions.length === 0) {
    const blockedMessage =
      response.suggestions.length > 0
        ? 'Semua suggestion diblokir guardrail karena confidence terlalu rendah.'
        : 'CDSS belum menghasilkan suggestion yang aman untuk ditampilkan.'

    return {
      encounterId: event.encounterId,
      requestId: response.requestId,
      engineVersion: response.engineVersion,
      processedAt: response.processedAt,
      latencyMs: response.latencyMs,
      alerts: response.alerts,
      suggestions: [],
      validation,
      isIdle: false,
      isDegraded: true,
      degradedMessage: blockedMessage,
    }
  }

  return {
    encounterId: event.encounterId,
    requestId: response.requestId,
    engineVersion: response.engineVersion,
    processedAt: response.processedAt,
    latencyMs: response.latencyMs,
    alerts: response.alerts,
    suggestions: safeSuggestions.map((suggestion, index) => mapSuggestionView(suggestion, index)),
    validation,
    isIdle: false,
    isDegraded: false,
    degradedMessage: '',
  }
}
