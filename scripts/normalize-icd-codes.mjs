/**
 * normalize-icd-codes.mjs
 * Normalizes composite ICD-10 codes in 144_penyakit_puskesmas.json
 * and expands icdx-extensions.json with proper code mappings.
 *
 * Usage:
 *   node scripts/normalize-icd-codes.mjs           # dry-run
 *   node scripts/normalize-icd-codes.mjs --apply   # write changes
 */

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const DISEASES_FILE = join(ROOT, 'database', '144_penyakit_puskesmas.json')
const EXT_FILE = join(ROOT, 'database', 'icdx-extensions.json')
const BACKUP_DIR = join(ROOT, 'database', 'backups')

const APPLY = process.argv.includes('--apply')

// ─── Normalization Map ─────────────────────────────────────────────────────────
// Keys are the composite codes as they appear in the source file.
// primary: the ICD-10-2010 code to use for e-Klaim
// secondary: alternative codes (stored in icd10_secondary array)
// note: reason for the mapping

const COMPOSITE_MAP = {
  'A06.0/A03.9': {
    primary: 'A06.0',
    primaryDisplay: 'Acute amoebic dysentery',
    secondary: ['A03.9'],
    note: 'Disentri Basiler (A03.9) dan Disentri Amuba (A06.0). Kode primer A06.0 digunakan untuk amoeba; kode sekunder A03.9 untuk basiler.',
  },
  'K64.0/K64.1': {
    primary: 'I84',
    primaryDisplay: 'Haemorrhoids (ICD-10-2010)',
    secondary: ['K64.0', 'K64.1'],
    note: 'K64 adalah kode ICD-10-CM (WHO 2016+), tidak ada di ICD-10-2010. Untuk e-Klaim BPJS gunakan I84 (Haemorrhoids ICD-10-2010).',
  },
  'O70.0/O70.1': {
    primary: 'O70.0',
    primaryDisplay: 'First degree perineal laceration during delivery',
    secondary: ['O70.1'],
    note: 'Ruptur perineum tingkat 1 (O70.0) dan tingkat 2 (O70.1). Kode primer O70.0; O70.1 untuk kasus tingkat 2.',
  },
  'A90/A91': {
    primary: 'A90',
    primaryDisplay: 'Dengue fever [classical dengue]',
    secondary: ['A91'],
    note: 'Demam Dengue (A90) dan DBD (A91). Kode primer A90; gunakan A91 jika sudah dikonfirmasi DBD.',
  },
}

// Parafimosis: N47.2 → N47 (subkode tidak ada di ICD-10-2010)
const SINGLE_FIX = {
  'N47.2': {
    primary: 'N47',
    primaryDisplay: 'Redundant prepuce, phimosis and paraphimosis',
    note: 'N47.2 tidak ada di ICD-10-2010. Gunakan N47 (kategori induk) untuk e-Klaim BPJS.',
  },
}

// ─── Extensions to add to icdx-extensions.json ───────────────────────────────

const NEW_EXTENSIONS = [
  {
    code: 'K64.0',
    display: 'Internal haemorrhoids, grade I (ICD-10-CM)',
    legacyCode: 'I84',
  },
  {
    code: 'K64.1',
    display: 'Internal haemorrhoids, grade II (ICD-10-CM)',
    legacyCode: 'I84',
  },
  {
    code: 'N47.2',
    display: 'Paraphimosis (ICD-10-CM)',
    legacyCode: 'N47',
  },
  {
    code: 'A03.9',
    display: 'Shigellosis, unspecified (secondary code for Disentri Basiler)',
    legacyCode: 'A03',
  },
  {
    code: 'O70.1',
    display: 'Second degree perineal laceration during delivery',
    legacyCode: 'O70',
  },
  {
    code: 'A91',
    display: 'Dengue haemorrhagic fever (secondary, use when DHF confirmed)',
    legacyCode: 'A90',
  },
]

// ─── Load ─────────────────────────────────────────────────────────────────────

const raw = JSON.parse(readFileSync(DISEASES_FILE, 'utf-8'))
const diseases = raw.diseases

// ─── Audit ────────────────────────────────────────────────────────────────────

const toFix = diseases.filter(e => COMPOSITE_MAP[e.icd10] || SINGLE_FIX[e.icd10])

console.log('=== NORMALIZATION DRY-RUN ===')
console.log(`Total diseases: ${diseases.length}`)
console.log(`Entries to normalize: ${toFix.length}`)
console.log('')

for (const entry of toFix) {
  const mapping = COMPOSITE_MAP[entry.icd10] || SINGLE_FIX[entry.icd10]
  const hasSecondary = 'secondary' in mapping
  console.log(`[${entry.id}] ${entry.name}`)
  console.log(`  Before: icd10 = "${entry.icd10}"`)
  console.log(`  After:  icd10 = "${mapping.primary}"`)
  if (hasSecondary) {
    console.log(`          icd10_secondary = ${JSON.stringify(mapping.secondary)}`)
  }
  console.log(`  Note: ${mapping.note}`)
  console.log('')
}

console.log(`Extensions to add to icdx-extensions.json: ${NEW_EXTENSIONS.length}`)
NEW_EXTENSIONS.forEach(e => console.log(`  + ${e.code} → ${e.legacyCode} (${e.display})`))

if (!APPLY) {
  console.log('\n[DRY-RUN] No files written. Re-run with --apply to commit changes.')
  process.exit(0)
}

// ─── Backup ───────────────────────────────────────────────────────────────────

mkdirSync(BACKUP_DIR, { recursive: true })
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
copyFileSync(DISEASES_FILE, join(BACKUP_DIR, `144_penyakit.${timestamp}.bak.json`))
copyFileSync(EXT_FILE, join(BACKUP_DIR, `icdx-extensions.${timestamp}.bak.json`))
console.log(`\n[backup] Saved to ${BACKUP_DIR}/`)

// ─── Normalize diseases ───────────────────────────────────────────────────────

const normalizedDiseases = diseases.map(entry => {
  const compositeMap = COMPOSITE_MAP[entry.icd10]
  const singleFix = SINGLE_FIX[entry.icd10]

  if (compositeMap) {
    return {
      ...entry,
      icd10: compositeMap.primary,
      icd10_secondary: compositeMap.secondary,
      icd10_note: compositeMap.note,
    }
  }

  if (singleFix) {
    return {
      ...entry,
      icd10: singleFix.primary,
      icd10_note: singleFix.note,
    }
  }

  return entry
})

// ─── Update metadata ──────────────────────────────────────────────────────────

const updatedRaw = {
  metadata: {
    ...raw.metadata,
    last_updated: new Date().toISOString(),
    normalization_applied: timestamp,
  },
  diseases: normalizedDiseases,
}

writeFileSync(DISEASES_FILE, JSON.stringify(updatedRaw, null, 2), 'utf-8')
console.log(`[done] Written to ${DISEASES_FILE}`)

// ─── Expand icdx-extensions.json ─────────────────────────────────────────────

const existingExt = JSON.parse(readFileSync(EXT_FILE, 'utf-8'))
const existingCodes = new Set(existingExt.map(e => e.code))
const toAdd = NEW_EXTENSIONS.filter(e => !existingCodes.has(e.code))

const mergedExt = [...existingExt, ...toAdd]
writeFileSync(EXT_FILE, JSON.stringify(mergedExt, null, 2), 'utf-8')
console.log(
  `[done] icdx-extensions.json updated: ${existingExt.length} → ${mergedExt.length} entries (+${toAdd.length} added)`
)
