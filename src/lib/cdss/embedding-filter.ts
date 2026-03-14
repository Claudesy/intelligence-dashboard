// Blueprinted & built by Claudesy.
/**
 * CDSS Embedding Filter — Semantic similarity via gemini-embedding-001
 *
 * Vectors di-load sekali saat server start (cached in memory).
 * Per request: embed keluhan user (1 API call) → cosine similarity → top N.
 * Fallback ke keyword pre-filter jika embedding gagal.
 */

import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { FilteredDisease } from "./pre-filter";

interface DiseaseVector {
  icd10: string;
  nama: string;
  vector: number[] | null;
}

interface VectorsFile {
  _metadata: { dimensions: number; total: number };
  vectors: DiseaseVector[];
}

// ── Cache ─────────────────────────────────────────────────────────────────────

let _vectors: DiseaseVector[] | null = null;

function loadVectors(): DiseaseVector[] {
  if (_vectors) return _vectors;
  try {
    const raw = readFileSync(
      join(process.cwd(), "public", "data", "penyakit-vectors.json"),
      "utf-8",
    );
    const file = JSON.parse(raw) as VectorsFile;
    _vectors = (file.vectors ?? []).filter((v) => v.vector !== null);
    return _vectors;
  } catch {
    return [];
  }
}

// ── Math ──────────────────────────────────────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ── Embed via Gemini API ──────────────────────────────────────────────────────

async function embedQuery(text: string, apiKey: string): Promise<number[]> {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/gemini-embedding-001",
        content: { parts: [{ text }] },
        taskType: "SEMANTIC_SIMILARITY",
        outputDimensionality: 768,
      }),
    },
  );
  const data = (await r.json()) as {
    embedding?: { values: number[] };
    error?: unknown;
  };
  if (!r.ok || !data.embedding) {
    throw new Error(
      `Embedding API error: ${JSON.stringify(data.error ?? "unknown")}`,
    );
  }
  return data.embedding.values;
}

// ── penyakit.json lookup untuk build FilteredDisease ─────────────────────────

interface PenyakitEntry {
  id?: string;
  icd10: string;
  nama: string;
  definisi?: string;
  gejala?: string[];
  pemeriksaan_fisik?: string[];
  red_flags?: string[];
  terpi?: Array<{ obat: string; dosis: string; frek: string }>;
  kriteria_rujukan?: string;
  diagnosis_banding?: string[];
}

let _penyakitMap: Map<string, PenyakitEntry[]> | null = null;

function getPenyakitMap(): Map<string, PenyakitEntry[]> {
  if (_penyakitMap) return _penyakitMap;
  try {
    const raw = readFileSync(
      join(process.cwd(), "public", "data", "penyakit.json"),
      "utf-8",
    );
    const db = JSON.parse(raw) as { penyakit: PenyakitEntry[] };
    _penyakitMap = new Map();
    for (const disease of db.penyakit ?? []) {
      const key = buildEntryKey(disease.icd10, disease.nama);
      const current = _penyakitMap.get(key) ?? [];
      current.push(disease);
      _penyakitMap.set(key, current);
    }
    return _penyakitMap;
  } catch {
    return new Map();
  }
}

function toFilteredDisease(
  entry: PenyakitEntry,
  score: number,
): FilteredDisease {
  return {
    id: entry.id ?? `${entry.icd10}:${entry.nama}`,
    icd10: entry.icd10,
    nama: entry.nama,
    definisi: entry.definisi ?? "",
    gejala: entry.gejala ?? [],
    pemeriksaan_fisik: entry.pemeriksaan_fisik ?? [],
    red_flags: entry.red_flags ?? [],
    terpi: entry.terpi ?? [],
    kriteria_rujukan: entry.kriteria_rujukan ?? "",
    diagnosis_banding: entry.diagnosis_banding ?? [],
    score,
  };
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildEntryKey(icd10: string, nama: string): string {
  return `${icd10.trim().toUpperCase()}::${normalizeText(nama)}`;
}

// ── Main Export ───────────────────────────────────────────────────────────────

export async function embeddingFilterDiseases(
  keluhanUtama: string,
  keluhanTambahan: string | undefined,
  topN = 15,
): Promise<FilteredDisease[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY tidak dikonfigurasi");

  const vectors = loadVectors();
  if (vectors.length === 0) throw new Error("Vectors belum di-generate");

  const query = [keluhanUtama, keluhanTambahan ?? ""].join(" ").trim();
  const queryVector = await embedQuery(query, apiKey);

  const penyakitMap = getPenyakitMap();

  const scored = vectors
    .map((v) => ({
      key: buildEntryKey(v.icd10, v.nama),
      score: cosineSimilarity(queryVector, v.vector as number[]),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  return scored
    .flatMap(({ key, score }) => {
      const entries = penyakitMap.get(key) ?? [];
      return entries.map((entry) =>
        toFilteredDisease(entry, Math.round(score * 1000)),
      );
    })
    .slice(0, topN);
}

export function isEmbeddingReady(): boolean {
  const vectors = loadVectors();
  return vectors.length > 0;
}
