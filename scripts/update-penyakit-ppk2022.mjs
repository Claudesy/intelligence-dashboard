/**
 * update-penyakit-ppk2022.mjs
 * Updates public/data/penyakit.json to align with PPK 2022:
 *   - KMK HK.01.07/MENKES/1186/2022 (PPK Dokter FKTP Mei 2022)
 *   - KMK HK.01.07/MENKES/1936/2022 (amandemen, tambah COVID-19 + update protokol)
 *
 * Changes applied:
 *   1. DIS-035  Faringitis         — update terapi dengan dosis PPK 2022
 *   2. DIS-038  Asma bronkial      — isi terapi (sebelumnya kosong)
 *   3. DIS-042  Hipertensi         — tambah pilihan obat antihipertensi
 *   4. DIS-063  Gonore             — isi terapi dual (sebelumnya kosong)
 *   5. DIS-082  DM Tipe 2          — tambah Glimepirid + Acarbose (PPK 2022)
 *   6. DIS-145  ISPA               — klarifikasi indikasi antibiotik
 *   7. DIS-146  Nasofaringitis     — ganti Pseudoefedrin → Loratadin (Fornas 2023)
 *   8. NEW      COVID-19 U07.1     — entri baru dari KMK 1936/2022
 *
 * Usage:
 *   node scripts/update-penyakit-ppk2022.mjs           # dry-run
 *   node scripts/update-penyakit-ppk2022.mjs --apply   # write changes
 */

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SOURCE = join(ROOT, 'public', 'data', 'penyakit.json')
const BACKUP_DIR = join(ROOT, 'database', 'backups')
const APPLY = process.argv.includes('--apply')

// ─── PPK 2022 Therapy Updates ─────────────────────────────────────────────────
// Keyed by disease ID. Only `terapi` is updated + kriteria_rujukan where needed.
// Source: KMK 1186/2022 + 1936/2022; Fornas KMK 2197/2023.
// ─────────────────────────────────────────────────────────────────────────────

