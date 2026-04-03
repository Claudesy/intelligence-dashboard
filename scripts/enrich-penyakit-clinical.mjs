/**
 * enrich-penyakit-clinical.mjs
 * Generates missing pemeriksaan_fisik and red_flags for penyakit.json
 * using Gemini API based on PPK IDI 2013 / SKDI 2012 guidelines.
 *
 * Output is saved to database/enrichment-output.json for manual review
 * BEFORE being applied. Run apply-enrichment.mjs after Chief approval.
 *
 * Usage:
 *   GEMINI_API_KEY=xxx node scripts/enrich-penyakit-clinical.mjs
 *   node scripts/enrich-penyakit-clinical.mjs --dry-run   # show missing only, no API calls
 *
 * Estimated: ~52 API calls (rate-limited to 1/500ms)
 */

import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const SOURCE = join(ROOT, 'public', 'data', 'penyakit.json')
const OUTPUT = join(ROOT, 'database', 'enrichment-output.json')

const DRY_RUN = process.argv.includes('--dry-run')
const RATE_LIMIT_MS = 500

const API_KEY = process.env.GEMINI_API_KEY
if (!DRY_RUN && !API_KEY) {
  console.error('ERROR: GEMINI_API_KEY environment variable not set.')
  console.error('Usage: GEMINI_API_KEY=your_key node scripts/enrich-penyakit-clinical.mjs')
  process.exit(1)
}

// ─── Load data ────────────────────────────────────────────────────────────────

const raw = JSON.parse(readFileSync(SOURCE, 'utf-8'))
const entries = raw.penyakit

// Find entries with missing clinical fields
const missing = entries.filter(e => !e.pemeriksaan_fisik?.length || !e.red_flags?.length)

console.log(`Total entries: ${entries.length}`)
console.log(`Missing pemeriksaan_fisik OR red_flags: ${missing.length}`)
console.log(
  `  - Missing pemeriksaan_fisik: ${entries.filter(e => !e.pemeriksaan_fisik?.length).length}`
)
console.log(`  - Missing red_flags: ${entries.filter(e => !e.red_flags?.length).length}`)
console.log('')

if (DRY_RUN) {
  console.log('=== ENTRIES REQUIRING ENRICHMENT ===')
  missing.forEach(e => {
    const missingFields = []
    if (!e.pemeriksaan_fisik?.length) missingFields.push('pemeriksaan_fisik')
    if (!e.red_flags?.length) missingFields.push('red_flags')
    console.log(`  [${e.id}] ${e.nama} (${e.icd10}) — missing: ${missingFields.join(', ')}`)
  })
  console.log(`\n[DRY-RUN] ${missing.length} entries would be enriched via Gemini API.`)
  console.log('Remove --dry-run and provide GEMINI_API_KEY to run enrichment.')
  process.exit(0)
}

// ─── Gemini API call ──────────────────────────────────────────────────────────

async function callGemini(entry) {
  const missingFields = []
  if (!entry.pemeriksaan_fisik?.length) missingFields.push('pemeriksaan_fisik')
  if (!entry.red_flags?.length) missingFields.push('red_flags')

  const prompt = `Anda adalah dokter klinisi Indonesia yang mengacu pada Panduan Praktik Klinis IDI 2013 dan SKDI 2012.

Berikan data klinis berbasis evidence untuk penyakit:
- Nama: ${entry.nama} (${entry.nama_en || ''})
- ICD-10: ${entry.icd10}
- Kompetensi SKDI: ${entry.kompetensi || '4A'}
- Definisi: ${entry.definisi || ''}

${entry.gejala_klinis?.length ? `Gejala klinis yang sudah ada: ${entry.gejala_klinis.join(', ')}` : ''}

Berikan HANYA field yang diminta berikut dalam format JSON valid:
${missingFields.includes('pemeriksaan_fisik') ? '"pemeriksaan_fisik": ["temuan 1", "temuan 2", ...]  // 3-6 temuan pemeriksaan fisik yang relevan, dalam Bahasa Indonesia' : ''}
${missingFields.includes('red_flags') ? '"red_flags": ["tanda 1", "tanda 2", ...]  // 3-5 tanda bahaya yang memerlukan rujukan, dalam Bahasa Indonesia' : ''}

Hanya kembalikan objek JSON. Tidak ada penjelasan tambahan.`

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
    }
  )

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Gemini API error ${resp.status}: ${err}`)
  }

  const data = await resp.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Empty response from Gemini')

  return JSON.parse(text)
}

// ─── Rate limit helper ────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── Main enrichment loop ─────────────────────────────────────────────────────

console.log(
  `Starting enrichment of ${missing.length} entries (${RATE_LIMIT_MS}ms delay between calls)...`
)
console.log('Output will be saved to database/enrichment-output.json\n')

mkdirSync(join(ROOT, 'database'), { recursive: true })

const results = []
const errors = []

for (let i = 0; i < missing.length; i++) {
  const entry = missing[i]
  const missingFields = []
  if (!entry.pemeriksaan_fisik?.length) missingFields.push('pemeriksaan_fisik')
  if (!entry.red_flags?.length) missingFields.push('red_flags')

  process.stdout.write(`[${i + 1}/${missing.length}] ${entry.id} ${entry.nama} ... `)

  try {
    const enriched = await callGemini(entry)
    results.push({
      id: entry.id,
      nama: entry.nama,
      icd10: entry.icd10,
      enriched_fields: missingFields,
      data: enriched,
      status: 'ok',
    })
    console.log('✓')
  } catch (err) {
    errors.push({ id: entry.id, nama: entry.nama, error: err.message })
    console.log(`✗ ERROR: ${err.message}`)
  }

  // Rate limit — skip delay after last item
  if (i < missing.length - 1) {
    await sleep(RATE_LIMIT_MS)
  }
}

// ─── Write output ─────────────────────────────────────────────────────────────

const output = {
  _meta: {
    generated_at: new Date().toISOString(),
    source_file: 'public/data/penyakit.json',
    model: 'gemini-2.0-flash',
    total_attempted: missing.length,
    total_success: results.length,
    total_errors: errors.length,
    instructions:
      'Review each entry below. Then run: node scripts/apply-enrichment.mjs to apply approved data.',
  },
  results,
  errors,
}

writeFileSync(OUTPUT, JSON.stringify(output, null, 2), 'utf-8')

console.log(`\n✓ Enrichment complete: ${results.length} success, ${errors.length} errors`)
console.log(`Output saved to: ${OUTPUT}`)
console.log(
  '\nIMPORTANT: Review database/enrichment-output.json before running apply-enrichment.mjs'
)
