// The vision and craft of Claudesy.
import assert from 'node:assert/strict'

import { buildFinalizationTherapyPlan } from '../src/lib/clinical/finalization-therapy-engine'
import {
  normalizeDrugNameForPrescription,
  resolveDrug,
} from '../src/lib/clinical/formulary-resolver'

function main(): void {
  const anginaPlan = buildFinalizationTherapyPlan({
    suggestion: {
      icd10_code: 'I20',
      diagnosis_name: 'Angina Pektoris',
      confidence: 0.92,
      decision_status: 'must_not_miss',
      reasoning: 'Nyeri dada tipikal mengarah ke sindrom iskemik.',
      recommended_actions: [],
      red_flags: ['Nyeri dada tipikal'],
    },
    keluhanUtama: 'nyeri dada menjalar ke lengan kiri',
    allergies: [],
    chronicDiseases: ['Hipertensi'],
    patientAge: 58,
    patientGender: 'L',
    isPregnant: false,
  })

  const byName = new Map(anginaPlan.medications.map(item => [item.name, item]))

  assert.ok(
    byName.has('Isosorbid dinitrat tablet sublingual 5 mg'),
    'ISDN sublingual harus dinormalisasi ke nama formularium aktif'
  )
  assert.ok(
    !byName.has('Aspirin'),
    'Aspirin harus disembunyikan bila tidak masuk formularium aktif'
  )
  assert.ok(
    !byName.has('Oksigen'),
    'Oksigen harus diperlakukan sebagai supportive, bukan obat farmakologi'
  )

  assert.equal(
    byName.get('Isosorbid dinitrat tablet sublingual 5 mg')?.stockStatus,
    'mapped_available'
  )
  const aspirinResolved = resolveDrug('Aspirin')
  assert.equal(aspirinResolved.status, 'not_mapped_to_formulary')
  assert.ok(
    aspirinResolved.contraindications?.absolute?.some(item =>
      item.toLowerCase().includes('perdarahan')
    ) ||
      aspirinResolved.contraindications?.comorbidity?.some(rule =>
        rule.reason.toLowerCase().includes('lambung')
      ),
    'Aspirin harus membawa warning kontraindikasi gastrointestinal'
  )

  assert.ok(anginaPlan.stockCoverageLabel.includes('di luar formularium disembunyikan'))

  const anginaWithRisks = buildFinalizationTherapyPlan({
    suggestion: {
      icd10_code: 'I20',
      diagnosis_name: 'Angina Pektoris',
      confidence: 0.91,
      decision_status: 'must_not_miss',
      recommended_actions: [],
      red_flags: ['Nyeri dada tipikal'],
    },
    keluhanUtama: 'nyeri dada saat aktivitas',
    allergies: ['Asetosal'],
    chronicDiseases: ['Asma Bronkial', 'Gastritis'],
    patientAge: 67,
    patientGender: 'L',
    isPregnant: false,
  })

  const anginaRiskByName = new Map(anginaWithRisks.medications.map(item => [item.name, item]))
  assert.ok(
    !anginaRiskByName.has('Aspirin'),
    'Aspirin tidak boleh tampil di panel terapi bila tidak masuk formularium aktif'
  )
  assert.ok(
    resolveDrug('Aspirin').contraindications?.allergy?.some(item =>
      item.toLowerCase().includes('alergi nsaid')
    ),
    'Aspirin harus tetap punya metadata warning alergi NSAID/salisilat'
  )

  const bisoprololResolved = resolveDrug('Bisoprolol')
  assert.ok(
    bisoprololResolved.contraindications?.comorbidity?.some(
      rule =>
        rule.reason.toLowerCase().includes('asma') ||
        rule.reason.toLowerCase().includes('bronkospasme')
    ),
    'Bisoprolol harus memiliki rule kontraindikasi untuk pasien asma/PPOK'
  )

  const appendicitisPlan = buildFinalizationTherapyPlan({
    suggestion: {
      icd10_code: 'K35',
      diagnosis_name: 'Apendisitis Akut',
      confidence: 0.9,
      decision_status: 'must_not_miss',
      recommended_actions: [],
      red_flags: ['Nyeri perut kanan bawah'],
    },
    keluhanUtama: 'nyeri perut kanan bawah',
    patientAge: 24,
    patientGender: 'L',
    isPregnant: false,
  })

  const appendicitisMeds = new Map(appendicitisPlan.medications.map(item => [item.name, item]))
  assert.ok(
    !appendicitisMeds.has('IV Line (NS/RL)'),
    'IV Line harus keluar dari panel pharmacology'
  )
  assert.ok(
    !appendicitisMeds.has('Puasa (NPO)'),
    'Puasa/NPO tidak boleh salah terbaca sebagai obat'
  )
  assert.ok(
    appendicitisPlan.supportive.some(item => item.includes('IV Line (NS/RL)')),
    'IV Line harus pindah ke supportive'
  )
  assert.ok(
    appendicitisPlan.supportive.some(item => item.includes('Puasa (NPO)')),
    'Puasa/NPO harus pindah ke supportive'
  )

  const salpingitisPlan = buildFinalizationTherapyPlan({
    suggestion: {
      icd10_code: 'N70',
      diagnosis_name: 'Salpingitis',
      confidence: 0.88,
      decision_status: 'recommended',
      recommended_actions: [],
      red_flags: [],
    },
    keluhanUtama: 'nyeri perut bawah dan keputihan',
    patientAge: 31,
    patientGender: 'P',
    isPregnant: false,
  })

  const salpingitisMeds = new Map(salpingitisPlan.medications.map(item => [item.name, item]))
  assert.ok(
    salpingitisMeds.has('Doksisiklin kapsul/kaplet 100 mg'),
    'Doxycycline harus dinormalisasi ke nama formularium aktif'
  )

  const diabetesPlan = buildFinalizationTherapyPlan({
    suggestion: {
      icd10_code: 'E11',
      diagnosis_name: 'Diabetes Melitus Tipe 2',
      confidence: 0.89,
      decision_status: 'recommended',
      recommended_actions: [],
      red_flags: [],
    },
    keluhanUtama: 'gula darah tinggi',
    chronicDiseases: ['Gagal Ginjal Kronis'],
    patientAge: 63,
    patientGender: 'L',
    isPregnant: false,
  })

  const diabetesByName = new Map(diabetesPlan.medications.map(item => [item.name, item]))
  assert.equal(diabetesByName.get('Metformin HCl tablet 500 mg')?.prescriptionSlot, 'utama')
  assert.equal(diabetesByName.get('Glimepirid tablet 4 mg')?.prescriptionSlot, 'utama')
  assert.ok(
    diabetesByName
      .get('Metformin HCl tablet 500 mg')
      ?.contraindications.some(
        item => item.toLowerCase().includes('ginjal') || item.toLowerCase().includes('asidosis')
      ),
    'Metformin harus memberi warning pada pasien dengan gangguan ginjal'
  )

  const salbutamolResolved = resolveDrug('Salbutamol')
  assert.ok(
    salbutamolResolved.contraindications?.comorbidity?.some(
      rule =>
        rule.reason.toLowerCase().includes('aritmia') ||
        rule.reason.toLowerCase().includes('takikardia')
    ),
    'Salbutamol harus memiliki rule warning untuk pasien dengan aritmia'
  )

  const captopril = resolveDrug('Captopril')
  assert.ok(
    captopril.contraindications?.pregnancy?.length,
    'Captopril harus punya metadata kontraindikasi kehamilan'
  )
  assert.equal(normalizeDrugNameForPrescription('Amoxicillin'), 'Amoksisilin kapsul/kaplet 500 mg')

  console.log('[formulary] I20 check passed')
  console.log(
    anginaPlan.medications.map(item => ({
      name: item.name,
      canonical: item.canonicalName,
      status: item.stockStatus,
      label: item.stockLabel,
      contraindications: item.contraindications,
    }))
  )
}

main()