const PPK_2022_UPDATES = {
  'DIS-035': {
    // Faringitis Akut (J02) — PPK 2022
    // Antibiotik HANYA untuk faringitis bakteri (streptokokus grup A terkonfirmasi/klinis tinggi)
    terapi: [
      {
        obat: 'Parasetamol',
        dosis: '500 mg',
        frek: '3-4x sehari prn (simtomatik demam dan nyeri tenggorok)',
      },
      {
        obat: 'Amoksisilin',
        dosis: '500 mg',
        frek: '3x sehari selama 10 hari (HANYA faringitis bakteri/streptokokus grup A)',
      },
      {
        obat: 'Benzatin Penisilin G',
        dosis: '1,2 juta IU IM',
        frek: 'Dosis tunggal intramuskular (alternatif — kepatuhan minum obat rendah)',
      },
      {
        obat: 'Eritromisin',
        dosis: '500 mg',
        frek: '4x sehari selama 10 hari (jika alergi penisilin)',
      },
    ],
    kriteria_rujukan:
      'Rujuk jika: faringitis luetika (sifilis), tanda komplikasi (epiglotitis, abses peritonsiler, abses retrofaringeal), septikemia, gejala tidak membaik dalam 3 hari terapi antibiotik.',
  },

  'DIS-038': {
    // Asma Bronkial (J45) — PPK 2022 (GINA 2022)
    // Penatalaksanaan FKTP:
    //   - Serangan ringan: bronkodilator kerja pendek (SABA)
    //   - Serangan sedang: SABA + kortikosteroid oral
    //   - Persiap rujukan untuk serangan berat
    terapi: [
      {
        obat: 'Salbutamol inhaler MDI',
        dosis: '100-200 mcg (1-2 semprotan)',
        frek: 'Tiap 4-6 jam saat serangan ringan (SABA — reliever/penyelamat)',
      },
      {
        obat: 'Salbutamol tablet',
        dosis: '2-4 mg',
        frek: '3x sehari (jika inhaler tidak tersedia — kurang optimal)',
      },
      {
        obat: 'Salbutamol inhalasi nebulizer',
        dosis: '2,5-5 mg dalam 3-4 ml NaCl 0,9%',
        frek: 'Tiap 20 menit × 3 dosis jika serangan sedang (nebulisasi IGD)',
      },
      {
        obat: 'Prednison tablet',
        dosis: '20-40 mg',
        frek: 'Sekali sehari selama 5-7 hari (eksaserbasi sedang, tapering tidak perlu jika ≤7 hari)',
      },
      {
        obat: 'Metilprednisolon tablet',
        dosis: '4-8 mg',
        frek: '3x sehari selama 5-7 hari (alternatif prednison)',
      },
    ],
    kriteria_rujukan:
      'Rujuk segera ke IGD jika: serangan berat (tidak bicara kalimat lengkap, RR >30/menit, SpO2 <92%, tidak respons SABA), status asmatikus, asma dengan komplikasi, eksaserbasi berulang >2x/minggu.',
  },

  'DIS-042': {
    // Hipertensi Esensial (I10) — PPK 2022
    // Target: TD <140/90 (umum); <130/80 (DM, PGK, riwayat CVD)
    // Lini pertama: CCB atau ACEi atau diuretik tiazid (pilih sesuai komorbid)
    terapi: [
      {
        obat: 'Amlodipin',
        dosis: '5-10 mg',
        frek: 'Sekali sehari (CCB — pilihan utama, terutama isolasi sistolik/lansia)',
      },
      {
        obat: 'Lisinopril',
        dosis: '5-10 mg',
        frek: 'Sekali sehari (ACEi — pilihan utama DM+HT, CKD+proteinuria)',
      },
      {
        obat: 'Kaptopril',
        dosis: '12,5-25 mg',
        frek: '2-3x sehari (ACEi kerja pendek — alternatif, bisa untuk krisis)',
      },
      {
        obat: 'Hidroklortiazid (HCT)',
        dosis: '12,5-25 mg',
        frek: 'Sekali sehari pagi (diuretik tiazid — kombinasi dengan CCB/ACEi)',
      },
      {
        obat: 'Bisoprolol',
        dosis: '2,5-5 mg',
        frek: 'Sekali sehari (beta-bloker — komorbid gagal jantung/angina/AF)',
      },
    ],
    kriteria_rujukan:
      'Rujuk jika: TD >180/110 tidak respons 3 obat (hipertensi resisten), suspek hipertensi sekunder (muda, refrakter), target organ damage (stroke, IMA, gagal ginjal, hipertensive urgency/emergency), kehamilan dengan hipertensi berat.',
  },

  'DIS-063': {
    // Gonore (A54) — PPK 2022
    // Dual therapy WAJIB: cover N. gonorrhoeae + C. trachomatis ko-infeksi
    // Per WHO/PPK 2022: sefiksim + azitromisin (karena resistensi terhadap fluorokuinolon)
    terapi: [
      {
        obat: 'Sefiksim',
        dosis: '400 mg',
        frek: 'Dosis tunggal oral (lini pertama gonore tanpa komplikasi — PPK 2022)',
      },
      {
        obat: 'Azithromycin',
        dosis: '1000 mg (1 g)',
        frek: 'Dosis tunggal oral (WAJIB bersamaan — terapi dual cover klamidia)',
      },
      {
        obat: 'Kotrimoksazol Forte',
        dosis: '960 mg (2 tablet forte)',
        frek: '2x sehari selama 7 hari (alternatif jika sefiksim + azithromycin tidak tersedia)',
      },
    ],
    kriteria_rujukan:
      'Rujuk jika: tidak dapat melakukan pemeriksaan laboratorium, tidak respons terapi dalam 7 hari, gonore dengan komplikasi (PID, epididimitis, diseminata), gonore pada kehamilan.',
  },

  'DIS-082': {
    // Diabetes Melitus Tipe 2 (E11) — PPK 2022
    // Target: HbA1c <7% (umum); <8% untuk lansia/hipoglikemia risiko tinggi
    // Lini pertama: Metformin (kecuali kontraindikasi)
    // Add-on: sulfonilurea atau acarbose (Fornas 2023 FKTP)
    terapi: [
      {
        obat: 'Metformin HCl',
        dosis: '500-850 mg',
        frek: '2-3x sehari bersama makan (lini pertama; titrasi s.d. 2000 mg/hari toleransi GI)',
      },
      {
        obat: 'Glimepirid',
        dosis: '1-4 mg',
        frek: 'Sekali sehari sebelum makan pagi (sulfonilurea — add-on jika HbA1c tidak terkontrol)',
      },
      {
        obat: 'Acarbose',
        dosis: '50 mg',
        frek: '3x sehari bersama suapan pertama (FKTP Fornas 2023 — hiperglikemia postprandial)',
      },
      {
        obat: 'Insulin NPH (Insulin Kerja Sedang)',
        dosis: '0,1-0,2 IU/kgBB/hari',
        frek: 'Injeksi subkutan sebelum tidur (jika HbA1c >9% tidak terkontrol OAD atau saat hiperglikemia akut)',
      },
    ],
    kriteria_rujukan:
      'Rujuk jika: HbA1c >9% setelah 3 bulan terapi optimal, komplikasi organ target (nefropati, retinopati, neuropati berat), hipoglikemia berulang, DM Tipe 1, kehamilan dengan DM.',
  },

  'DIS-145': {
    // ISPA Akut Atas (J06) — PPK 2022
    // ANTIBIOTIK TIDAK RUTIN — mayoritas ISPA adalah infeksi virus
    // Antibiotik hanya jika: demam >7 hari, sekret purulen hijau+demam tinggi,
    // tanda infeksi bakteri (leukositosis, CRP tinggi), pneumonia
    terapi: [
      {
        obat: 'Parasetamol',
        dosis: '500 mg',
        frek: '3-4x sehari prn (demam >38°C atau nyeri)',
      },
      {
        obat: 'CTM (Klorfeniramin Maleat)',
        dosis: '4 mg',
        frek: '3x sehari (rhinorrhea/hidung meler — antihistamin generasi 1)',
      },
      {
        obat: 'Loratadin',
        dosis: '10 mg',
        frek: 'Sekali sehari (pilihan PPK 2022 — non-sedatif, aman dewasa produktif)',
      },
      {
        obat: 'N-asetilsistein',
        dosis: '200 mg',
        frek: '3x sehari (batuk produktif dengan dahak kental — mukolitik Fornas 2023)',
      },
      {
        obat: 'Amoksisilin',
        dosis: '500 mg',
        frek: '3x sehari 5-7 hari (HANYA jika terbukti/kuat dugaan infeksi bakteri sekunder — TIDAK rutin)',
      },
    ],
    kriteria_rujukan:
      'Rujuk jika: tanda pneumonia (RR >24/mnt, SpO2 <94%, ronki basah), gejala >10 hari memburuk, tanda komplikasi (sinusitis berat, otitis media dengan efusi), anak <3 bulan atau immunocompromised.',
  },

  'DIS-146': {
    // Nasofaringitis Akut / Common Cold (J00) — PPK 2022
    // Penyebab 99% adalah virus (rhinovirus, coronavirus, RSV)
    // TIDAK ada antibiotik. Terapi simtomatik saja.
    // Pseudoefedrin tidak lagi direkomendasikan di Fornas 2023 FKTP
    terapi: [
      {
        obat: 'Parasetamol',
        dosis: '500 mg',
        frek: '3-4x sehari prn (demam atau nyeri kepala)',
      },
      {
        obat: 'Loratadin',
        dosis: '10 mg',
        frek: 'Sekali sehari (rhinorrhea — antihistamin non-sedatif, pilihan PPK 2022)',
      },
      {
        obat: 'CTM (Klorfeniramin Maleat)',
        dosis: '4 mg',
        frek: '3x sehari (alternatif loratadin — antihistamin generasi 1, efek sedatif)',
      },
      {
        obat: 'Vitamin C',
        dosis: '500 mg',
        frek: 'Sekali sehari selama 5-7 hari (suplementasi imunomodulator)',
      },
    ],
    kriteria_rujukan:
      'Umumnya tidak perlu rujukan. Rujuk jika gejala menetap >10 hari, komplikasi (sinusitis, otitis media, pneumonia), atau tanda distress pernafasan.',
  },
}

