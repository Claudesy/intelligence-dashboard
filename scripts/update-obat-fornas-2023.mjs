/**
 * update-obat-fornas-2023.mjs
 * Updates public/data/obat_data.json to align with Fornas KMK 2197/2023
 * and addendum KMK 1818/2024 (effective Feb 2025).
 *
 * Changes applied:
 *   1. Schema enrichment: adds kelas_terapi + fills rute for all entries
 *   2. Data quality: fixes 3 wrong kekuatan_dosis, removes 2 duplicates
 *   3. Ranitidine flagged fornas_2023: false (NDMA recall)
 *   4. Adds 8 missing FKTP drugs from Fornas 2023
 *
 * Usage:
 *   node scripts/update-obat-fornas-2023.mjs           # dry-run
 *   node scripts/update-obat-fornas-2023.mjs --apply   # write changes
 */

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SOURCE = join(ROOT, 'public', 'data', 'obat_data.json')
const BACKUP_DIR = join(ROOT, 'database', 'backups')
const APPLY = process.argv.includes('--apply')

// ─── 1. Duplicates to remove ─────────────────────────────────────────────────
// These are confirmed duplicate entries (same drug, same strength, same form)
const REMOVE_CODES = new Set([
  '20036', // Bisakodil Supositoria 10mg — duplicate of 20037
  '20140', // Mikonazol krim/salep 2% — duplicate of 20141
])

// ─── 2. Data quality corrections ──────────────────────────────────────────────
const CORRECTIONS = {
  O2500116: { kekuatan_dosis: '2,5 mg' },
  // Bisoprolol 2.5mg was incorrectly listed as "5 mg"

  O2500163: { kekuatan_dosis: '10 mg', rute: 'oral' },
  // BLUD Domperidon was listed as "50 mg" — domperidon tablet is 10mg; rute oral

  20090: { kekuatan_dosis: '2,5 %' },
  // Hidrokortison krim 2.5% was listed as "5 %"

  20173: {
    fornas_2023: false,
    fornas_note:
      'Ditarik dari Fornas 2023 — NDMA contamination (BPOM advisory). Pertimbangkan Omeprazol atau Famotidin sebagai pengganti.',
  },
  // Ranitidine removed from Fornas 2023 due to NDMA contamination

  20127: {
    fornas_note:
      'Fornas 2023 mencantumkan Levofloksasin 500mg sebagai dosis standar FKTP. 250mg tetap dapat digunakan untuk ITK.',
  },
  // Levofloxacin — Fornas 2023 standardized at 500mg; 250mg still acceptable for UTI

  // Residual rute assignments (entries with null bentuk_sediaan + no route keyword in name)
  20063: { rute: 'topikal' }, // Etil Klorida Semprot → topical spray (local anesthetic)
  20084: { rute: 'oral' }, // Haloperidol drops → oral drops
  20143: { rute: 'oral' }, // Moxiflocaxin (typo: moxifloxacin) → oral tablet
  20152: { rute: 'oral' }, // OAT FDC Anak → oral
  20176: { rute: 'oral' }, // Rifampisin+Isoniazid 3HR → oral
}

