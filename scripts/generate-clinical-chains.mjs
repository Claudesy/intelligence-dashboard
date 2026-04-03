// Architected and built by the one and only Claudesy.
/**
 * generate-clinical-chains.mjs
 * Generate clinical chain dataset untuk 50 gejala top Puskesmas.
 * Jalankan sekali: node scripts/generate-clinical-chains.mjs
 * Output: public/data/clinical-chains.json
 *
 * Setiap gejala: { clinical_entity, sifat:{formal,klinis,narasi}, lokasi[], logical_chain[], templates[], pemeriksaan:{fisik,lab,penunjang} }
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// Load env
const env = readFileSync(join(ROOT, '.env.local'), 'utf-8')
const DEEPSEEK_API_KEY = env.match(/DEEPSEEK_API_KEY=(.+)/)?.[1]?.trim()
if (!DEEPSEEK_API_KEY) {
  console.error('DEEPSEEK_API_KEY tidak ditemukan')
  process.exit(1)
}

// Output file
const OUTPUT_PATH = join(ROOT, 'public', 'data', 'clinical-chains.json')

// Resume: jika file sudah ada, load dan lanjutkan dari yang belum ada
let existingData = {}
if (existsSync(OUTPUT_PATH)) {
  try {
    existingData = JSON.parse(readFileSync(OUTPUT_PATH, 'utf-8'))
    console.log(`Resume: ${Object.keys(existingData).length} gejala sudah ada`)
  } catch {
    existingData = {}
  }
}

// 50 gejala top Puskesmas Indonesia (KKI + epidemiologi lokal)
const TOP_GEJALA = [
  'Demam',
  'Batuk',
  'Pilek',
  'Sakit Kepala',
  'Nyeri Tenggorokan',
  'Sesak Napas',
  'Mual',
  'Muntah',
  'Diare',
  'Nyeri Perut',
  'Nyeri Dada',
  'Pusing / Vertigo',
  'Lemas / Fatigue',
  'Nyeri Punggung',
  'Nyeri Sendi',
  'Gatal Kulit',
  'Ruam Kulit',
  'Bengkak Kaki',
  'Sulit BAK',
  'Nyeri BAK',
  'Perdarahan',
  'Keputihan',
  'Nyeri Haid',
  'Haid Tidak Teratur',
  'Tidak Haid',
  'Berdebar-debar',
  'Pingsan / Sinkop',
  'Kejang',
  'Kebas / Kesemutan',
  'Kelemahan Anggota Gerak',
  'Penglihatan Kabur',
  'Mata Merah',
  'Telinga Berdenging',
  'Gangguan Pendengaran',
  'Mimisan',
  'Sulit Menelan',
  'Nafsu Makan Menurun',
  'Penurunan Berat Badan',
  'Banyak Minum',
  'Banyak Kencing',
  'Nyeri Ulu Hati',
  'Kembung',
  'Sembelit',
  'BAB Berdarah',
  'BAB Hitam',
  'Bengkak Wajah',
  'Sesak saat Berbaring',
  'Batuk Darah',
  'Nyeri Betis',
  'Kuning / Ikterus',
]

const SYSTEM_PROMPT = `Kamu adalah Senior Medical Informatician yang membangun sistem autocomplete anamnesa klinis untuk Puskesmas Indonesia.

Tugasmu: Hasilkan dataset JSON untuk satu entitas klinis yang diberikan.

Output HARUS dalam format JSON persis seperti ini (tidak ada field tambahan):
{
  "clinical_entity": "nama gejala",
  "sifat": {
    "formal": ["5-8 deskripsi medis formal dalam Bahasa Indonesia"],
    "klinis": ["5-8 terminologi klinis/medis latin-indonesia campuran"],
    "narasi": ["5-8 frasa deskriptif gejala dalam bahasa awam — BUKAN kalimat orang pertama. Gunakan frasa singkat seperti: 'Batuk terus menerus', 'Panas tidak turun-turun', 'Kepala berdenyut kencang', 'Perut mulas melilit'"]
  },
  "lokasi": ["4-6 lokasi anatomis atau distribusi yang relevan, jika tidak relevan berikan []"],
  "durasi": ["4-6 variasi deskripsi durasi klinis: sejak tadi malam, sudah 3 hari, mulai 2 minggu lalu, dsb"],
  "logical_chain": ["5-8 gejala penyerta yang paling sering menyertai secara evidence-based"],
  "predictive_next": {
    "if_unilateral": ["gejala/temuan jika keluhan hanya satu sisi — isi [] jika tidak relevan"],
    "if_bilateral": ["gejala/temuan jika keluhan kedua sisi — isi [] jika tidak relevan"],
    "red_flags": ["2-4 tanda bahaya yang wajib ditanyakan"]
  },
  "templates": [
    "Template 1: {Pasien} datang dengan keluhan [GEJALA] sejak {Waktu}.",
    "Template 2: Keluhan utama berupa [GEJALA] telah dirasakan selama {Waktu}.",
    "Template 3: [GEJALA] dirasakan {Sifat}, {Lokasi}, sejak {Waktu}.",
    "Template 4: Pasien mengeluhkan [GEJALA] yang {Sifat} sejak {Waktu}, disertai {Gejala_Penyerta}.",
    "Template 5: Anamnesa: [GEJALA] onset {Waktu}, {Sifat}, faktor pemberat {Faktor}."
  ],
  "pemeriksaan": {
    "fisik": ["3-5 pemeriksaan fisik prioritas"],
    "lab": ["2-4 pemeriksaan laboratorium sesuai indikasi klinis"],
    "penunjang": ["1-3 penunjang jika indikasi kuat, atau [] jika tidak relevan"]
  }
}

Ketentuan wajib:
- Semua teks dalam Bahasa Indonesia (kecuali terminologi Latin medis)
- Variasikan sinonim: gunakan 'sejak', 'mulai dirasakan', 'mengeluhkan', 'merasa', secara bergantian
- Sifat.narasi adalah frasa deskriptif singkat (bukan kalimat subjek-predikat orang pertama seperti "saya merasa..." atau "saya sering...") — contoh benar: "Batuk terus menerus", "Demam tidak turun-turun", "Kepala berdenyut kencang"
- logical_chain harus evidence-based (bukan asumsi)
- Jangan ulangi frasa yang sama di berbagai field
- Output hanya JSON, tanpa penjelasan tambahan`

async function generateForGejala(gejala) {
  const userMsg = `Hasilkan dataset JSON untuk entitas klinis: "${gejala}". Output dalam format json.`

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMsg },
      ],
      temperature: 0.4,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(45000),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`DeepSeek error ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content ?? '{}'
  return JSON.parse(content)
}

async function main() {
  const results = { ...existingData }
  const toProcess = TOP_GEJALA.filter(g => !results[g.toLowerCase()])

  console.log(`Total: ${TOP_GEJALA.length} gejala | Perlu diproses: ${toProcess.length}`)
  console.log('')

  for (let i = 0; i < toProcess.length; i++) {
    const gejala = toProcess[i]
    const key = gejala.toLowerCase()
    const progress = `[${i + 1}/${toProcess.length}]`

    process.stdout.write(`${progress} Generating: ${gejala}...`)

    try {
      const chain = await generateForGejala(gejala)
      // Normalisasi: pastikan clinical_entity ada
      chain.clinical_entity = chain.clinical_entity || gejala
      results[key] = chain

      // Simpan setelah setiap item (resume-friendly)
      writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2), 'utf-8')
      console.log(' ✓')
    } catch (e) {
      console.log(` ✗ ERROR: ${e.message}`)
      // Lanjut ke berikutnya, jangan stop
    }

    // Rate limit: 500ms antar request
    if (i < toProcess.length - 1) {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  const total = Object.keys(results).length
  console.log('')
  console.log(`✅ Selesai: ${total} gejala tersimpan di public/data/clinical-chains.json`)
  console.log(`   Ukuran: ${Math.round(JSON.stringify(results).length / 1024)}KB`)
}

main().catch(e => {
  console.error('FATAL:', e.message)
  process.exit(1)
})
