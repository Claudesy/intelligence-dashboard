// Masterplan and masterpiece by Claudesy.
/**
 * POST /api/cdss/autocomplete
 * Clinical autocomplete dengan contextual chaining.
 * Sources: local clinical-chains.json (top 50 gejala, <1ms) → DeepSeek fallback (~15s).
 */

import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export const runtime = "nodejs";

// ── Types ──────────────────────────────────────────────────────────────────

interface AutocompleteRequest {
  query: string;
  context?: string[]; // gejala yang sudah dipilih sebelumnya
}

export interface ClinicalChain {
  clinical_entity: string;
  sifat: {
    formal: string[];
    klinis: string[];
    narasi: string[];
  };
  lokasi: string[];
  durasi: string[];
  logical_chain: string[];
  predictive_next: {
    if_unilateral: string[];
    if_bilateral: string[];
    red_flags: string[];
  };
  templates: string[];
  pemeriksaan: {
    fisik: string[];
    lab: string[];
    penunjang: string[];
  };
}

export interface AutocompleteResponse {
  source: "local" | "llm";
  chain: ClinicalChain;
}

// ── Local dataset loader ───────────────────────────────────────────────────

let _localCache: Record<string, ClinicalChain> | null = null;

function loadLocalChains(): Record<string, ClinicalChain> {
  if (_localCache) return _localCache;
  const path = join(process.cwd(), "public", "data", "clinical-chains.json");
  if (!existsSync(path)) {
    _localCache = {};
    return {};
  }
  try {
    _localCache = JSON.parse(readFileSync(path, "utf-8")) as Record<
      string,
      ClinicalChain
    >;
    return _localCache;
  } catch {
    _localCache = {};
    return {};
  }
}

