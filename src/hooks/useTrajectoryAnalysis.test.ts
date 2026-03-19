// Claudesy — useTrajectoryAnalysis Tests
/**
 * Tests for useTrajectoryAnalysis invariants and the trajectory utility
 * functions it relies on (formatETAHours, getETAUrgencyColor).
 *
 * The hook's React side (fetch, state) is tested via integration tests.
 * This file covers the pure-function contracts.
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import { formatETAHours, getETAUrgencyColor } from '@/types/abyss/trajectory'

// ── Patient identifier hash validation ────────────────────────────────────────
// Documents the regex the hook uses to gate fetch calls.
// Any change to this invariant MUST be reflected here.

const PATIENT_HASH_REGEX = /^[0-9a-f]{64}$/

test('patient hash regex — accepts valid 64-char lowercase hex', () => {
  const valid = 'a1b2c3d4e5f6'.repeat(4) + 'a1b2c3d4e5f60000'
  assert.equal(valid.length, 64)
  assert.ok(PATIENT_HASH_REGEX.test(valid))
})

test('patient hash regex — rejects uppercase hex', () => {
  assert.ok(!PATIENT_HASH_REGEX.test('A'.repeat(64)))
})

test('patient hash regex — rejects < 64 chars', () => {
  assert.ok(!PATIENT_HASH_REGEX.test('abc123'))
  assert.ok(!PATIENT_HASH_REGEX.test('a'.repeat(63)))
})

test('patient hash regex — rejects > 64 chars', () => {
  assert.ok(!PATIENT_HASH_REGEX.test('a'.repeat(65)))
})

test('patient hash regex — rejects empty string', () => {
  assert.ok(!PATIENT_HASH_REGEX.test(''))
})

test('patient hash regex — rejects non-hex characters', () => {
  assert.ok(!PATIENT_HASH_REGEX.test('g'.repeat(64)))
  assert.ok(!PATIENT_HASH_REGEX.test('z'.repeat(64)))
})

// ── formatETAHours ────────────────────────────────────────────────────────────

test('formatETAHours — null returns em dash', () => {
  assert.equal(formatETAHours(null), '—')
})

test('formatETAHours — < 1 hour returns "< 1 jam"', () => {
  assert.equal(formatETAHours(0.5), '< 1 jam')
  assert.equal(formatETAHours(0), '< 1 jam')
})

test('formatETAHours — whole hours returns "~N jam"', () => {
  assert.equal(formatETAHours(3), '~3 jam')
  assert.equal(formatETAHours(23), '~23 jam')
})

test('formatETAHours — exactly 24 hours returns "~1 hari"', () => {
  assert.equal(formatETAHours(24), '~1 hari')
})

test('formatETAHours — > 24 hours with remainder returns days+hours', () => {
  const result = formatETAHours(26)
  assert.match(result, /1h/)
  assert.match(result, /2j/)
})

test('formatETAHours — 48 hours returns "~2 hari"', () => {
  assert.equal(formatETAHours(48), '~2 hari')
})

// ── getETAUrgencyColor ────────────────────────────────────────────────────────

test('getETAUrgencyColor — null returns muted CSS var', () => {
  assert.equal(getETAUrgencyColor(null), 'var(--text-muted)')
})

test('getETAUrgencyColor — < 24h returns red (critical)', () => {
  assert.equal(getETAUrgencyColor(12), '#ef4444')
  assert.equal(getETAUrgencyColor(1), '#ef4444')
})

test('getETAUrgencyColor — 24–71h returns orange (warning)', () => {
  assert.equal(getETAUrgencyColor(24), '#f97316')
  assert.equal(getETAUrgencyColor(71), '#f97316')
})

test('getETAUrgencyColor — 72–167h returns amber (caution)', () => {
  assert.equal(getETAUrgencyColor(72), '#eab308')
  assert.equal(getETAUrgencyColor(167), '#eab308')
})

test('getETAUrgencyColor — >= 168h returns green (routine)', () => {
  assert.equal(getETAUrgencyColor(168), '#10b981')
  assert.equal(getETAUrgencyColor(999), '#10b981')
})
