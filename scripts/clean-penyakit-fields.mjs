/**
 * clean-penyakit-fields.mjs
 * Removes duplicate fields (gejala, terpi) from penyakit.json
 * and corrects metadata count (159 → 171).
 *
 * Usage:
 *   node scripts/clean-penyakit-fields.mjs           # preview only (dry-run)
 *   node scripts/clean-penyakit-fields.mjs --apply   # write changes
 */

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const SOURCE = join(ROOT, 'public', 'data', 'penyakit.json')
const BACKUP_DIR = join(ROOT, 'database', 'backups')

const APPLY = process.argv.includes('--apply')

// ─── Load ─────────────────────────────────────────────────────────────────────

const raw = JSON.parse(readFileSync(SOURCE, 'utf-8'))
const entries = raw.penyakit

// ─── Audit ────────────────────────────────────────────────────────────────────

let removedGejala = 0
let removedTerpi = 0
const withBothMissing = []

for (const entry of entries) {
  if ('gejala' in entry) removedGejala++
  if ('terpi' in entry) removedTerpi++
  if (!entry.pemeriksaan_fisik?.length && !entry.red_flags?.length) {
    withBothMissing.push(`${entry.id} | ${entry.nama} | ${entry.icd10}`)
  }
}

console.log('=== DRY-RUN REPORT ===')
console.log(`Total entries      : ${entries.length}`)
console.log(`'gejala' to remove : ${removedGejala}`)
console.log(`'terpi' to remove  : ${removedTerpi}`)
console.log(`Missing pemeriksaan_fisik + red_flags: ${withBothMissing.length}`)
if (withBothMissing.length > 0) {
  console.log('\nEntries missing BOTH clinical fields (for enrichment):')
  withBothMissing.forEach(e => console.log(`  - ${e}`))
}
console.log(`\nMetadata count fix : ${raw._metadata.total_diseases} → ${entries.length}`)

if (!APPLY) {
  console.log('\n[DRY-RUN] No files written. Re-run with --apply to commit changes.')
  process.exit(0)
}

// ─── Backup ───────────────────────────────────────────────────────────────────

mkdirSync(BACKUP_DIR, { recursive: true })
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const backupPath = join(BACKUP_DIR, `penyakit.${timestamp}.bak.json`)
copyFileSync(SOURCE, backupPath)
console.log(`\n[backup] Saved to ${backupPath}`)

// ─── Clean ────────────────────────────────────────────────────────────────────

const cleaned = entries.map(entry => {
  const e = { ...entry }
  delete e.gejala
  delete e.terpi
  return e
})

// ─── Update metadata ──────────────────────────────────────────────────────────

const actualCount = cleaned.length
const updatedMetadata = {
  ...raw._metadata,
  description: raw._metadata.description.replace(/\d+ Penyakit/, `${actualCount} Penyakit`),
  total_diseases: actualCount,
  with_clinical_data: actualCount,
  last_updated: new Date().toISOString(),
  merged_fields: raw._metadata.merged_fields?.filter(f => f !== 'gejala' && f !== 'terpi') ?? [],
}

const output = {
  _metadata: updatedMetadata,
  penyakit: cleaned,
}

// ─── Write ────────────────────────────────────────────────────────────────────

writeFileSync(SOURCE, JSON.stringify(output, null, 2), 'utf-8')
console.log(`[done] Written to ${SOURCE}`)
console.log(`       Removed ${removedGejala} 'gejala' fields`)
console.log(`       Removed ${removedTerpi} 'terpi' fields`)
console.log(`       Metadata count updated: ${raw._metadata.total_diseases} → ${actualCount}`)