// Alias kata awam → key di dataset
const ALIAS_MAP: Record<string, string> = {
  panas: "demam",
  "demam panas": "demam",
  "panas tinggi": "demam",
  "panas badan": "demam",
  "panas dingin": "demam",
  meriang: "demam",
  "menggigil demam": "demam",
  flu: "pilek",
  "hidung meler": "pilek",
  "hidung tersumbat": "pilek",
  ingus: "pilek",
  "kepala pusing": "sakit kepala",
  pusing: "sakit kepala",
  "pusing kepala": "sakit kepala",
  migrain: "sakit kepala",
  "sakit kepala belakang": "sakit kepala",
  "tenggorokan sakit": "nyeri tenggorokan",
  "radang tenggorokan": "nyeri tenggorokan",
  "sakit telan": "nyeri tenggorokan",
  "napas sesak": "sesak napas",
  "susah napas": "sesak napas",
  "napas pendek": "sesak napas",
  "mual mual": "mual",
  eneg: "mual",
  "perut mual": "mual",
  "muntah muntah": "muntah",
  "mual muntah": "mual",
  "bab cair": "diare",
  mencret: "diare",
  "diare cair": "diare",
  "perut sakit": "nyeri perut",
  "sakit perut": "nyeri perut",
  "kram perut": "nyeri perut",
  mules: "nyeri perut",
  "dada sakit": "nyeri dada",
  "sakit dada": "nyeri dada",
  "nyeri kepala": "sakit kepala",
  vertigo: "pusing / vertigo",
  "kepala berputar": "pusing / vertigo",
  lemas: "lemas / fatigue",
  capek: "lemas / fatigue",
  lelah: "lemas / fatigue",
  lemah: "lemas / fatigue",
  fatigue: "lemas / fatigue",
  "punggung sakit": "nyeri punggung",
  "sakit punggung": "nyeri punggung",
  "pinggang sakit": "nyeri pinggang",
  "sakit pinggang": "nyeri pinggang",
  "nyeri pinggang": "nyeri pinggang",
  "pinggang nyeri": "nyeri pinggang",
  "sendi sakit": "nyeri sendi",
  "sakit sendi": "nyeri sendi",
  "nyeri persendian": "nyeri sendi",
  "persendian nyeri": "nyeri sendi",
  "persendian sakit": "nyeri sendi",
  "sakit persendian": "nyeri sendi",
  "nyeri di persendian": "nyeri sendi",
  artralgia: "nyeri sendi",
  arthralgia: "nyeri sendi",
  "radang sendi": "nyeri sendi",
  artritis: "nyeri sendi",
  arthritis: "nyeri sendi",
  gatal: "gatal kulit",
  "gatal-gatal": "gatal kulit",
  "kulit gatal": "gatal kulit",
  ruam: "ruam kulit",
  "bintik merah": "ruam kulit",
  bentol: "ruam kulit",
  "kaki bengkak": "bengkak kaki",
  bengkak: "bengkak kaki",
  "susah kencing": "sulit bak",
  "susah bak": "sulit bak",
  "kencing sakit": "nyeri bak",
  "sakit kencing": "nyeri bak",
  keputihan: "keputihan",
  "haid sakit": "nyeri haid",
  "mens sakit": "nyeri haid",
  "jantung berdebar": "berdebar-debar",
  berdebar: "berdebar-debar",
  pingsan: "pingsan / sinkop",
  sinkop: "pingsan / sinkop",
  kesemutan: "kebas / kesemutan",
  kebas: "kebas / kesemutan",
  "mati rasa": "kebas / kesemutan",
  "lemah anggota gerak": "kelemahan anggota gerak",
  lumpuh: "kelemahan anggota gerak",
  "penglihatan buram": "penglihatan kabur",
  "mata buram": "penglihatan kabur",
  kabur: "penglihatan kabur",
  "mata merah": "mata merah",
  "telinga berdenging": "telinga berdenging",
  tinnitus: "telinga berdenging",
  "pendengaran turun": "gangguan pendengaran",
  "kurang dengar": "gangguan pendengaran",
  mimisan: "mimisan",
  "hidung berdarah": "mimisan",
  "susah menelan": "sulit menelan",
  "sakit menelan": "sulit menelan",
  "tidak nafsu makan": "nafsu makan menurun",
  "tidak mau makan": "nafsu makan menurun",
  "berat badan turun": "penurunan berat badan",
  "bb turun": "penurunan berat badan",
  kurus: "penurunan berat badan",
  "sering minum": "banyak minum",
  polidipsia: "banyak minum",
  "sering kencing": "banyak kencing",
  poliuria: "banyak kencing",
  "ulu hati": "nyeri ulu hati",
  lambung: "nyeri ulu hati",
  maag: "nyeri ulu hati",
  kembung: "kembung",
  "perut kembung": "kembung",
  constipasi: "sembelit",
  "susah bab": "sembelit",
  "bab darah": "bab berdarah",
  "darah di bab": "bab berdarah",
  "bab hitam": "bab hitam",
  "feses hitam": "bab hitam",
  "wajah bengkak": "bengkak wajah",
  "muka bengkak": "bengkak wajah",
  "sesak tiduran": "sesak saat berbaring",
  "sesak baring": "sesak saat berbaring",
  "batuk berdarah": "batuk darah",
  "darah batuk": "batuk darah",
  "betis sakit": "nyeri betis",
  "sakit betis": "nyeri betis",
  kuning: "kuning / ikterus",
  ikterus: "kuning / ikterus",
  "mata kuning": "kuning / ikterus",
  // ── Batch 2: 100 gejala terbanyak Puskesmas ──────────────────
  pegal: "pegal linu",
  "badan pegal": "pegal linu",
  "otot pegal": "pegal linu",
  myalgia: "pegal linu",
  "badan remuk": "pegal linu",
  "sakit gigi": "sakit gigi",
  "gigi sakit": "sakit gigi",
  "gigi berlubang": "sakit gigi",
  "gigi ngilu": "sakit gigi",
  odontalgia: "sakit gigi",
  "tengkuk kaku": "tengkuk berat",
  "tengkuk pegal": "tengkuk berat",
  "leher belakang kaku": "tengkuk berat",
  "leher kaku": "tengkuk berat",
  "luka tidak sembuh": "luka sulit sembuh",
  "luka lama": "luka sulit sembuh",
  "luka kronik": "luka sulit sembuh",
  "ulkus kaki": "luka sulit sembuh",
  "mata gatal": "mata gatal berair",
  "mata berair": "mata gatal berair",
  "mata perih": "mata gatal berair",
  "mata bengkak gatal": "mata gatal berair",
  "kuping sakit": "nyeri telinga",
  "telinga sakit": "nyeri telinga",
  otalgia: "nyeri telinga",
  "sakit telinga": "nyeri telinga",
  polifagia: "sering lapar",
  "lapar terus": "sering lapar",
  "nafsu makan berlebih": "sering lapar",
  "keringat dingin": "keringat dingin",
  "berkeringat dingin": "keringat dingin",
  diaforesis: "keringat dingin",
  insomnia: "sulit tidur",
  "susah tidur": "sulit tidur",
  "tidak bisa tidur": "sulit tidur",
  "tidur tidak nyenyak": "sulit tidur",
  "gusi bengkak": "gusi bengkak",
  "gusi berdarah": "gusi bengkak",
  gingivitis: "gusi bengkak",
  "gusi merah": "gusi bengkak",
  "bau mulut": "bau mulut",
  halitosis: "bau mulut",
  "napas bau": "bau mulut",
  "mulut bau": "bau mulut",
  sariawan: "sariawan",
  stomatitis: "sariawan",
  "luka mulut": "sariawan",
  "sariawan mulut": "sariawan",
  ketombe: "ketombe",
  "kulit kepala gatal": "ketombe",
  "serpihan putih": "ketombe",
  seboroik: "ketombe",
  "telinga berair": "telinga keluar cairan",
  "kuping meler": "telinga keluar cairan",
  otorrhea: "telinga keluar cairan",
  "telinga berbau": "telinga keluar cairan",
  serak: "suara serak",
  "suara hilang": "suara serak",
  parau: "suara serak",
  disfonia: "suara serak",
  "sendi kaku": "sendi kaku pagi",
  "kaku pagi": "sendi kaku pagi",
  "morning stiffness": "sendi kaku pagi",
  "sendi bengkak": "sendi bengkak merah",
  "sendi merah": "sendi bengkak merah",
  "asam urat": "sendi bengkak merah",
  gout: "sendi bengkak merah",
  "jempol kaki bengkak": "sendi bengkak merah",
  "tumit sakit": "nyeri tumit",
  "sakit tumit": "nyeri tumit",
  "plantar fasciitis": "nyeri tumit",
  "nyeri telapak kaki": "nyeri tumit",
  "kulit kering": "kulit bersisik",
  "kulit mengelupas": "kulit bersisik",
  psoriasis: "kulit bersisik",
  "kulit pecah": "kulit bersisik",
  bisul: "bisul",
  furunkel: "bisul",
  "abses kulit": "bisul",
  "benjolan bernanah": "bisul",
  kurap: "kurap",
  tinea: "kurap",
  "panu merah": "kurap",
  "jamur kulit": "kurap",
  jerawat: "jerawat",
  acne: "jerawat",
  beruntus: "jerawat",
  "jerawat meradang": "jerawat",
  kutil: "kutil",
  veruka: "kutil",
  "daging tumbuh": "kutil",
  "rambut rontok": "rambut rontok",
  "rambut tipis": "rambut rontok",
  alopesia: "rambut rontok",
  botak: "rambut rontok",
  "benjolan payudara": "benjolan payudara",
  "benjolan di dada": "benjolan payudara",
  "massa mammae": "benjolan payudara",
  "payudara bengkak": "payudara bengkak nyeri",
  "pd nyeri": "payudara bengkak nyeri",
  mastitis: "payudara bengkak nyeri",
  "payudara keras": "payudara bengkak nyeri",
  "punggung atas pegal": "nyeri punggung atas",
  "belikat sakit": "nyeri punggung atas",
  "pegal bahu": "nyeri punggung atas",
  "nyeri belikat": "nyeri punggung atas",
  "kram kaki": "kram otot kaki",
  "kram betis": "kram otot kaki",
  "otot kaki kejang": "kram otot kaki",
  "betis kram": "kram otot kaki",
  cegukan: "cegukan",
  singultus: "cegukan",
  sendawa: "sering bersendawa",
  "sering sendawa": "sering bersendawa",
  "bersendawa terus": "sering bersendawa",
  "lidah pahit": "lidah pahit",
  "mulut pahit": "lidah pahit",
  "rasa hambar": "lidah pahit",
  disgeusia: "lidah pahit",
  "mudah lebam": "mudah memar",
  lebam: "mudah memar",
  memar: "mudah memar",
  "biru-biru": "mudah memar",
  pucat: "pucat",
  "muka pucat": "pucat",
  "bibir pucat": "pucat",
  pallor: "pucat",
  anemia: "pucat",
  bintitan: "mata bintitan",
  "mata bengkak": "mata bintitan",
  hordeolum: "mata bintitan",
  belekan: "mata belekan",
  "mata belekan": "mata belekan",
  "kotoran mata": "mata belekan",
  "mata bernanah": "mata belekan",
  mengi: "napas berbunyi",
  wheezing: "napas berbunyi",
  "napas ngik-ngik": "napas berbunyi",
  "napas bunyi": "napas berbunyi",
  "keringat malam": "keringat malam",
  "berkeringat malam": "keringat malam",
  "night sweats": "keringat malam",
  pelupa: "mudah lupa",
  "sering lupa": "mudah lupa",
  "daya ingat turun": "mudah lupa",
  pikun: "mudah lupa",
  cemas: "gelisah cemas",
  gelisah: "gelisah cemas",
  khawatir: "gelisah cemas",
  anxiety: "gelisah cemas",
  panik: "gelisah cemas",
  sedih: "perasaan sedih",
  murung: "perasaan sedih",
  depresi: "perasaan sedih",
  "tidak semangat": "perasaan sedih",
  gemetar: "tangan gemetar",
  tremor: "tangan gemetar",
  "tangan goyang": "tangan gemetar",
  menggigil: "menggigil",
  rigor: "menggigil",
  kedinginan: "menggigil",
  "benjolan leher": "benjolan leher ketiak",
  "benjolan ketiak": "benjolan leher ketiak",
  "kelenjar bengkak": "benjolan leher ketiak",
  limfadenopati: "benjolan leher ketiak",
  "tidak bisa cium bau": "anosmia",
  anosmia: "anosmia",
  "penciuman hilang": "anosmia",
  "hidung tidak bisa bau": "anosmia",
  "nyeri wajah": "nyeri wajah",
  "wajah sakit": "nyeri wajah",
  neuralgia: "nyeri wajah",
  trigeminal: "nyeri wajah",
  "telinga penuh": "telinga terasa penuh",
  "telinga tersumbat": "telinga terasa penuh",
  "kuping budeg": "telinga terasa penuh",
  wasir: "benjolan anus",
  ambeien: "benjolan anus",
  hemoroid: "benjolan anus",
  "benjolan dubur": "benjolan anus",
  "kencing darah": "kencing berdarah",
  hematuria: "kencing berdarah",
  "pipis darah": "kencing berdarah",
  "kencing pasir": "kencing berpasir",
  "kencing keruh": "kencing berpasir",
  "batu ginjal": "kencing berpasir",
  "anyang-anyangan": "anyang-anyangan",
  "kencing tidak tuntas": "anyang-anyangan",
  sistitis: "anyang-anyangan",
  "gatal kemaluan": "gatal kemaluan",
  "gatal selangkangan": "gatal kemaluan",
  "gatal alat kelamin": "gatal kemaluan",
  dispareunia: "nyeri berhubungan",
  "sakit berhubungan": "nyeri berhubungan",
  "nyeri koitus": "nyeri berhubungan",
  lepuhan: "lepuhan berair",
  "kulit melepuh": "lepuhan berair",
  cacar: "lepuhan berair",
  herpes: "lepuhan berair",
  "gigitan serangga": "luka gigitan",
  "digigit nyamuk": "luka gigitan",
  "bentol gigitan": "luka gigitan",
  "tangan dingin": "akral dingin",
  "kaki dingin": "akral dingin",
  "akral dingin": "akral dingin",
  "bau badan": "bau badan",
  bromhidrosis: "bau badan",
  "keringat bau": "bau badan",
  "kuku rapuh": "kuku rapuh",
  "kuku kuning": "kuku rapuh",
  "jamur kuku": "kuku rapuh",
  onikomikosis: "kuku rapuh",
  "mengganjal di leher": "rasa mengganjal leher",
  globus: "rasa mengganjal leher",
  "tenggorokan mengganjal": "rasa mengganjal leher",
  "seperti ada yang tersangkut": "rasa mengganjal leher",
};

