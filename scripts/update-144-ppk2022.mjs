/**
 * update-144-ppk2022.mjs
 * Sync PPK 2022 (KMK HK.01.07/MENKES/1186/2022 + amendment 1936/2022)
 * therapy changes into database/144_penyakit_puskesmas.json
 *
 * Changes:
 *   ID 30 (Rinitis Akut J00)    — Replace Pseudoefedrin → Loratadin
 *   ID 35 (ISPA J06.9)          — Replace Ambroksol → N-Asetilsistein; add Loratadin
 *   ID 37 (Faringitis J02.9)    — Add Benzatin Penisilin G to second_line
 *   ID 39 (Asma J45.9)          — Add Salbutamol nebulizer to first_line, Metilprednisolon to second_line
 *   NEW  (COVID-19 U07.1)       — Add new entry per KMK 1936/2022
 *
 * No changes needed: ID 43 (HTN), ID 65 (Gonore), ID 84 (DM Tipe 2)
 * — these are already PPK 2022 compliant.
 *
 * Usage:
 *   node scripts/update-144-ppk2022.mjs            # dry-run
 *   node scripts/update-144-ppk2022.mjs --apply    # write file
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const SOURCE = resolve(ROOT, 'database/144_penyakit_puskesmas.json')
const APPLY = process.argv.includes('--apply')

// ─────────────────────────────────────────────────────────────────────────────
// PPK 2022 patch definitions (keyed by entry ID)
// ─────────────────────────────────────────────────────────────────────────────

const PATCHES = {
  /** ID 30: Rinitis Akut J00 — Replace Pseudoefedrin with Loratadin */
  30: entry => {
    const pt = entry.pharmacotherapy
    pt.first_line = pt.first_line.filter(d => !d.drug.toLowerCase().includes('pseudoefedrin'))
    const hasLoratadin = pt.first_line.some(d => d.drug.toLowerCase().includes('loratadin'))
    if (!hasLoratadin) {
      pt.first_line.push({
        drug: 'Loratadin',
        dose: '10 mg',
        route: 'oral',
        frequency: '1x/hari',
        duration: '3-5 hari',
        max_dose: '10 mg/hari',
        note: 'Antihistamin generasi 2 — Fornas 2023 (menggantikan Pseudoefedrin)',
      })
    }
    const hasCTM = pt.first_line.some(
      d => d.drug.toLowerCase().includes('ctm') || d.drug.toLowerCase().includes('klorfeniramin')
    )
    if (!hasCTM) {
      pt.first_line.push({
        drug: 'CTM (Klorfeniramin Maleat)',
        dose: '4 mg',
        route: 'oral',
        frequency: '3x/hari',
        duration: '3-5 hari',
        max_dose: '12 mg/hari',
      })
    }
    return entry
  },

  /** ID 35: ISPA J06.9 — Replace Ambroksol → N-Asetilsistein; add Loratadin */
  35: entry => {
    const pt = entry.pharmacotherapy
    // Replace Ambroksol with N-Asetilsistein
    pt.first_line = pt.first_line.filter(d => !d.drug.toLowerCase().includes('ambroksol'))
    const hasNAC = pt.first_line.some(
      d =>
        d.drug.toLowerCase().includes('asetilsistein') ||
        d.drug.toLowerCase().includes('acetylcystein')
    )
    if (!hasNAC) {
      pt.first_line.push({
        drug: 'N-Asetilsistein',
        dose: '200 mg',
        route: 'oral',
        frequency: '3x/hari',
        duration: '5-7 hari',
        max_dose: '600 mg/hari',
        note: 'Mukolitik — menggantikan Ambroksol per PPK 2022',
      })
    }
    // Add Loratadin
    const hasLoratadin = pt.first_line.some(d => d.drug.toLowerCase().includes('loratadin'))
    if (!hasLoratadin) {
      pt.first_line.push({
        drug: 'Loratadin',
        dose: '10 mg',
        route: 'oral',
        frequency: '1x/hari',
        duration: '3-5 hari',
        max_dose: '10 mg/hari',
        note: 'Antihistamin — Fornas 2023',
      })
    }
    // Add antibiotic as conditional second_line with explicit indication
    const hasAmox = pt.second_line?.some(d => d.drug.toLowerCase().includes('amoksisilin'))
    if (!hasAmox) {
      if (!pt.second_line) pt.second_line = []
      pt.second_line.push({
        drug: 'Amoksisilin',
        dose: '500 mg',
        route: 'oral',
        frequency: '3x/hari',
        duration: '5-7 hari',
        max_dose: '1500 mg/hari',
        note: 'Hanya jika curiga infeksi bakteri sekunder — TIDAK rutin',
      })
    }
    return entry
  },

  /** ID 37: Faringitis Akut J02.9 — Add Benzatin Penisilin G to second_line */
  37: entry => {
    const pt = entry.pharmacotherapy
    const hasBenzatin = pt.second_line?.some(
      d => d.drug.toLowerCase().includes('benzatin') || d.drug.toLowerCase().includes('penisilin')
    )
    if (!hasBenzatin) {
      if (!pt.second_line) pt.second_line = []
      pt.second_line.unshift({
        drug: 'Benzatin Penisilin G',
        dose: '1,2 juta IU',
        route: 'IM',
        frequency: 'dosis tunggal',
        duration: 'sekali',
        max_dose: '1,2 juta IU',
        note: 'Streptococcal pharyngitis — pilihan saat kepatuhan oral sulit; mencegah demam rematik',
      })
    }
    return entry
  },

  /** ID 39: Asma J45.9 — Add Salbutamol nebulizer to first_line; Metilprednisolon to second_line */
  39: entry => {
    const pt = entry.pharmacotherapy
    const hasNebul = pt.first_line.some(
      d =>
        d.drug.toLowerCase().includes('nebul') ||
        (d.drug.toLowerCase().includes('salbutamol') && d.route?.toLowerCase().includes('nebul'))
    )
    if (!hasNebul) {
      // Insert nebulizer after MDI entry
      const mdiIdx = pt.first_line.findIndex(
        d => d.drug.toLowerCase().includes('mdi') || d.drug.toLowerCase().includes('inhaler')
      )
      const nebEntry = {
        drug: 'Salbutamol nebulizer',
        dose: '2,5 mg dalam 3 ml NaCl 0,9%',
        route: 'nebulisasi',
        frequency: 'tiap 20 menit (maks 3 dosis pada serangan akut)',
        duration: 'serangan akut',
        max_dose: '7,5 mg/sesi',
        note: 'Untuk serangan sedang-berat atau ketika MDI tidak efektif',
      }
      if (mdiIdx >= 0) {
        pt.first_line.splice(mdiIdx + 1, 0, nebEntry)
      } else {
        pt.first_line.push(nebEntry)
      }
    }
    const hasMetilpred = pt.second_line?.some(d =>
      d.drug.toLowerCase().includes('metilprednisolon')
    )
    if (!hasMetilpred) {
      if (!pt.second_line) pt.second_line = []
      pt.second_line.push({
        drug: 'Metilprednisolon',
        dose: '4-8 mg',
        route: 'oral',
        frequency: '1x/hari pagi',
        duration: '3-5 hari (serangan akut)',
        max_dose: '32 mg/hari',
        note: 'Alternatif Prednison oral per PPK 2022',
      })
    }
    return entry
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// COVID-19 new entry (U07.1) — KMK 1936/2022
// ─────────────────────────────────────────────────────────────────────────────

const COVID_ENTRY = {
  id: 145,
  system: 'Sistem Pernafasan',
  name: 'COVID-19 (Penyakit Coronavirus 2019)',
  icd10: 'U07.1',
  pharmacotherapy: {
    first_line: [
      {
        drug: 'Parasetamol',
        dose: '500-1000 mg',
        route: 'oral',
        frequency: '3-4x/hari',
        duration: 'sesuai gejala',
        max_dose: '3000 mg/hari',
        note: 'Antipiretik dan analgesik simtomatik',
      },
      {
        drug: 'Vitamin D3',
        dose: '1000-5000 IU',
        route: 'oral',
        frequency: '1x/hari',
        duration: 'minimal 14 hari',
        max_dose: '5000 IU/hari',
        note: 'Imunomodulator — suplementasi per KMK 1936/2022',
      },
      {
        drug: 'Vitamin C',
        dose: '500 mg',
        route: 'oral',
        frequency: '2-3x/hari',
        duration: '14 hari',
        max_dose: '1500 mg/hari',
      },
      {
        drug: 'Zinc',
        dose: '20 mg',
        route: 'oral',
        frequency: '1x/hari',
        duration: '14 hari',
        max_dose: '20 mg/hari',
      },
    ],
    second_line: [
      {
        drug: 'Oseltamivir',
        dose: '75 mg',
        route: 'oral',
        frequency: '2x/hari',
        duration: '5 hari',
        max_dose: '150 mg/hari',
        note: 'Jika ada ko-infeksi influenza atau risiko tinggi',
      },
    ],
    prophylaxis: [
      {
        drug: 'Vaksin COVID-19',
        dose: 'sesuai jadwal nasional',
        route: 'IM',
        frequency: 'sesuai program',
        duration: 'program nasional',
        max_dose: 'sesuai jenis vaksin',
      },
    ],
  },
  non_pharmacotherapy: [
    'Isolasi mandiri minimal 10 hari sejak onset gejala',
    'Istirahat cukup dan hidrasi adekuat',
    'Monitoring saturasi oksigen — rujuk jika SpO2 < 95%',
    'Ventilasi ruangan yang baik',
    'Edukasi protokol kesehatan dan pencegahan penularan',
    'Pemantauan gejala deteriorasi setiap 24-48 jam',
  ],
  referral_criteria: [
    'Saturasi oksigen < 95% atau sesak napas',
    'Frekuensi napas > 30x/menit',
    'Penurunan kesadaran',
    'Komorbid tidak terkontrol (DM, HTN, gagal jantung)',
    'Usia > 60 tahun dengan gejala sedang-berat',
    'Tidak ada perbaikan setelah 5-7 hari isolasi mandiri',
  ],
  tags: ['respirasi', 'infeksi-virus', 'pandemi', 'ppk-2022', 'kewaspadaan-tinggi'],
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

const raw = readFileSync(SOURCE, 'utf-8')
const data = JSON.parse(raw)
const diseases = data.diseases

const changeLog = []

// Apply patches
for (const [idStr, patchFn] of Object.entries(PATCHES)) {
  const id = Number.parseInt(idStr, 10)
  const idx = diseases.findIndex(d => d.id === id)
  if (idx < 0) {
    console.warn(`  [WARN] Entry ID ${id} not found — skipped`)
    continue
  }
  const before = JSON.stringify(diseases[idx].pharmacotherapy)
  patchFn(diseases[idx])
  const after = JSON.stringify(diseases[idx].pharmacotherapy)
  if (before !== after) {
    changeLog.push({
      id,
      name: diseases[idx].name,
      icd10: diseases[idx].icd10,
    })
  }
}

// Add COVID-19 if not present
const hasCovid = diseases.some(d => d.icd10 === 'U07.1' || d.icd10?.startsWith('U07'))
let covidAdded = false
if (!hasCovid) {
  diseases.push(COVID_ENTRY)
  covidAdded = true
}

// Print report
console.log('=== UPDATE 144 PENYAKIT — PPK 2022 ===')
console.log(`Entries patched : ${changeLog.length}`)
console.log(`COVID-19 added  : ${covidAdded ? 'Yes (U07.1)' : 'No (already exists)'}`)
console.log('')
console.log('=== CHANGES ===')
changeLog.forEach(c => {
  console.log(`  [ID ${c.id}] ${c.name} (${c.icd10}) — pharmacotherapy updated`)
})
if (covidAdded) {
  console.log(`  [ID 145] COVID-19 (U07.1) — NEW ENTRY`)
}

if (!APPLY) {
  console.log('\n[DRY-RUN] No files written. Re-run with --apply to commit.')
  process.exit(0)
}

// Backup
const backupDir = resolve(ROOT, 'database/backups')
if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true })
const ts = new Date().toISOString().replace(/[:.]/g, '-')
const backupPath = resolve(backupDir, `144_penyakit_puskesmas.pre-ppk2022.${ts}.bak.json`)
copyFileSync(SOURCE, backupPath)
console.log(`\n[backup] Saved to database/backups/`)

// Write
writeFileSync(SOURCE, JSON.stringify(data, null, 2) + '\n', 'utf-8')
console.log(`[done] Written → ${SOURCE}`)
console.log(
  `       ${changeLog.length} entries patched, ${covidAdded ? '1 new entry added' : 'no new entries'}`
)
console.log(`       Total entries: ${diseases.length}`)