// ─── New disease entry: COVID-19 (KMK 1936/2022) ────────────────────────────
const COVID_ENTRY = {
  id: 'DIS-COVID',
  kki_no: null,
  nama: 'COVID-19',
  nama_en: 'COVID-19 (Coronavirus Disease 2019)',
  icd10: 'U07.1',
  kompetensi: '4A',
  body_system: 'SISTEM PERNAPASAN',
  can_refer: true,
  definisi:
    'Penyakit infeksi saluran napas yang disebabkan SARS-CoV-2. Kompetensi 4A untuk kasus ringan–sedang tanpa hipoksemia bermakna (SpO2 ≥94%).',
  gejala_klinis: [
    'Demam >37,5°C (hari 1-14 paparan)',
    'Batuk kering atau produktif',
    'Nyeri tenggorokan',
    'Anosmia dan/atau ageusia (khas COVID-19)',
    'Sesak napas ringan (SpO2 ≥94%)',
    'Kelelahan dan mialgia',
    'Nyeri kepala',
    'Mual, muntah, atau diare (pada sebagian kasus)',
  ],
  pemeriksaan_fisik: [
    'Suhu tubuh >37,5°C',
    'Laju napas ringan meningkat (20-29x/menit)',
    'SpO2 ≥94% pada oximeter (nilai kritis <94%)',
    'Auskultasi paru: umumnya normal pada kasus ringan; ronki basah halus jika pneumonia',
    'Tidak ada tanda distress napas (tidak menggunakan otot bantu napas)',
    'Tekanan darah dan nadi stabil',
  ],
  diagnosis_banding: [
    'Influenza',
    'ISPA virus lain (rhinovirus, RSV, parainfluenza)',
    'Pneumonia bakteri',
    'Faringitis bakteri',
  ],
  komplikasi: [
    'Pneumonia COVID-19',
    'ARDS (Acute Respiratory Distress Syndrome)',
    'Koagulopati (trombosis)',
    'Gagal organ multipel (kasus berat)',
    'Long COVID (gejala persisten >4 minggu)',
  ],
  red_flags: [
    'SpO2 <94% (saturasi rendah — RUJUK SEGERA ke IGD)',
    'Sesak napas berat (RR ≥30x/menit atau tidak bisa kalimat penuh)',
    'Nyeri atau rasa berat di dada',
    'Gangguan kesadaran atau kebingungan mendadak',
    'Tidak mampu minum atau makan (dehidrasi berat)',
    'Sianosis perifer atau sentral',
  ],
  terapi: [
    {
      obat: 'Parasetamol',
      dosis: '500 mg',
      frek: '3-4x sehari prn (demam >38°C atau nyeri kepala/mialgia)',
    },
    {
      obat: 'Vitamin C (Asam Askorbat)',
      dosis: '500 mg',
      frek: 'Sekali sehari selama 14 hari (suplementasi imunomodulator)',
    },
    {
      obat: 'Zinc tablet',
      dosis: '20 mg',
      frek: 'Sekali sehari selama 14 hari (imunomodulator PPK 2022)',
    },
    {
      obat: 'Azithromycin',
      dosis: '500 mg',
      frek: 'Sekali sehari selama 5 hari (HANYA jika curiga ko-infeksi bakteri sekunder — tidak rutin)',
    },
  ],
  kriteria_rujukan:
    'Rujuk ke FKRTL (IGD RS) jika: SpO2 <94%, RR ≥30x/menit, tidak mampu minum/makan, gangguan kesadaran, nyeri dada, komorbid berat tidak terkontrol (DM, gagal jantung, imunosupresi), usia >60 tahun dengan gejala sedang-berat, atau kondisi memburuk di hari 5-7.',
  source: 'PPK Dokter FKTP — KMK HK.01.07/MENKES/1936/2022',
}

