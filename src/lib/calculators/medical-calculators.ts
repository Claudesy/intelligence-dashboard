// Designed and constructed by Claudesy.
export type CalculatorCategory =
  | "Umum"
  | "Kardiovaskular"
  | "Ginjal"
  | "Obstetri"
  | "Critical Care"
  | "Neurologi";

export type CalculatorTone = "normal" | "warning" | "critical";

export type CalculatorFieldOption = {
  label: string;
  value: string;
};

export type CalculatorField =
  | {
      id: string;
      label: string;
      type: "number";
      placeholder?: string;
      step?: string;
      min?: number;
      suffix?: string;
    }
  | {
      id: string;
      label: string;
      type: "date";
    }
  | {
      id: string;
      label: string;
      type: "toggle";
      options: CalculatorFieldOption[];
    };

export type CalculatorResult = {
  primaryValue: string;
  primaryUnit?: string;
  secondaryValue?: string;
  secondaryLabel?: string;
  interpretation: string;
  tone: CalculatorTone;
  detailItems: Array<{ label: string; value: string }>;
  notes: string[];
};

export type CalculatorDefinition = {
  slug: string;
  title: string;
  category: CalculatorCategory;
  summary: string;
  clinicalUse: string;
  sourcePath: string;
  fields: CalculatorField[];
  compute: (values: Record<string, string>) => CalculatorResult | null;
};

function num(values: Record<string, string>, key: string): number {
  return Number.parseFloat(values[key] ?? "");
}