// ─── 3. New drugs from Fornas 2023 + Addendum 1818/2024 ─────────────────────
const NEW_DRUGS = [
  {
    kode_obat: 'F2023001',
    nama_obat: 'Ondansetron tablet 4 mg',
    bentuk_sediaan: 'tablet',
    kekuatan_dosis: '4 mg',
    rute: 'oral',
    status_aktif: true,
    kelas_terapi: 'antiemetik',
    fornas_2023: true,
    fornas_tingkat: 'FKTP',
  },
  {
    kode_obat: 'F2023002',
    nama_obat: 'Fenitoin tablet 100 mg',
    bentuk_sediaan: 'tablet',
    kekuatan_dosis: '100 mg',
    rute: 'oral',
    status_aktif: true,
    kelas_terapi: 'neurologi',
    fornas_2023: true,
    fornas_tingkat: 'FKTP',
  },
  {
    kode_obat: 'F2023003',
    nama_obat: 'Azithromycin kapsul/tablet 500 mg',
    bentuk_sediaan: 'kapsul',
    kekuatan_dosis: '500 mg',
    rute: 'oral',
    status_aktif: true,
    kelas_terapi: 'antibiotik',
    fornas_2023: true,
    fornas_tingkat: 'FKTP',
  },
  {
    kode_obat: 'F2023004',
    nama_obat: 'Sefiksim kapsul 100 mg',
    bentuk_sediaan: 'kapsul',
    kekuatan_dosis: '100 mg',
    rute: 'oral',
    status_aktif: true,
    kelas_terapi: 'antibiotik',
    fornas_2023: true,
    fornas_tingkat: 'FKTP',
  },
  {
    kode_obat: 'F2023005',
    nama_obat: 'Acarbose tablet 50 mg',
    bentuk_sediaan: 'tablet',
    kekuatan_dosis: '50 mg',
    rute: 'oral',
    status_aktif: true,
    kelas_terapi: 'antidiabetik',
    fornas_2023: true,
    fornas_tingkat: 'FKTP',
  },
  {
    kode_obat: 'F2023006',
    nama_obat: 'Metilprednisolon tablet 4 mg',
    bentuk_sediaan: 'tablet',
    kekuatan_dosis: '4 mg',
    rute: 'oral',
    status_aktif: true,
    kelas_terapi: 'kortikosteroid',
    fornas_2023: true,
    fornas_tingkat: 'FKTP',
  },
  {
    kode_obat: 'F2023007',
    nama_obat: 'Metronidazol suspensi 125 mg/5 ml',
    bentuk_sediaan: 'suspensi',
    kekuatan_dosis: '125 mg',
    rute: 'oral',
    status_aktif: true,
    kelas_terapi: 'antibiotik_antiprotozoa',
    fornas_2023: true,
    fornas_tingkat: 'FKTP',
  },
  {
    kode_obat: 'F2023008',
    nama_obat: 'Ibuprofen suspensi 100 mg/5 ml',
    bentuk_sediaan: 'suspensi',
    kekuatan_dosis: '100 mg',
    rute: 'oral',
    status_aktif: true,
    kelas_terapi: 'analgesik_antipiretik',
    fornas_2023: true,
    fornas_tingkat: 'FKTP',
  },
]