// ─── Load + process ───────────────────────────────────────────────────────────
const raw = JSON.parse(readFileSync(SOURCE, 'utf-8'))
let updatedCount = 0

const updatedPenyakit = raw.penyakit.map(entry => {
  const update = PPK_2022_UPDATES[entry.id]
  if (!update) return entry

  const patched = { ...entry }
  if (update.terapi !== undefined) patched.terapi = update.terapi
  if (update.kriteria_rujukan !== undefined) patched.kriteria_rujukan = update.kriteria_rujukan
  patched.source = 'PPK Dokter FKTP — KMK HK.01.07/MENKES/1186/2022 + 1936/2022'
  updatedCount++
  return patched
})

// Check if COVID-19 entry already exists
const covidExists = raw.penyakit.some(
  e => e.icd10 === 'U07.1' || (e.nama && e.nama.toLowerCase().includes('covid'))
)

// ─── Stats & Preview ──────────────────────────────────────────────────────────
console.log('=== UPDATE PENYAKIT — PPK 2022 ===')
console.log(`Entries updated  : ${updatedCount}`)
console.log(`COVID-19 exists  : ${covidExists}`)
console.log(`COVID-19 to add  : ${covidExists ? 'No (already present)' : 'Yes (DIS-COVID)'}`)
console.log('')