function isPositiveNumber(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function toIdDate(date: Date): string {
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function classifyBmi(bmi: number): { label: string; tone: CalculatorTone } {
  if (bmi < 18.5) return { label: "Underweight", tone: "warning" };
  if (bmi < 25) return { label: "Normal", tone: "normal" };
  if (bmi < 30) return { label: "Overweight", tone: "warning" };
  return { label: "Obesitas", tone: "critical" };
}

function egfrStage(value: number): { label: string; tone: CalculatorTone } {
  if (value >= 90) return { label: "G1 - Normal / tinggi", tone: "normal" };
  if (value >= 60) return { label: "G2 - Menurun ringan", tone: "normal" };
  if (value >= 45)
    return { label: "G3a - Menurun ringan-sedang", tone: "warning" };
  if (value >= 30)
    return { label: "G3b - Menurun sedang-berat", tone: "warning" };
  if (value >= 15) return { label: "G4 - Menurun berat", tone: "critical" };
  return { label: "G5 - Gagal ginjal", tone: "critical" };
}

function calculateBmi(values: Record<string, string>): CalculatorResult | null {
  const weight = num(values, "weight");
  const heightCm = num(values, "height");
  if (!isPositiveNumber(weight) || !isPositiveNumber(heightCm)) return null;

  const heightM = heightCm / 100;
  const bmi = weight / (heightM * heightM);
  const category = classifyBmi(bmi);

  return {
    primaryValue: bmi.toFixed(1),
    primaryUnit: "kg/m²",
    interpretation: category.label,
    tone: category.tone,
    detailItems: [
      { label: "Berat badan", value: `${weight.toFixed(0)} kg` },
      { label: "Tinggi badan", value: `${heightCm.toFixed(0)} cm` },
      { label: "Kategori", value: category.label },
    ],
    notes: [
      "BMI adalah alat skrining, bukan diagnosis komposisi tubuh.",
      "Interpretasi akhir tetap mempertimbangkan massa otot, edema, dan konteks klinis.",
    ],
  };
}

function calculateMap(values: Record<string, string>): CalculatorResult | null {
  const systolic = num(values, "systolic");
  const diastolic = num(values, "diastolic");
  if (!isPositiveNumber(systolic) || !isPositiveNumber(diastolic)) return null;

  const result = (systolic + 2 * diastolic) / 3;
  const tone: CalculatorTone = result >= 65 ? "normal" : "critical";

  return {
    primaryValue: `${Math.round(result)}`,
    primaryUnit: "mmHg",
    interpretation:
      result >= 65 ? "Perfusi organ memadai" : "Perfusi perlu perhatian",
    tone,
    detailItems: [
      { label: "Sistolik", value: `${systolic.toFixed(0)} mmHg` },
      { label: "Diastolik", value: `${diastolic.toFixed(0)} mmHg` },
      { label: "Formula", value: "[SBP + 2(DBP)] / 3" },
    ],
    notes: [
      "MAP ≥ 65 mmHg umumnya dipakai sebagai target perfusi minimal.",
      "Keputusan klinis tidak boleh hanya berdasar satu angka MAP.",
    ],
  };
}

function calculateBmr(values: Record<string, string>): CalculatorResult | null {
  const age = num(values, "age");
  const weight = num(values, "weight");
  const height = num(values, "height");
  const sex = values.sex;
  if (
    !isPositiveNumber(age) ||
    !isPositiveNumber(weight) ||
    !isPositiveNumber(height) ||
    !sex
  )
    return null;

  let result = 10 * weight + 6.25 * height - 5 * age;
  result += sex === "male" ? 5 : -161;

  return {
    primaryValue: `${Math.round(result)}`,
    primaryUnit: "kkal/hari",
    interpretation:
      sex === "male"
        ? "Estimasi kebutuhan basal laki-laki"
        : "Estimasi kebutuhan basal perempuan",
    tone: "normal",
    detailItems: [
      { label: "Usia", value: `${age.toFixed(0)} tahun` },
      { label: "Berat", value: `${weight.toFixed(0)} kg` },
      { label: "Tinggi", value: `${height.toFixed(0)} cm` },
    ],
    notes: [
      "Menggunakan rumus Mifflin-St Jeor.",
      "Belum memasukkan faktor aktivitas fisik harian.",
    ],
  };
}

function calculateEgfr(
  values: Record<string, string>,
): CalculatorResult | null {
  const creatinine = num(values, "creatinine");
  const age = num(values, "age");
  const sex = values.sex;
  if (!isPositiveNumber(creatinine) || !isPositiveNumber(age) || !sex)
    return null;

  const kappa = sex === "female" ? 0.7 : 0.9;
  const alpha = sex === "female" ? -0.241 : -0.302;
  const multiplier = sex === "female" ? 1.012 : 1;
  const term1 = Math.min(creatinine / kappa, 1) ** alpha;
  const term2 = Math.max(creatinine / kappa, 1) ** -1.2;
  const term3 = 0.9938 ** age;
  const result = 142 * term1 * term2 * term3 * multiplier;
  const stage = egfrStage(result);

  return {
    primaryValue: `${Math.round(result)}`,
    primaryUnit: "mL/min/1.73m²",
    interpretation: stage.label,
    tone: stage.tone,
    detailItems: [
      { label: "Kreatinin serum", value: `${creatinine.toFixed(2)} mg/dL` },
      { label: "Usia", value: `${age.toFixed(0)} tahun` },
      {
        label: "Jenis kelamin",
        value: sex === "male" ? "Laki-laki" : "Perempuan",
      },
    ],
    notes: [
      "Menggunakan CKD-EPI 2021 race-free formula.",
      "Untuk penyesuaian dosis obat, tetap cocokkan dengan protokol lokal.",
    ],
  };
}

function calculateCrCl(
  values: Record<string, string>,
): CalculatorResult | null {
  const age = num(values, "age");
  const weight = num(values, "weight");
  const creatinine = num(values, "creatinine");
  const sex = values.sex;
  if (
    !isPositiveNumber(age) ||
    !isPositiveNumber(weight) ||
    !isPositiveNumber(creatinine) ||
    !sex
  )
    return null;

  let result = ((140 - age) * weight) / (72 * creatinine);
  if (sex === "female") result *= 0.85;
  const tone: CalculatorTone =
    result >= 60 ? "normal" : result >= 30 ? "warning" : "critical";

  return {
    primaryValue: result.toFixed(1),
    primaryUnit: "mL/min",
    interpretation:
      result >= 60
        ? "Fungsi filtrasi cukup untuk banyak regimen standar"
        : "Perlu review penyesuaian dosis",
    tone,
    detailItems: [
      { label: "Usia", value: `${age.toFixed(0)} tahun` },
      { label: "Berat badan", value: `${weight.toFixed(0)} kg` },
      { label: "Kreatinin", value: `${creatinine.toFixed(2)} mg/dL` },
    ],
    notes: [
      "Menggunakan rumus Cockcroft-Gault.",
      "Cocok untuk pertimbangan dosis obat, bukan staging CKD utama.",
    ],
  };
}

function calculateDueDate(
  values: Record<string, string>,
): CalculatorResult | null {
  const lmp = values.lmp;
  if (!lmp) return null;
  const lmpDate = new Date(lmp);
  if (Number.isNaN(lmpDate.getTime())) return null;

  const dueDate = new Date(lmpDate);
  dueDate.setDate(dueDate.getDate() + 7);
  dueDate.setMonth(dueDate.getMonth() + 9);

  const now = new Date();
  const diffDays = Math.max(
    0,
    Math.floor((now.getTime() - lmpDate.getTime()) / (1000 * 60 * 60 * 24)),
  );
  const weeks = Math.floor(diffDays / 7);
  const days = diffDays % 7;

  return {
    primaryValue: toIdDate(dueDate),
    primaryUnit: "HPL",
    secondaryValue: `${weeks} minggu ${days} hari`,
    secondaryLabel: "Usia kehamilan",
    interpretation: "Perkiraan berdasarkan rumus Naegele",
    tone: "normal",
    detailItems: [
      { label: "HPHT", value: toIdDate(lmpDate) },
      { label: "Usia kehamilan", value: `${weeks} minggu ${days} hari` },
      { label: "Metode", value: "HPHT + 7 hari + 9 bulan" },
    ],
    notes: [
      "Asumsi siklus 28 hari dan ovulasi hari ke-14.",
      "USG tetap dianjurkan bila tanggal haid tidak pasti atau siklus tidak teratur.",
    ],
  };
}

function calculateQsofa(
  values: Record<string, string>,
): CalculatorResult | null {
  const rr = values.rr === "yes" ? 1 : 0;
  const mental = values.mental === "yes" ? 1 : 0;
  const sbp = values.sbp === "yes" ? 1 : 0;
  const answered = [values.rr, values.mental, values.sbp].every(Boolean);
  if (!answered) return null;

  const score = rr + mental + sbp;
  const tone: CalculatorTone = score >= 2 ? "critical" : "warning";

  return {
    primaryValue: `${score}`,
    primaryUnit: "/3",
    interpretation:
      score >= 2
        ? "Risiko buruk tinggi, evaluasi sepsis segera"
        : "Risiko lebih rendah, tetap pantau klinis",
    tone,
    detailItems: [
      { label: "RR ≥ 22", value: rr ? "Ya" : "Tidak" },
      { label: "Perubahan mental", value: mental ? "Ya" : "Tidak" },
      { label: "SBP ≤ 100", value: sbp ? "Ya" : "Tidak" },
    ],
    notes: [
      "qSOFA adalah alat skrining cepat, bukan diagnosis sepsis.",
      "Skor ≥ 2 perlu evaluasi organ dysfunction dan eskalasi tata laksana.",
    ],
  };
}

function calculateGcs(values: Record<string, string>): CalculatorResult | null {
  const eye = num(values, "eye");
  const verbal = num(values, "verbal");
  const motor = num(values, "motor");
  if (
    !isPositiveNumber(eye) ||
    !isPositiveNumber(verbal) ||
    !isPositiveNumber(motor)
  )
    return null;

  const total = eye + verbal + motor;
  const tone: CalculatorTone =
    total >= 13 ? "normal" : total >= 9 ? "warning" : "critical";
  const interpretation =
    total >= 13
      ? "Cedera otak ringan"
      : total >= 9
        ? "Cedera otak sedang"
        : "Cedera otak berat / koma";

  return {
    primaryValue: `${total}`,
    primaryUnit: "/15",
    interpretation,
    tone,
    detailItems: [
      { label: "Eye", value: `${eye}` },
      { label: "Verbal", value: `${verbal}` },
      { label: "Motor", value: `${motor}` },
    ],
    notes: [
      "Total GCS = Eye + Verbal + Motor.",
      "Konteks intubasi, afasia, dan sedasi tetap perlu dicatat terpisah.",
    ],
  };
}

export const MEDICAL_CALCULATORS: CalculatorDefinition[] = [
  {
    slug: "bmi-calculator",
    title: "BMI Calculator",
    category: "Umum",
    summary: "Indeks massa tubuh untuk skrining status gizi dewasa.",
    clinicalUse: "Skrining status gizi dan konseling faktor risiko metabolik.",
    sourcePath:
      "D:\\Devops\\sentraartificial\\abyss-monorepo\\projects\\medlink\\apps\\medlink\\app\\medcal\\bmi-calculator\\page.tsx",
    fields: [
      {
        id: "weight",
        label: "Berat badan",
        type: "number",
        placeholder: "70",
        suffix: "kg",
      },
      {
        id: "height",
        label: "Tinggi badan",
        type: "number",
        placeholder: "170",
        suffix: "cm",
      },
    ],
    compute: calculateBmi,
  },
  {
    slug: "map-calculation",
    title: "MAP Calculation",
    category: "Kardiovaskular",
    summary: "Mean arterial pressure untuk perfusi organ.",
    clinicalUse: "Membantu melihat kecukupan perfusi pada pasien akut.",
    sourcePath:
      "D:\\Devops\\sentraartificial\\abyss-monorepo\\projects\\medlink\\apps\\medlink\\app\\medcal\\map-calculation\\page.tsx",
    fields: [
      {
        id: "systolic",
        label: "Tekanan sistolik",
        type: "number",
        placeholder: "120",
        suffix: "mmHg",
      },
      {
        id: "diastolic",
        label: "Tekanan diastolik",
        type: "number",
        placeholder: "80",
        suffix: "mmHg",
      },
    ],
    compute: calculateMap,
  },
  {
    slug: "basal-metabolic-rate",
    title: "Basal Metabolic Rate",
    category: "Umum",
    summary: "Estimasi kebutuhan energi basal harian.",
    clinicalUse: "Dasar edukasi nutrisi dan estimasi kebutuhan kalori awal.",
    sourcePath:
      "D:\\Devops\\sentraartificial\\abyss-monorepo\\projects\\medlink\\apps\\medlink\\app\\medcal\\basal-metabolic-rate\\page.tsx",
    fields: [
      {
        id: "sex",
        label: "Jenis kelamin",
        type: "toggle",
        options: [
          { label: "Laki-laki", value: "male" },
          { label: "Perempuan", value: "female" },
        ],
      },
      {
        id: "age",
        label: "Usia",
        type: "number",
        placeholder: "35",
        suffix: "tahun",
      },
      {
        id: "weight",
        label: "Berat badan",
        type: "number",
        placeholder: "70",
        suffix: "kg",
      },
      {
        id: "height",
        label: "Tinggi badan",
        type: "number",
        placeholder: "170",
        suffix: "cm",
      },
    ],
    compute: calculateBmr,
  },
  {
    slug: "egfr-ckd-epi",
    title: "eGFR (CKD-EPI 2021)",
    category: "Ginjal",
    summary: "Estimasi laju filtrasi glomerulus tanpa ras.",
    clinicalUse: "Skrining CKD dan interpretasi fungsi ginjal.",
    sourcePath:
      "D:\\Devops\\sentraartificial\\abyss-monorepo\\projects\\medlink\\apps\\medlink\\app\\medcal\\egfr-ckd-epi\\page.tsx",
    fields: [
      {
        id: "sex",
        label: "Jenis kelamin",
        type: "toggle",
        options: [
          { label: "Laki-laki", value: "male" },
          { label: "Perempuan", value: "female" },
        ],
      },
      {
        id: "creatinine",
        label: "Kreatinin serum",
        type: "number",
        placeholder: "1.1",
        step: "0.01",
        suffix: "mg/dL",
      },
      {
        id: "age",
        label: "Usia",
        type: "number",
        placeholder: "45",
        suffix: "tahun",
      },
    ],
    compute: calculateEgfr,
  },
  {
    slug: "creatinine-clearance",
    title: "Creatinine Clearance",
    category: "Ginjal",
    summary: "Cockcroft-Gault untuk estimasi clearance kreatinin.",
    clinicalUse: "Pertimbangan penyesuaian dosis obat berbasis fungsi ginjal.",
    sourcePath:
      "D:\\Devops\\sentraartificial\\abyss-monorepo\\projects\\medlink\\apps\\medlink\\app\\medcal\\creatinine-clearance\\page.tsx",
    fields: [
      {
        id: "sex",
        label: "Jenis kelamin",
        type: "toggle",
        options: [
          { label: "Laki-laki", value: "male" },
          { label: "Perempuan", value: "female" },
        ],
      },
      {
        id: "age",
        label: "Usia",
        type: "number",
        placeholder: "45",
        suffix: "tahun",
      },
      {
        id: "weight",
        label: "Berat badan",
        type: "number",
        placeholder: "70",
        suffix: "kg",
      },
      {
        id: "creatinine",
        label: "Kreatinin serum",
        type: "number",
        placeholder: "1.1",
        step: "0.01",
        suffix: "mg/dL",
      },
    ],
    compute: calculateCrCl,
  },
  {
    slug: "due-date-lmp",
    title: "Due Date (LMP)",
    category: "Obstetri",
    summary: "Perkiraan HPL dan usia kehamilan berdasar HPHT.",
    clinicalUse: "Estimasi awal obstetri sebelum konfirmasi USG.",
    sourcePath:
      "D:\\Devops\\sentraartificial\\abyss-monorepo\\projects\\medlink\\apps\\medlink\\app\\medcal\\due-date-lmp\\page.tsx",
    fields: [{ id: "lmp", label: "HPHT", type: "date" }],
    compute: calculateDueDate,
  },
  {
    slug: "qsofa-score",
    title: "qSOFA Score",
    category: "Critical Care",
    summary: "Skor cepat untuk menilai risiko luaran buruk pada dugaan sepsis.",
    clinicalUse: "Triage awal pasien infeksi dengan risiko deteriorasi.",
    sourcePath:
      "D:\\Devops\\sentraartificial\\abyss-monorepo\\projects\\medlink\\apps\\medlink\\app\\medcal\\qsofa-score\\page.tsx",
    fields: [
      {
        id: "rr",
        label: "Respiratory rate ≥ 22/menit",
        type: "toggle",
        options: [
          { label: "Tidak", value: "no" },
          { label: "Ya", value: "yes" },
        ],
      },
      {
        id: "mental",
        label: "Perubahan status mental",
        type: "toggle",
        options: [
          { label: "Tidak", value: "no" },
          { label: "Ya", value: "yes" },
        ],
      },
      {
        id: "sbp",
        label: "Sistolik ≤ 100 mmHg",
        type: "toggle",
        options: [
          { label: "Tidak", value: "no" },
          { label: "Ya", value: "yes" },
        ],
      },
    ],
    compute: calculateQsofa,
  },
  {
    slug: "glasgow-coma-scale",
    title: "Glasgow Coma Scale",
    category: "Neurologi",
    summary: "Penilaian kesadaran berbasis respons mata, verbal, dan motorik.",
    clinicalUse: "Menilai tingkat kesadaran dan severitas gangguan neurologis.",
    sourcePath:
      "D:\\Devops\\sentraartificial\\abyss-monorepo\\projects\\medlink\\apps\\medlink\\app\\medcal\\glasgow-coma-scale\\page.tsx",
    fields: [
      {
        id: "eye",
        label: "Eye opening (E)",
        type: "toggle",
        options: [
          { label: "4 Spontan", value: "4" },
          { label: "3 Terhadap suara", value: "3" },
          { label: "2 Terhadap nyeri", value: "2" },
          { label: "1 Tidak ada", value: "1" },
        ],
      },
      {
        id: "verbal",
        label: "Verbal response (V)",
        type: "toggle",
        options: [
          { label: "5 Orientasi baik", value: "5" },
          { label: "4 Bingung", value: "4" },
          { label: "3 Kata tidak tepat", value: "3" },
          { label: "2 Suara tak bermakna", value: "2" },
          { label: "1 Tidak ada", value: "1" },
        ],
      },
      {
        id: "motor",
        label: "Motor response (M)",
        type: "toggle",
        options: [
          { label: "6 Patuh perintah", value: "6" },
          { label: "5 Lokalisir nyeri", value: "5" },
          { label: "4 Fleksi normal", value: "4" },
          { label: "3 Fleksi abnormal", value: "3" },
          { label: "2 Ekstensi", value: "2" },
          { label: "1 Tidak ada", value: "1" },
        ],
      },
    ],
    compute: calculateGcs,
  },
];

export function getCalculatorBySlug(
  slug: string,
): CalculatorDefinition | undefined {
  return MEDICAL_CALCULATORS.find((calculator) => calculator.slug === slug);
}