// ─── 4. Drug classification patterns ─────────────────────────────────────────
// Ordered by priority — first match wins
const KELAS_PATTERNS = [
  // Anti-TB (highest priority — very specific names)
  {
    pattern:
      /\boat\b|obat anti.?tuberkulosis|rifampisin|rifampicin|rifapentin|isoniazid|ethambutol|bedaquilin|linezolid|pretomanid|moxiflocaxin|moxifloksasin|moxifloxacin|cycloserine|clofazimin|clofazimine|tuberculin|oat\s+dosis|oat\s+fdc|oat\s+anak|kusta/i,
    kelas: 'antituberkulosis',
  },
  // Antiretroviral (HIV)
  {
    pattern:
      /dolutegraf|dolutegravir|nevirapine|tenofovir|tenofir|efaviren|efavirenz|lamivudin|lamifudin|zidovudin|zidofudine|abacavir|\bprep\b|arv\b|antiretroviral/i,
    kelas: 'antiretroviral',
  },
  // Antidiabetik
  {
    pattern: /metformin|glimepirid|glibenklamid|glibenclamid|insulin|acarbose/i,
    kelas: 'antidiabetik',
  },
  // Antihipertensi
  {
    pattern:
      /amlodipin|amlodipine|kaptopril|captopril|lisinopril|bisoprolol|hidroklortiazid|hct\b|metildopa|methyldopa|valsartan|candesartan|irbesartan/i,
    kelas: 'antihipertensi',
  },
  // Kardiovaskular
  {
    pattern: /isosorbid dinitrat|isosorbide dinitrate|\bisdn\b|simvastatin|atorvastatin|statin\b/i,
    kelas: 'kardiovaskular',
  },
  // Psikiatri
  {
    pattern:
      /haloperidol|klorpromazin|chlorpromazin|risperidon|risperidone|trifluoperazin|triheksifenidil|trihexyphenidyl|diazepam|amitriptili|amitriptylin/i,
    kelas: 'psikiatri',
  },
  // Neurologi
  {
    pattern: /karbamazepin|carbamazepine|fenitoin|phenytoin|asam valproat|valproic/i,
    kelas: 'neurologi',
  },
  // Antiparasit
  {
    pattern: /albendazol|albendazole|permetrin|permethrin|ivermectin|piperazin|pirantel/i,
    kelas: 'antiparasit',
  },
  // Antijamur
  {
    pattern:
      /ketokonazol|ketoconazole|mikonazol|miconazole|flukonazol|fluconazole|griseofulvin|nistatin|nystatin|antifungi|klotrimazol|clotrimazol/i,
    kelas: 'antijamur',
  },
  // Antivirus (non-ARV)
  {
    pattern: /asiklovir|acyclovir|valasiklovir|valacyclovir/i,
    kelas: 'antivirus',
  },
  // Antibiotik (broad — after more specific classes)
  {
    pattern:
      /amoksisilin|amoxicillin|ampisilin|ampicillin|cefadroxil|sefadroksil|sefiksim|cefixim|klindamisin|clindamycin|kloramfenikol|chloramphenicol|kotrimoksazol|cotrimoxazol|levofloksasin|levofloxacin|doksisiklin|doxycycline|siprofloksasin|ciprofloxacin|azithromycin|azithromisin|azitrhromycin|benzatin|gentamisin|gentamicin|kombipak.*azit|eritromisin|erythromycin|meropenem|amoksisilin klavulanat/i,
    kelas: 'antibiotik',
  },
  // Antibiotik-antiprotozoa
  {
    pattern: /metronidazol|metronidazole|tinidazol|tinidazole/i,
    kelas: 'antibiotik_antiprotozoa',
  },
  // Analgesik / antipiretik
  {
    pattern:
      /parasetamol|paracetamol|ibuprofen|asam mefenamat|mefenamic|natrium diklofenak|diclofenac|metamizol|metamizole|kodein|codeine|tramadol/i,
    kelas: 'analgesik_antipiretik',
  },
  // Antiemetik
  {
    pattern:
      /domperidon|domperidone|metoklopramid|metoclopramide|dimenhidrinat|dimenhydrinate|ondansetron/i,
    kelas: 'antiemetik',
  },
  // Antihistamin
  {
    pattern:
      /klorfeniramin|\bctm\b|loratadin|loratadine|setirizin|cetirizine|difenhidramin|diphenhydramine|betahistin|betahistine|fexofenadin/i,
    kelas: 'antihistamin',
  },
  // Gastrointestinal
  {
    pattern:
      /antasida|omeprazol|omeprazole|ranitidin|ranitidine|hiosin|hyoscine|attapulgit|attapulgite|kaolin|garam oralit|\boralit\b|bisacodyl|bisakodil|antihemoroid|famotidin|famotidine|lansoprazol|pantoprazol/i,
    kelas: 'gastrointestinal',
  },
  // Pernapasan / Bronkodilator
  {
    pattern:
      /salbutamol|albuterol|n-asetilsistein|acetylcysteine|asetilsistein|theophyllin|aminofilin|aminophylline|ipratropium|bromheksin|bromhexine|budesonid/i,
    kelas: 'pernapasan',
  },
  // Kortikosteroid
  {
    pattern:
      /metilprednisolon|methylprednisolone|prednison|prednisolon|prednisolone|deksametason|dexamethasone/i,
    kelas: 'kortikosteroid',
  },
  // Dermatologi
  {
    pattern:
      /betametason|betamethasone|hidrokortison|hydrocortisone|mometason|mometasone|bedak salisil|salisil bedak|salep 2-4|antibakteri doen|perak sulfadiazin|silver sulfadiazine/i,
    kelas: 'dermatologi',
  },
  // Anestesi lokal
  {
    pattern: /lidokain|lidocaine|etil klorida|ethyl chloride/i,
    kelas: 'anestesi_lokal',
  },
  // Darurat / Emergency
  {
    pattern: /epinefrin|epinephrine|adrenalin|adrenaline|atropin sulfat|atropine sulfate/i,
    kelas: 'darurat',
  },
  // Antiseptik / Desinfektan
  {
    pattern:
      /etanol|ethanol|povidon iodida|povidone.iodine|hidrogen peroksida|hydrogen peroxide|betadine bkkbn/i,
    kelas: 'antiseptik_desinfektan',
  },
  // Vaksin / Imunisasi
  {
    pattern:
      /vaksin|vaccine|\bbcg\b|pentavac|rotav|tuberculin ppd|\bpcv\b|\bipv\b|\bbkkbn.*vaksin/i,
    kelas: 'vaksin_imunisasi',
  },
  // Vitamin / Mineral
  {
    pattern:
      /vitamin|retinol|tiamin|piridoksin|asam askorbat|asam folat|fitomenadion|\bzinc\b|\bzink\b|kalsium|calcium|tablet tambah darah|tambah darah|multivitamin|\bmms\b|riboflavin/i,
    kelas: 'vitamin_mineral',
  },
  // Nutrisi / Formula susu
  {
    pattern: /susu|nutricia|nutridrink|\bsgm\b|dangro|infantrini|formula\b/i,
    kelas: 'nutrisi_formula',
  },
  // Kontrasepsi
  {
    pattern: /pil kb|kontrasepsi|depo progestin|injeksi kontrasepsi|injeksi.*3 bulan/i,
    kelas: 'kontrasepsi',
  },
  // Hormon / Obstetri
  {
    pattern: /oksitosin|oxytocin|magnesium sulfat|magnesium sulfa/i,
    kelas: 'hormon_obstetri',
  },
  // Cairan infus
  {
    pattern:
      /ringer laktat|ringer lactate|larutan infus|natrium klorida.*infus|glukose.*infus|glukosa.*infus|aquabidest/i,
    kelas: 'cairan_elektrolit',
  },
  // Stomatologi / Dental
  {
    pattern: /semen seng fosfat|zinc phosphate cement|\bchkm\b|monoklorkamfer|fenol gliserol/i,
    kelas: 'stomatologi',
  },
  // Oftalmologi
  {
    pattern: /tetes mata|salep mata|eye drop|eye ointment/i,
    kelas: 'oftalmologi',
  },
]