const GENERIC_MATCH_TOKENS = new Set([
  "nyeri",
  "sakit",
  "gangguan",
  "keluhan",
  "rasa",
  "terasa",
  "bagian",
]);

function normalizeText(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function tokenizeMeaningful(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .filter(Boolean)
    .filter((token) => !GENERIC_MATCH_TOKENS.has(token));
}

function scoreMatch(query: string, candidate: string): number {
  const normalizedQuery = normalizeText(query);
  const normalizedCandidate = normalizeText(candidate);

  if (!normalizedQuery || !normalizedCandidate) return 0;
  if (normalizedQuery === normalizedCandidate) return 1000;

  const queryTokens = normalizeText(query).split(" ").filter(Boolean);
  const candidateTokens = normalizeText(candidate).split(" ").filter(Boolean);
  const candidateTokenSet = new Set(candidateTokens);

  const queryMeaningful = tokenizeMeaningful(query);
  const candidateMeaningfulSet = new Set(tokenizeMeaningful(candidate));

  const sharedMeaningful = queryMeaningful.filter((token) =>
    candidateMeaningfulSet.has(token),
  );
  const sharedTokens = queryTokens.filter((token) =>
    candidateTokenSet.has(token),
  );

  if (sharedMeaningful.length === 0 && sharedTokens.length === 0) return 0;

  let score = sharedMeaningful.length * 40 + sharedTokens.length * 6;

  if (normalizedQuery.includes(normalizedCandidate))
    score += normalizedCandidate.length >= 4 ? 24 : 10;
  if (normalizedCandidate.includes(normalizedQuery))
    score += normalizedQuery.length >= 4 ? 18 : 8;

  const lastMeaningfulToken = queryMeaningful.at(-1);
  if (lastMeaningfulToken && candidateMeaningfulSet.has(lastMeaningfulToken))
    score += 16;

  const lastQueryToken = queryTokens.at(-1);
  if (lastQueryToken && candidateTokens.at(-1) === lastQueryToken) score += 8;

  return score;
}

function findLocalMatch(query: string): ClinicalChain | null {
  const chains = loadLocalChains();
  const q = normalizeText(query);

  // Exact key match
  if (chains[q]) return chains[q];

  // Alias mapping — kata awam → key standar
  if (ALIAS_MAP[q] && chains[ALIAS_MAP[q]]) return chains[ALIAS_MAP[q]];

  let bestTarget: string | null = null;
  let bestScore = 0;

  // Partial alias match — cari alias paling spesifik terhadap query
  for (const [alias, target] of Object.entries(ALIAS_MAP)) {
    if (!chains[target]) continue;
    const score = scoreMatch(q, alias);
    if (score > bestScore) {
      bestScore = score;
      bestTarget = target;
    }
  }

  // Partial key match — gunakan skor, hindari match generik hanya karena kata pertama sama
  for (const [key, chain] of Object.entries(chains)) {
    const score = scoreMatch(q, key);
    if (score > bestScore) {
      bestScore = score;
      bestTarget = key;
    }
  }

  return bestTarget && bestScore >= 18 ? (chains[bestTarget] ?? null) : null;
}

// ── DeepSeek fallback ──────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Kamu adalah Senior Medical Informatician yang membangun sistem autocomplete anamnesa klinis untuk Puskesmas Indonesia.

Hasilkan dataset JSON untuk entitas klinis yang diberikan. Output HARUS JSON persis:
{
  "clinical_entity": "nama gejala",
  "sifat": {
    "formal": ["5-8 deskripsi medis formal Bahasa Indonesia"],
    "klinis": ["5-8 terminologi klinis/medis"],
    "narasi": ["5-8 frasa deskriptif gejala dalam bahasa awam — bukan kalimat orang pertama, melainkan frasa singkat seperti: 'Batuk terus menerus', 'Panas tidak turun-turun', 'Kepala berdenyut kencang'"]
  },
  "lokasi": ["4-6 lokasi anatomis relevan, atau []"],
  "durasi": ["4-6 variasi deskripsi durasi: sejak tadi malam, sudah 3 hari, mulai 2 minggu lalu"],
  "logical_chain": ["5-8 gejala penyerta evidence-based yang paling sering menyertai"],
  "predictive_next": {
    "if_unilateral": ["gejala jika satu sisi, atau []"],
    "if_bilateral": ["gejala jika kedua sisi, atau []"],
    "red_flags": ["2-4 tanda bahaya wajib ditanyakan"]
  },
  "templates": [
    "{Pasien} datang dengan keluhan [GEJALA] sejak {Waktu}.",
    "Keluhan utama berupa [GEJALA] telah dirasakan selama {Waktu}.",
    "[GEJALA] dirasakan {Sifat}, {Lokasi}, sejak {Waktu}.",
    "Pasien mengeluhkan [GEJALA] yang {Sifat} sejak {Waktu}, disertai {Gejala_Penyerta}.",
    "Anamnesa: [GEJALA] onset {Waktu}, {Sifat}, faktor pemberat {Faktor}."
  ],
  "pemeriksaan": {
    "fisik": ["3-5 istilah medis formal singkat pemeriksaan fisik, contoh: 'Auskultasi Pulmo', 'Palpasi Abdomen', 'Nyeri Tekan McBurney', 'Tanda Rovsing'"],
    "lab": ["2-4 singkatan/istilah lab formal, contoh: 'DL', 'GDS', 'PPT', 'LED', 'CRP', 'UL', 'SGOT/SGPT', 'HbA1c', 'BUN/SK'"],
    "penunjang": ["1-3 istilah penunjang formal singkat, contoh: 'Foto Thorax AP', 'USG Abdomen', 'EKG', 'CT-Scan Kepala'"]
  }
}

Ketentuan: semua Bahasa Indonesia, variasikan sinonim ('sejak'/'mulai dirasakan'/'mengeluhkan'), sifat.narasi adalah frasa deskriptif singkat (bukan kalimat subjek-predikat orang pertama seperti "saya merasa..."), logical_chain harus evidence-based. Output hanya JSON.`;

async function callDeepSeek(
  query: string,
  context: string[],
): Promise<ClinicalChain> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY tidak dikonfigurasi");

  const contextNote =
    context.length > 0
      ? `\nKonteks: pasien sudah menyebutkan [${context.join(", ")}] sebelumnya — sesuaikan logical_chain agar tidak mengulang dan lebih spesifik ke kemungkinan diagnosa.`
      : "";

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Entitas klinis: "${query}".${contextNote} Berikan output dalam format json.`,
        },
      ],
      temperature: 0.4,
      max_tokens: 1200,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepSeek ${res.status}: ${err.slice(0, 100)}`);
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  const content = data.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content) as Partial<ClinicalChain>;

  // Normalize — pastikan semua field ada
  return {
    clinical_entity: parsed.clinical_entity ?? query,
    sifat: {
      formal: parsed.sifat?.formal ?? [],
      klinis: parsed.sifat?.klinis ?? [],
      narasi: parsed.sifat?.narasi ?? [],
    },
    lokasi: parsed.lokasi ?? [],
    durasi: parsed.durasi ?? [],
    logical_chain: parsed.logical_chain ?? [],
    predictive_next: {
      if_unilateral: parsed.predictive_next?.if_unilateral ?? [],
      if_bilateral: parsed.predictive_next?.if_bilateral ?? [],
      red_flags: parsed.predictive_next?.red_flags ?? [],
    },
    templates: parsed.templates ?? [],
    pemeriksaan: {
      fisik: parsed.pemeriksaan?.fisik ?? [],
      lab: parsed.pemeriksaan?.lab ?? [],
      penunjang: parsed.pemeriksaan?.penunjang ?? [],
    },
  };
}

// ── Handler ────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<AutocompleteRequest>;
    const query = (body.query ?? "").trim();
    const context = body.context ?? [];

    if (!query || query.length < 2) {
      return NextResponse.json<AutocompleteResponse>({
        source: "local",
        chain: {
          clinical_entity: "",
          sifat: { formal: [], klinis: [], narasi: [] },
          lokasi: [],
          durasi: [],
          logical_chain: [],
          predictive_next: {
            if_unilateral: [],
            if_bilateral: [],
            red_flags: [],
          },
          templates: [],
          pemeriksaan: { fisik: [], lab: [], penunjang: [] },
        },
      });
    }

    // 1. Coba local dataset dulu (<1ms)
    const local = findLocalMatch(query);
    if (local) {
      console.log(`[CDSS Autocomplete] Local hit: "${query}"`);
      return NextResponse.json<AutocompleteResponse>({
        source: "local",
        chain: local,
      });
    }

    // 2. Fallback DeepSeek (~15s)
    console.log(`[CDSS Autocomplete] LLM fallback: "${query}"`);
    const chain = await callDeepSeek(query, context);
    return NextResponse.json<AutocompleteResponse>({ source: "llm", chain });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[CDSS Autocomplete] Error:", msg);
    return NextResponse.json<AutocompleteResponse>({
      source: "llm",
      chain: {
        clinical_entity: "",
        sifat: { formal: [], klinis: [], narasi: [] },
        lokasi: [],
        durasi: [],
        logical_chain: [],
        predictive_next: { if_unilateral: [], if_bilateral: [], red_flags: [] },
        templates: [],
        pemeriksaan: { fisik: [], lab: [], penunjang: [] },
      },
    });
  }
}
