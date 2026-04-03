// Blueprinted & built by Claudesy.
/**
 * Pre-compute embeddings untuk 171 penyakit KKI
 * Jalankan sekali: node scripts/generate-embeddings.mjs
 * Output: public/data/penyakit-vectors.json
 *
 * Rate limit: 1500 RPM free tier — pakai delay 50ms antar request
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// Load env
const env = readFileSync(join(ROOT, '.env.local'), 'utf-8')
const API_KEY = env.match(/GEMINI_API_KEY=(.+)/)?.[1]?.trim()
if (!API_KEY) {
  console.error('GEMINI_API_KEY tidak ditemukan di .env.local')
  process.exit(1)
}

// Load penyakit DB
const db = JSON.parse(readFileSync(join(ROOT, 'public', 'data', 'penyakit.json'), 'utf-8'))
const penyakit = db.penyakit ?? []
console.log(`Total penyakit: ${penyakit.length}`)

// Buat teks representasi per penyakit untuk embedding
function buildDiseaseText(d) {
  const parts = [
    d.nama,
    d.definisi ?? '',
    ...(d.gejala ?? []),
    ...(d.red_flags ?? []),
    ...(d.diagnosis_banding ?? []),
  ]
  return parts.filter(Boolean).join('. ')
}

// Call Gemini Embedding API
async function embedText(text) {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text }] },
        taskType: 'SEMANTIC_SIMILARITY',
        outputDimensionality: 768,
      }),
    }
  )
  const d = await r.json()
  if (d.error) throw new Error(`Gemini error: ${JSON.stringify(d.error)}`)
  return d.embedding.values
}

// Delay helper
const delay = ms => new Promise(res => setTimeout(res, ms))

// Main
const vectors = []
let success = 0
let failed = 0

for (let i = 0; i < penyakit.length; i++) {
  const d = penyakit[i]
  const text = buildDiseaseText(d)

  try {
    const vector = await embedText(text)
    vectors.push({ icd10: d.icd10, nama: d.nama, vector })
    success++
    process.stdout.write(`\r[${i + 1}/${penyakit.length}] ✓ ${d.icd10} ${d.nama.substring(0, 40)}`)
  } catch (e) {
    console.error(`\n✗ FAILED ${d.icd10}: ${e.message}`)
    failed++
    // Retry sekali setelah 2 detik
    await delay(2000)
    try {
      const vector = await embedText(text)
      vectors.push({ icd10: d.icd10, nama: d.nama, vector })
      success++
      failed--
    } catch {
      vectors.push({ icd10: d.icd10, nama: d.nama, vector: null })
    }
  }

  // Rate limit: 50ms antar request
  if (i < penyakit.length - 1) await delay(50)
}

console.log(`\n\nSelesai: ${success} sukses, ${failed} gagal`)

// Simpan output
const output = {
  _metadata: {
    generated_at: new Date().toISOString(),
    model: 'gemini-embedding-001',
    dimensions: 768,
    task_type: 'SEMANTIC_SIMILARITY',
    total: vectors.length,
    success,
    failed,
  },
  vectors,
}

writeFileSync(
  join(ROOT, 'public', 'data', 'penyakit-vectors.json'),
  JSON.stringify(output, null, 2),
  'utf-8'
)

console.log(`Output: public/data/penyakit-vectors.json (${vectors.length} vectors)`)
