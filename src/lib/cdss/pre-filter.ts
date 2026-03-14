// Designed and constructed by Claudesy.
/**
 * CDSS Pre-filter — Keyword-based disease relevance scoring
 *
 * Dari 159 penyakit di KB, filter hanya yang relevan dengan keluhan.
 * Mengurangi token ke Gemini ~80% (dari 159 → 10-15 penyakit).
 *
 * Scoring per penyakit:
 * - Keyword match di gejala: +3 per hit (field paling relevan)
 * - Keyword match di red_flags: +2 per hit
 * - Keyword match di definisi: +1 per hit
 * - Keyword match di diagnosis_banding: +1 per hit
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

interface PenyakitEntry {
  id: string;
  nama: string;
  icd10: string;
  kompetensi?: string;
  definisi: string;
  gejala?: string[];
  pemeriksaan_fisik?: string[];
  red_flags?: string[];
  terpi?: Array<{ obat: string; dosis: string; frek: string }>;
  kriteria_rujukan?: string;
  diagnosis_banding?: string[];
}

interface PenyakitDB {
  penyakit: PenyakitEntry[];
}

let _db: PenyakitEntry[] | null = null;

function loadDB(): PenyakitEntry[] {
  if (_db) return _db;
  try {
    const raw = readFileSync(
      join(process.cwd(), "public", "data", "penyakit.json"),
      "utf-8",
    );
    _db = (JSON.parse(raw) as PenyakitDB).penyakit ?? [];
    return _db;
  } catch {
    return [];
  }
}

// Normalisasi teks: lowercase, hapus tanda baca, split jadi tokens
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3);
}

// Hitung berapa banyak query tokens yang match di target string/array
function countMatches(queryTokens: string[], targets: string[]): number {
  const targetText = targets.join(" ").toLowerCase();
  return queryTokens.filter((t) => targetText.includes(t)).length;
}

// Stopwords medis Indonesia yang tidak informatif
const STOPWORDS = new Set([
  "dan",
  "atau",
  "yang",
  "dengan",
  "pada",
  "dari",
  "untuk",
  "dalam",
  "tidak",
  "ada",
  "ini",
  "itu",
  "saja",
  "sudah",
  "akan",
  "bisa",
  "dapat",
  "hari",
  "sejak",
  "sudah",
  "karena",
  "akibat",
  "oleh",
]);

function extractMedicalTokens(text: string): string[] {
  return tokenize(text).filter((t) => !STOPWORDS.has(t));
}

export interface FilteredDisease {
  id: string;
  icd10: string;
  nama: string;
  definisi: string;
  gejala: string[];
  pemeriksaan_fisik: string[];
  red_flags: string[];
  terpi: Array<{ obat: string; dosis: string; frek: string }>;
  kriteria_rujukan: string;
  diagnosis_banding: string[];
  score: number;
}

export function preFilterDiseases(
  keluhanUtama: string,
  keluhanTambahan?: string,
  topN = 15,
): FilteredDisease[] {
  const db = loadDB();
  if (db.length === 0) return [];

  const rawQuery = [keluhanUtama, keluhanTambahan ?? ""].join(" ");
  const queryTokens = extractMedicalTokens(rawQuery);

  if (queryTokens.length === 0) {
    // Fallback: kembalikan penyakit dengan kompetensi 4A (paling umum di FKTP)
    return db
      .filter((d) => d.kompetensi?.includes("4"))
      .slice(0, topN)
      .map((d) => toFiltered(d, 0));
  }

  const scored = db.map((d) => {
    let score = 0;

    // Gejala — bobot tertinggi
    if (d.gejala && d.gejala.length > 0) {
      score += countMatches(queryTokens, d.gejala) * 3;
    }

    // Red flags
    if (d.red_flags && d.red_flags.length > 0) {
      score += countMatches(queryTokens, d.red_flags) * 2;
    }

    // Definisi
    if (d.definisi) {
      score += countMatches(queryTokens, [d.definisi]) * 1;
    }

    // Diagnosis banding
    if (d.diagnosis_banding && d.diagnosis_banding.length > 0) {
      score += countMatches(queryTokens, d.diagnosis_banding) * 1;
    }

    // Bonus: nama penyakit cocok langsung
    const namaTokens = tokenize(d.nama);
    const namaHits = queryTokens.filter((t) =>
      namaTokens.some((n) => n.includes(t) || t.includes(n)),
    );
    score += namaHits.length * 4;

    return { disease: d, score };
  });

  // Sort by score, ambil top N (minimum score > 0, fallback ke top N jika semua 0)
  const ranked = scored.sort((a, b) => b.score - a.score);
  const withScore = ranked.filter((r) => r.score > 0);
  const result =
    withScore.length >= topN ? withScore.slice(0, topN) : ranked.slice(0, topN);

  return result.map((r) => toFiltered(r.disease, r.score));
}

function toFiltered(d: PenyakitEntry, score: number): FilteredDisease {
  return {
    id: d.id,
    icd10: d.icd10,
    nama: d.nama,
    definisi: d.definisi ?? "",
    gejala: d.gejala ?? [],
    pemeriksaan_fisik: d.pemeriksaan_fisik ?? [],
    red_flags: d.red_flags ?? [],
    terpi: d.terpi ?? [],
    kriteria_rujukan: d.kriteria_rujukan ?? "",
    diagnosis_banding: d.diagnosis_banding ?? [],
    score,
  };
}

export function getKBStats(): {
  total: number;
  withGejala: number;
  withRedFlags: number;
} {
  const db = loadDB();
  return {
    total: db.length,
    withGejala: db.filter((d) => d.gejala && d.gejala.length > 0).length,
    withRedFlags: db.filter((d) => d.red_flags && d.red_flags.length > 0)
      .length,
  };
}