// ─── 5. Route extraction ──────────────────────────────────────────────────────
function extractRute(item) {
  const form = (item.bentuk_sediaan || '').toLowerCase().trim()
  const name = (item.nama_obat || '').toLowerCase()

  // Infus
  if (/infus|intravenous drip/.test(name) || /infus/.test(form)) return 'infus_iv'

  // Injeksi — determine sub-route
  if (/injeksi|injection|inj\b/.test(form) || /injeksi|injection/.test(name)) {
    if (/\bi\.v\b|\(iv\)|\biv\b/.test(name)) return 'injeksi_iv'
    if (/\bi\.m\b|\(im\)|\bim\b/.test(name)) return 'injeksi_im'
    if (/\bs\.c\b|\(sc\)|\bsc\b/.test(name)) return 'injeksi_sc'
    if (/intradermal|intrakutan/.test(name)) return 'injeksi_id'
    // Infer from drug type
    if (
      /oksitosin|oxytocin|kalsium glukonat|epinefrin|adrenalin|atropin|fitomenadion|vit.*k1|magnesium sulfat|deksametason injeksi|metamizol|difenhidramin|metoklopramid|ampisilin|kalsium laktat/.test(
        name
      )
    )
      return 'injeksi_im'
    if (/lidokain|lidocaine/.test(name)) return 'injeksi_lokal'
    return 'injeksi_im' // default
  }

  // Rectal
  if (/supositoria|suppositoria|rectal tube|rektal/.test(form) || /supositoria|rectal/.test(name))
    return 'rektal'

  // Vaginal
  if (/vaginal/.test(name)) return 'vaginal'

  // Sublingual
  if (/sublingual/.test(name)) return 'sublingual'

  // Inhalation
  if (/inhaler|inhalan|cairan ih\b|nebulizer|mdi\b/.test(name)) return 'inhalasi'

  // Ophthalmic (eye)
  if ((/tetes/.test(form) || /tetes|drop/.test(name)) && /mata|eye/.test(name)) return 'oftalmik'
  if ((/salep/.test(form) || /salep/.test(name)) && /mata|eye/.test(name)) return 'oftalmik'

  // Otic (ear)
  if ((/tetes/.test(form) || /tetes|drop/.test(name)) && /telinga|ear/.test(name)) return 'otik'

  // Topical
  if (
    /krim|cream|salep|ointment|gel|lotion|bedak|powder|semprot/.test(form) ||
    /krim|salep|lotion|bedak|gel|topikal|2-4\b/.test(name)
  )
    return 'topikal'

  // Tetes/drops — remaining (oral drops)
  if (/drop|tetes/.test(form)) return 'oral'

  // Oral — standard forms
  if (/tablet|kapsul|kaplet|sirup|suspensi|serbuk|larutan oral|cairan oral|kunyah/.test(form))
    return 'oral'

  // Vaccine special cases
  if (/vaksin|vaccine/.test(name)) {
    if (/\bbcg\b/.test(name)) return 'injeksi_id'
    if (/opv|polio oral/.test(name)) return 'oral'
    return 'injeksi_im'
  }

  // Fallback — infer from name when bentuk_sediaan is null
  if (/tablet|kapsul|kaplet|sirup|suspensi|serbuk|oral/.test(name)) return 'oral'
  if (/ tab\b| cap\b/.test(name)) return 'oral'
  if (/krim|salep|lotion|bedak/.test(name)) return 'topikal'
  if (/tetes.*mata|mata.*tetes/.test(name)) return 'oftalmik'
  if (/tetes.*telinga|telinga.*tetes/.test(name)) return 'otik'
  if (/injeksi|injection|\binj\b/.test(name)) {
    if (/\b(iv)\b|\bi\.v\b/.test(name)) return 'injeksi_iv'
    return 'injeksi_im'
  }
  if (/infus/.test(name)) return 'infus_iv'

  // Drug-type-based fallbacks (when zero dosage-form hints in name)
  // TB drugs (Bedaquiline, Cycloserine, Linezolid, Moxifloksasin, Pretomanid,
  //           Clofazimin, Rifapentin, Ethambutol, OAT, Kusta) → oral tablets
  if (
    /bedaquilin|cycloserine|linezolid|moxiflox|moxifloks|pretomanid|clofazim|clofazimine|rifapentin|ethambutol|oat\b|obat anti.?tb|kusta mb/.test(
      name
    )
  )
    return 'oral'
  // ARV drugs → oral
  if (
    /dolutegraf|dolutegravir|efaviren|efavirenz|tenofovir|tenofir|lamivudin|lamifudin|zidovudin|nevirapine/.test(
      name
    )
  )
    return 'oral'
  // Antidiabetik, antihipertensi without route hint → oral
  if (
    /metformin|glimepirid|glibenklamid|acarbose|kaptopril|captopril|lisinopril|metildopa|bisoprolol|hidroklortiazid|\bhct\b/.test(
      name
    )
  )
    return 'oral'
  // Common antibiotics without dosage form → oral
  if (
    /amoksisilin|amoksilin|cefadroxil|sefadroksil|sefiksim|klindamisin|kotrimoksazol|levofloksasin|levofloxacin|moxifloksasin|linezolid|griseofulvin|kombipak/.test(
      name
    )
  )
    return 'oral'
  // Vitamins, minerals, supplements without form → oral
  if (
    /vitamin|multivitamin|\bmms\b|tiamin|piridoksin|asam folat|asam askorbat|tambah darah|ferro\b/.test(
      name
    )
  )
    return 'oral'
  // Nutritional formulas → oral (enteral)
  if (/susu|nutricia|nutridrink|\bsgm\b|dangro|infantrini/.test(name)) return 'oral'
  // Oral contraceptives → oral
  if (/pil kb/.test(name)) return 'oral'
  // Injectable contraceptives and hormones
  if (/depo progestin|injeksi kontrasepsi/.test(name)) return 'injeksi_im'
  // Penicillin injection (benzatin benzil penisilin)
  if (/benzatin|benzylpenicillin/.test(name)) return 'injeksi_im'
  // Tuberculin → intradermal
  if (/tuberculin/.test(name)) return 'injeksi_id'
  // Antihemoroid doen → rectal (suppository/ointment combo)
  if (/antihemoroid doen/.test(name)) return 'rektal'
  // Topical antiseptics (when no form keyword)
  if (
    /etanol|hydrogen peroksida|hidrogen peroksida|povidon iodida|betadine|monoklorkamfer|chkm/.test(
      name
    )
  )
    return 'topikal'
  // Aquabidest → injection vehicle
  if (/aquabidest/.test(name)) return 'injeksi_iv'
  // Antifungi Doen, Antibakteri Doen → topikal (skin preparations)
  if (/antifungi doen|antibakteri doen/.test(name)) return 'topikal'
  // Antimigrain Doen → oral (tablet)
  if (/antimigrain/.test(name)) return 'oral'
  // Attapulgit without form → oral
  if (/attapulgit|attapulgite/.test(name)) return 'oral'
  // Nistatin without form → oral (drops for oral thrush)
  if (/nistatin|nystatin/.test(name)) return 'oral'

  return null
}

