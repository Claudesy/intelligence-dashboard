/**
 * apply-clinical-patches.mjs
 * Applies clinical-patches.json to penyakit.json.
 * Source: PPK IDI 2013 / SKDI 2012 / PPK Dokter di FKTP 2017
 *
 * Usage:
 *   node scripts/apply-clinical-patches.mjs           # dry-run
 *   node scripts/apply-clinical-patches.mjs --apply   # write changes
 */

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const SOURCE = join(ROOT, 'public', 'data', 'penyakit.json')
const PATCHES = join(ROOT, 'database', 'clinical-patches.json')
const BACKUP_DIR = join(ROOT, 'database', 'backups')

const APPLY = process.argv.includes('--apply')

const raw = JSON.parse(readFileSync(SOURCE, 'utf-8'))
const patches = JSON.parse(readFileSync(PATCHES, 'utf-8'))

let applied = 0
let skipped = 0
const log = []

const updated = raw.penyakit.map(entry => {
  const patch = patches[entry.id]
  if (!patch) return entry

  const e = { ...entry }
  let changed = false

  if (patch.pemeriksaan_fisik && !entry.pemeriksaan_fisik?.length) {
    e.pemeriksaan_fisik = patch.pemeriksaan_fisik
    changed = true
    log.push(
      `[${entry.id}] ${entry.nama} → +pemeriksaan_fisik (${patch.pemeriksaan_fisik.length} items)`
    )
  }

  if (patch.red_flags && !entry.red_flags?.length) {
    e.red_flags = patch.red_flags
    changed = true
    log.push(`[${entry.id}] ${entry.nama} → +red_flags (${patch.red_flags.length} items)`)
  }

  if (changed) applied++
  else skipped++

  return e
})

// Stats
const afterPF = updated.filter(e => !e.pemeriksaan_fisik?.length).length
const afterRF = updated.filter(e => !e.red_flags?.length).length

console.log('=== APPLY CLINICAL PATCHES ===')
console.log(`Patches available : ${Object.keys(patches).length} entries`)
console.log(`Entries to update : ${applied}`)
console.log(`Already complete  : ${skipped}`)
console.log('')
log.forEach(l => console.log(' ', l))
console.log('')
console.log(`After apply — missing pemeriksaan_fisik: ${afterPF}`)
console.log(`After apply — missing red_flags        : ${afterRF}`)

if (!APPLY) {
  console.log('\n[DRY-RUN] No files written. Run with --apply to commit.')
  process.exit(0)
}

mkdirSync(BACKUP_DIR, { recursive: true })
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
copyFileSync(SOURCE, join(BACKUP_DIR, `penyakit.pre-patch.${ts}.bak.json`))

const output = {
  _metadata: {
    ...raw._metadata,
    last_updated: new Date().toISOString(),
    clinical_patches_applied: ts,
    patch_source: 'PPK IDI 2013 / SKDI 2012 / PPK Dokter FKTP 2017',
  },
  penyakit: updated,
}

writeFileSync(SOURCE, JSON.stringify(output, null, 2), 'utf-8')
console.log(`\n[done] Written → ${SOURCE}`)
console.log(`       ${applied} entries enriched, backup at database/backups/`)