if (!APPLY) {
  console.log('=== ENTRIES TO UPDATE ===')
  for (const [id, patch] of Object.entries(PPK_2022_UPDATES)) {
    const entry = raw.penyakit.find(e => e.id === id)
    if (!entry) {
      console.log(`  [${id}] NOT FOUND in penyakit.json`)
      continue
    }
    const prevTerapiCount = entry.terapi?.length ?? 0
    const newTerapiCount = patch.terapi?.length ?? prevTerapiCount
    console.log(
      `  [${id}] ${entry.nama} (${entry.icd10}) — terapi: ${prevTerapiCount} → ${newTerapiCount} items`
    )
    if (patch.terapi) {
      patch.terapi.forEach(t => console.log(`         + ${t.obat} ${t.dosis}`))
    }
  }
  if (!covidExists) {
    console.log('')
    console.log('  [DIS-COVID] COVID-19 (U07.1) — NEW ENTRY')
    console.log(`         terapi: ${COVID_ENTRY.terapi.length} items`)
    console.log(`         pemeriksaan_fisik: ${COVID_ENTRY.pemeriksaan_fisik.length} items`)
    console.log(`         red_flags: ${COVID_ENTRY.red_flags.length} items`)
  }
  console.log('')
  console.log('[DRY-RUN] No files written. Re-run with --apply to commit.')
  process.exit(0)
}

// ─── Backup + Write ───────────────────────────────────────────────────────────
mkdirSync(BACKUP_DIR, { recursive: true })
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
copyFileSync(SOURCE, join(BACKUP_DIR, `penyakit.pre-ppk2022.${ts}.bak.json`))
console.log(`[backup] Saved to database/backups/`)

const finalPenyakit = covidExists ? updatedPenyakit : [...updatedPenyakit, COVID_ENTRY]

const output = {
  _metadata: {
    ...raw._metadata,
    last_updated: new Date().toISOString(),
    ppk_2022_applied: ts,
    ppk_source: 'KMK HK.01.07/MENKES/1186/2022 + 1936/2022',
    fornas_source: 'KMK HK.01.07/MENKES/2197/2023 + 1818/2024',
    count: finalPenyakit.length,
  },
  penyakit: finalPenyakit,
}

writeFileSync(SOURCE, JSON.stringify(output, null, 2), 'utf-8')
console.log(`[done] Written → ${SOURCE}`)
console.log(`       ${updatedCount} entries updated, ${covidExists ? 0 : 1} new entry added`)
console.log(`       Total entries: ${finalPenyakit.length}`)
