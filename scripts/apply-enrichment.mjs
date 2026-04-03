/**
 * apply-enrichment.mjs
 * Applies reviewed enrichment data from database/enrichment-output.json
 * into public/data/penyakit.json.
 *
 * Run ONLY after Chief has reviewed enrichment-output.json.
 *
 * Usage:
 *   node scripts/apply-enrichment.mjs           # dry-run (shows what would change)
 *   node scripts/apply-enrichment.mjs --apply   # write changes
 */

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const SOURCE = join(ROOT, 'public', 'data', 'penyakit.json')
const ENRICHMENT = join(ROOT, 'database', 'enrichment-output.json')
const BACKUP_DIR = join(ROOT, 'database', 'backups')

const APPLY = process.argv.includes('--apply')

// ─── Load ─────────────────────────────────────────────────────────────────────

let enrichmentData
try {
  enrichmentData = JSON.parse(readFileSync(ENRICHMENT, 'utf-8'))
} catch {
  console.error('ERROR: database/enrichment-output.json not found.')
  console.error('Run enrich-penyakit-clinical.mjs first to generate enrichment data.')
  process.exit(1)
}

const raw = JSON.parse(readFileSync(SOURCE, 'utf-8'))
const entries = raw.penyakit

const { results } = enrichmentData
const successResults = results.filter(r => r.status === 'ok')

console.log('=== APPLY ENRICHMENT ===')
console.log(`Enrichment file generated at: ${enrichmentData._meta.generated_at}`)
console.log(`Success results to apply: ${successResults.length}`)
console.log(`Errors skipped: ${enrichmentData._meta.total_errors}`)
console.log('')

// ─── Preview changes ──────────────────────────────────────────────────────────

let appliedCount = 0
let skippedCount = 0

const updated = entries.map(entry => {
  const result = successResults.find(r => r.id === entry.id)
  if (!result) return entry

  const updated = { ...entry }
  let changed = false

  if (
    result.enriched_fields.includes('pemeriksaan_fisik') &&
    result.data.pemeriksaan_fisik?.length
  ) {
    if (!APPLY) {
      console.log(
        `[${entry.id}] ${entry.nama} — pemeriksaan_fisik: ${result.data.pemeriksaan_fisik.join(', ')}`
      )
    }
    updated.pemeriksaan_fisik = result.data.pemeriksaan_fisik
    changed = true
  }

  if (result.enriched_fields.includes('red_flags') && result.data.red_flags?.length) {
    if (!APPLY) {
      console.log(`[${entry.id}] ${entry.nama} — red_flags: ${result.data.red_flags.join(', ')}`)
    }
    updated.red_flags = result.data.red_flags
    changed = true
  }

  if (changed) appliedCount++
  else skippedCount++

  return updated
})

console.log(`\nEntries to update: ${appliedCount}`)
console.log(`Entries unchanged (no valid data): ${skippedCount}`)

if (!APPLY) {
  console.log('\n[DRY-RUN] No files written. Re-run with --apply to commit changes.')
  process.exit(0)
}

// ─── Backup + Write ───────────────────────────────────────────────────────────

mkdirSync(BACKUP_DIR, { recursive: true })
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
copyFileSync(SOURCE, join(BACKUP_DIR, `penyakit.pre-enrichment.${timestamp}.bak.json`))
console.log(`\n[backup] Saved to ${BACKUP_DIR}/`)

const output = {
  _metadata: {
    ...raw._metadata,
    last_updated: new Date().toISOString(),
    enrichment_applied: timestamp,
    enrichment_source: 'gemini-2.0-flash',
  },
  penyakit: updated,
}

writeFileSync(SOURCE, JSON.stringify(output, null, 2), 'utf-8')
console.log(`[done] Written to ${SOURCE}`)
console.log(`       ${appliedCount} entries enriched`)

// ─── Final stats ──────────────────────────────────────────────────────────────

const finalMissingPF = updated.filter(e => !e.pemeriksaan_fisik?.length).length
const finalMissingRF = updated.filter(e => !e.red_flags?.length).length
console.log(`\nPost-enrichment stats:`)
console.log(`  Missing pemeriksaan_fisik: ${finalMissingPF}`)
console.log(`  Missing red_flags: ${finalMissingRF}`)