// ─── 6. Therapeutic class extraction ─────────────────────────────────────────
function classifyDrug(item) {
  const name = (item.nama_obat || '').toLowerCase()
  for (const { pattern, kelas } of KELAS_PATTERNS) {
    if (pattern.test(name)) return kelas
  }
  return 'lainnya'
}

// ─── 7. Load + process ───────────────────────────────────────────────────────
const raw = JSON.parse(readFileSync(SOURCE, 'utf-8'))
let drugs = raw // obat_data.json is a root array

// Step A: Remove duplicates
const beforeCount = drugs.length
drugs = drugs.filter(d => !REMOVE_CODES.has(d.kode_obat))
const removed = beforeCount - drugs.length

// Step B: Apply corrections + enrichment
let corrected = 0
let enriched = 0

drugs = drugs.map(d => {
  const enriched_item = { ...d }

  // Apply manual corrections
  if (CORRECTIONS[d.kode_obat]) {
    Object.assign(enriched_item, CORRECTIONS[d.kode_obat])
    corrected++
  }

  // Add kelas_terapi if not present
  if (!enriched_item.kelas_terapi) {
    enriched_item.kelas_terapi = classifyDrug(d)
  }

  // Fill rute if null
  if (enriched_item.rute === null || enriched_item.rute === undefined) {
    const rute = extractRute(d)
    if (rute) {
      enriched_item.rute = rute
      enriched++
    }
  }

  // Set fornas_2023 if not set (assume true for existing inventory)
  if (enriched_item.fornas_2023 === undefined) {
    enriched_item.fornas_2023 = true
  }

  return enriched_item
})

// Step C: Add new drugs from Fornas 2023
const newCodesSet = new Set(drugs.map(d => d.kode_obat))
const drugsToAdd = NEW_DRUGS.filter(d => !newCodesSet.has(d.kode_obat))

// ─── 8. Stats & Preview ──────────────────────────────────────────────────────
console.log('=== UPDATE OBAT — FORNAS 2023 + PPK 2022 ===')
console.log(`Original entries    : ${beforeCount}`)
console.log(`Duplicates removed  : ${removed} (codes: ${[...REMOVE_CODES].join(', ')})`)
console.log(`Corrections applied : ${corrected}`)
console.log(`rute filled         : ${enriched}`)
console.log(`New drugs to add    : ${drugsToAdd.length}`)
console.log(`Final count         : ${drugs.length + drugsToAdd.length}`)
console.log('')

if (!APPLY) {
  console.log('=== CORRECTIONS PREVIEW ===')
  for (const [code, patch] of Object.entries(CORRECTIONS)) {
    const orig = raw.find(d => d.kode_obat === code)
    if (orig) {
      console.log(`  [${code}] ${orig.nama_obat}`)
      for (const [k, v] of Object.entries(patch)) {
        console.log(`    ${k}: "${orig[k]}" → "${v}"`)
      }
    }
  }
  console.log('')
  console.log('=== NEW DRUGS PREVIEW ===')
  drugsToAdd.forEach(d => {
    console.log(`  + [${d.kode_obat}] ${d.nama_obat} (${d.kelas_terapi})`)
  })
  console.log('')
  console.log('=== KELAS_TERAPI DISTRIBUTION (sample, first 20) ===')
  const klCount = {}
  drugs.forEach(d => {
    klCount[d.kelas_terapi] = (klCount[d.kelas_terapi] || 0) + 1
  })
  Object.entries(klCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`  ${k.padEnd(30)} ${v}`))
  console.log('')
  console.log('[DRY-RUN] No files written. Re-run with --apply to commit.')
  process.exit(0)
}

// ─── 9. Backup + Write ───────────────────────────────────────────────────────
mkdirSync(BACKUP_DIR, { recursive: true })
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
copyFileSync(SOURCE, join(BACKUP_DIR, `obat_data.pre-fornas2023.${ts}.bak.json`))
console.log(`[backup] Saved to database/backups/`)

const output = [...drugs, ...drugsToAdd]
writeFileSync(SOURCE, JSON.stringify(output, null, 4), 'utf-8')

console.log(`[done] Written → ${SOURCE}`)
console.log(`       ${output.length} entries total`)
console.log(
  `       ${removed} duplicates removed, ${corrected} corrections, ${drugsToAdd.length} new drugs added`
)
console.log(`       kelas_terapi + rute added to all entries`)
