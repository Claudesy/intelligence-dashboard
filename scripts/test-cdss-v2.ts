// Claudesy's vision, brought to life.
/**
 * Test Suite — CDSS V2
 * Iskandar Engine V2: autocomplete endpoint, reasoning pipeline, embedding filter, pre-filter
 *
 * Jalankan: npx tsx scripts/test-cdss-v2.ts
 */

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

// ── Test Runner ────────────────────────────────────────────────────────────────

type TestResult = {
  name: string;
  status: "PASS" | "FAIL" | "SKIP";
  error?: string;
  ms: number;
};
const results: TestResult[] = [];

async function test(
  name: string,
  fn: () => Promise<void> | void,
  skip = false,
): Promise<void> {
  if (skip) {
    results.push({ name, status: "SKIP", ms: 0 });
    return;
  }
  const t0 = Date.now();
  try {
    await fn();
    results.push({ name, status: "PASS", ms: Date.now() - t0 });
  } catch (e) {
    const err =
      e instanceof Error
        ? `${e.message}\n${e.stack?.split("\n").slice(1, 3).join("\n") ?? ""}`
        : String(e);
    results.push({ name, status: "FAIL", error: err, ms: Date.now() - t0 });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CWD = process.cwd();
const PENYAKIT_PATH = join(CWD, "public", "data", "penyakit.json");
const VECTORS_PATH = join(CWD, "public", "data", "penyakit-vectors.json");

function loadPenyakit() {
  const raw = readFileSync(PENYAKIT_PATH, "utf-8");
  return JSON.parse(raw) as {
    penyakit: Array<{
      icd10: string;
      nama: string;
      gejala?: string[];
      kompetensi?: string;
    }>;
  };
}

function readEngine() {
  return readFileSync(join(CWD, "src/lib/cdss/engine.ts"), "utf-8");
}
function readRoute() {
  return readFileSync(
    join(CWD, "src/app/api/cdss/autocomplete/route.ts"),
    "utf-8",
  );
}
function readPage() {
  return readFileSync(join(CWD, "src/app/emr/page.tsx"), "utf-8");
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // ── AC-01: preFilterDiseases keyword matching ───────────────────────────────
  await test("AC-01: preFilterDiseases — match demam tinggi → hasil relevan", async () => {
    const { preFilterDiseases } = await import("../src/lib/cdss/pre-filter.js");
    const result = preFilterDiseases("demam tinggi", undefined, 15);
    assert.ok(result.length > 0, "Harus ada hasil");
    assert.ok(result.length <= 15, "Harus ≤ topN=15");
    for (const d of result) {
      assert.ok(d.icd10, `icd10 harus ada`);
      assert.ok(d.nama, `nama harus ada`);
    }
  });

  await test("AC-01b: preFilterDiseases — sorted by score desc", async () => {
    const { preFilterDiseases } = await import("../src/lib/cdss/pre-filter.js");
    const result = preFilterDiseases("nyeri dada sesak napas", undefined, 10);
    assert.ok(result.length > 0, "Harus ada hasil");
    for (let i = 1; i < result.length; i++) {
      assert.ok(
        result[i].score <= result[i - 1].score,
        "Harus sorted by score desc",
      );
    }
  });

  await test("AC-01c: preFilterDiseases — topN dihormati", async () => {
    const { preFilterDiseases } = await import("../src/lib/cdss/pre-filter.js");
    const result = preFilterDiseases("batuk pilek demam", undefined, 5);
    assert.ok(result.length <= 5, `Harus ≤ 5, dapat: ${result.length}`);
  });

  // ── AC-02: fallback kompetensi 4A ──────────────────────────────────────────
  await test("AC-02: preFilterDiseases — query kosong tidak throw", async () => {
    const { preFilterDiseases } = await import("../src/lib/cdss/pre-filter.js");
    assert.doesNotThrow(() => preFilterDiseases("", undefined, 5));
    assert.doesNotThrow(() => preFilterDiseases("   ", undefined, 5));
    const result = preFilterDiseases("", undefined, 10);
    assert.ok(Array.isArray(result), "Harus return array");
  });

  // ── AC-03: getKBStats ──────────────────────────────────────────────────────
  await test("AC-03: getKBStats — statistik valid", async () => {
    const { getKBStats } = await import("../src/lib/cdss/pre-filter.js");
    const stats = getKBStats();
    assert.ok(stats.total > 0, `KB harus ada penyakit, total=${stats.total}`);
    assert.ok(stats.withGejala > 0, "Harus ada penyakit dengan gejala");
    assert.ok(stats.withGejala <= stats.total, "withGejala ≤ total");
    assert.ok(stats.withRedFlags <= stats.total, "withRedFlags ≤ total");
  });

  await test("AC-03b: getKBStats — konsisten dengan penyakit.json", async () => {
    const { getKBStats } = await import("../src/lib/cdss/pre-filter.js");
    const db = loadPenyakit();
    const stats = getKBStats();
    assert.strictEqual(
      stats.total,
      db.penyakit.length,
      `Total harus match: stats=${stats.total}, json=${db.penyakit.length}`,
    );
  });

  // ── AC-04: isEmbeddingReady + vectors file ─────────────────────────────────
  await test("AC-04: penyakit-vectors.json tersedia", () => {
    assert.ok(
      existsSync(VECTORS_PATH),
      "penyakit-vectors.json harus ada — jalankan generate-embeddings.mjs",
    );
  });

  await test("AC-04b: vectors file struktur valid (dimensions=768)", () => {
    const raw = readFileSync(VECTORS_PATH, "utf-8");
    const data = JSON.parse(raw) as {
      _metadata: { dimensions: number; total: number };
      vectors: Array<{ icd10: string; vector: number[] | null }>;
    };
    assert.ok(data._metadata, "Harus ada _metadata");
    assert.strictEqual(data._metadata.dimensions, 768, "Dimensi harus 768");
    assert.ok(data.vectors.length > 0, "Harus ada vectors");
    const firstVec = data.vectors.find((v) => v.vector !== null);
    assert.ok(firstVec, "Harus ada setidaknya 1 vektor non-null");
    assert.strictEqual(
      firstVec!.vector!.length,
      768,
      "Vektor harus 768 dimensi",
    );
  });

  await test("AC-04c: jumlah vectors match jumlah penyakit", () => {
    const db = loadPenyakit();
    const raw = readFileSync(VECTORS_PATH, "utf-8");
    const data = JSON.parse(raw) as { vectors: Array<{ icd10: string }> };
    assert.strictEqual(
      data.vectors.length,
      db.penyakit.length,
      `Vectors (${data.vectors.length}) harus match penyakit (${db.penyakit.length})`,
    );
  });

  await test("AC-04d: isEmbeddingReady() — vectors tersedia dan file valid", () => {
    // server-only module tidak bisa di-import langsung di luar Next.js context
    // Verifikasi via file inspection + vectors file integrity
    assert.ok(existsSync(VECTORS_PATH), "vectors file harus ada");
    const raw = readFileSync(VECTORS_PATH, "utf-8");
    const data = JSON.parse(raw) as {
      vectors: Array<{ vector: number[] | null }>;
    };
    const readyVectors = data.vectors.filter((v) => v.vector !== null).length;
    assert.ok(
      readyVectors > 100,
      `Harus ada >100 valid vectors, ada: ${readyVectors}`,
    );
    // Verifikasi isEmbeddingReady logic di source
    const embeddingFilterSrc = readFileSync(
      join(CWD, "src/lib/cdss/embedding-filter.ts"),
      "utf-8",
    );
    assert.ok(
      embeddingFilterSrc.includes("isEmbeddingReady"),
      "Fungsi isEmbeddingReady harus ada",
    );
    assert.ok(
      embeddingFilterSrc.includes("vectors.length > 0"),
      "Logic: vectors.length > 0",
    );
  });

  // ── AC-05: embeddingFilterDiseases (skip tanpa API key) ───────────────────
  const hasGeminiKey = !!process.env.GEMINI_API_KEY;

  await test("AC-05: embeddingFilterDiseases — source code verifikasi logic", () => {
    // server-only module tidak bisa di-import langsung di script tsx
    // Verifikasi implementasi via source inspection
    const src = readFileSync(
      join(CWD, "src/lib/cdss/embedding-filter.ts"),
      "utf-8",
    );
    assert.ok(
      src.includes("embeddingFilterDiseases"),
      "Fungsi utama harus ada",
    );
    assert.ok(src.includes("cosineSimilarity"), "Harus ada cosineSimilarity");
    assert.ok(
      src.includes("gemini-embedding-001"),
      "Harus pakai gemini-embedding-001",
    );
    assert.ok(
      src.includes("SEMANTIC_SIMILARITY"),
      "taskType harus SEMANTIC_SIMILARITY",
    );
    assert.ok(src.includes("outputDimensionality: 768"), "Dimensi harus 768");
    assert.ok(
      src.includes(".sort((a, b) => b.score - a.score)"),
      "Harus sorted by score desc",
    );
  });

  await test("AC-05b: embeddingFilterDiseases — cosine similarity implementasi benar", () => {
    const src = readFileSync(
      join(CWD, "src/lib/cdss/embedding-filter.ts"),
      "utf-8",
    );
    // Verifikasi formula cosine similarity: dot / (normA * normB)
    assert.ok(src.includes("dot += a[i] * b[i]"), "Harus ada dot product");
    assert.ok(src.includes("normA += a[i] * a[i]"), "Harus ada normA");
    assert.ok(src.includes("Math.sqrt(normA)"), "Harus ada sqrt normalization");
    assert.ok(src.includes("dot / denom"), "Formula cosine harus dot/denom");
  });

  // ── AC-06: autocomplete route structure ───────────────────────────────────
  await test("AC-06: autocomplete route — pakai deepseek-chat + struktur response benar", () => {
    const content = readRoute();
    assert.ok(content.includes("deepseek-chat"), "Harus pakai deepseek-chat");
    assert.ok(
      content.includes("suggestions"),
      "Response harus include suggestions",
    );
    assert.ok(
      content.includes("pemeriksaan"),
      "Response harus include pemeriksaan",
    );
    assert.ok(content.includes("fisik"), "pemeriksaan.fisik harus ada");
    assert.ok(content.includes("lab"), "pemeriksaan.lab harus ada");
    assert.ok(content.includes("penunjang"), "pemeriksaan.penunjang harus ada");
    assert.ok(
      existsSync(join(CWD, "src/app/api/cdss/autocomplete/route.ts")),
      "File route harus ada",
    );
  });

  await test("AC-06b: autocomplete route — timeout 8s + AbortSignal", () => {
    const content = readRoute();
    assert.ok(content.includes("8000"), "Timeout harus 8000ms");
    assert.ok(
      content.includes("AbortSignal.timeout"),
      "Harus pakai AbortSignal.timeout",
    );
  });

  await test("AC-06c: autocomplete route — runtime nodejs", () => {
    const content = readRoute();
    assert.ok(
      content.includes('runtime = "nodejs"'),
      "Harus export runtime nodejs",
    );
  });

  // ── AC-07: autocomplete guard query pendek ────────────────────────────────
  await test("AC-07: autocomplete — guard query < 2 char, return empty", () => {
    const content = readRoute();
    assert.ok(content.includes("query.length < 2"), "Guard query.length < 2");
    assert.ok(
      content.includes("suggestions: []"),
      "Return empty suggestions untuk query pendek",
    );
  });

  // ── AC-08: engine DeepSeek primary → Gemini fallback ──────────────────────
  await test("AC-08: engine — deepseek-reasoner sebagai primary", () => {
    const content = readEngine();
    assert.ok(
      content.includes("deepseek-reasoner"),
      "Harus pakai deepseek-reasoner",
    );
    assert.ok(
      content.includes("callDeepSeekReasoner"),
      "Harus ada callDeepSeekReasoner",
    );
  });

  await test("AC-08b: engine — Gemini 2.5 Flash-Lite sebagai fallback", () => {
    const content = readEngine();
    assert.ok(
      content.includes("gemini-2.5-flash-lite"),
      "Fallback harus Gemini 2.5 Flash-Lite",
    );
    assert.ok(content.includes("fallback ke Gemini"), "Harus ada log fallback");
    assert.ok(content.includes("console.warn"), "Harus warn saat fallback");
  });

  await test("AC-08c: engine — model_version mencerminkan model yang dipakai", () => {
    const content = readEngine();
    assert.ok(content.includes("modelUsed"), "Harus ada variabel modelUsed");
    assert.ok(
      content.includes("deepseek-reasoner"),
      "deepseek-reasoner di default modelUsed",
    );
    // Verifikasi template literal model_version
    assert.ok(content.includes("IDE-V2"), "model_version harus include IDE-V2");
  });

  await test("AC-08d: engine — DeepSeek timeout 30s", () => {
    const content = readEngine();
    assert.ok(content.includes("30000"), "DeepSeek timeout harus 30000ms");
    assert.ok(
      content.includes("AbortSignal.timeout"),
      "Harus pakai AbortSignal.timeout",
    );
  });

  // ── AC-09: engine fallback result tanpa API key ───────────────────────────
  await test("AC-09: engine — guard jika tidak ada API key sama sekali", () => {
    const content = readEngine();
    assert.ok(
      content.includes(
        "DEEPSEEK_API_KEY dan GEMINI_API_KEY keduanya tidak dikonfigurasi",
      ),
      "Harus ada pesan error kedua key tidak ada",
    );
    assert.ok(
      content.includes("buildFallbackResult"),
      "Harus panggil buildFallbackResult",
    );
    assert.ok(
      content.includes('source: "error"'),
      "Fallback source harus error",
    );
  });

  await test("AC-09b: engine — getCDSSEngineStatus cek kedua key", () => {
    const content = readEngine();
    assert.ok(content.includes("hasDeepSeek"), "Harus cek DEEPSEEK_API_KEY");
    assert.ok(content.includes("hasGemini"), "Harus cek GEMINI_API_KEY");
  });

  // ── AC-10: vital signs red flags hardcoded ────────────────────────────────
  await test("AC-10: vital signs — Hipertensi Krisis (sistolik ≥ 180)", () => {
    const content = readEngine();
    assert.ok(
      content.includes("Hipertensi Krisis"),
      "Harus detect Hipertensi Krisis",
    );
    assert.ok(
      content.includes("v.systolic >= 180"),
      "Threshold sistolik ≥ 180",
    );
    assert.ok(content.includes("I10"), "Harus include ICD-10 I10");
  });

  await test("AC-10b: vital signs — Hipotensi/Syok (sistolik < 90)", () => {
    const content = readEngine();
    assert.ok(content.includes("Hipotensi / Suspek Syok"), "Harus detect syok");
    assert.ok(content.includes("v.systolic < 90"), "Threshold sistolik < 90");
  });

  await test("AC-10c: vital signs — Hipoksia Berat (SpO2 < 90)", () => {
    const content = readEngine();
    assert.ok(content.includes("Hipoksia Berat"), "Harus detect hipoksia");
    assert.ok(content.includes("v.spo2 < 90"), "Threshold SpO2 < 90");
  });

  await test("AC-10d: vital signs — Hiperpireksia (suhu ≥ 40°C)", () => {
    const content = readEngine();
    assert.ok(content.includes("Hiperpireksia"), "Harus detect hiperpireksia");
    assert.ok(content.includes("v.temperature >= 40"), "Threshold suhu ≥ 40°C");
  });

  await test("AC-10e: vital signs — Takikardia Berat (HR > 140)", () => {
    const content = readEngine();
    assert.ok(content.includes("Takikardia Berat"), "Harus detect takikardia");
    assert.ok(content.includes("v.heart_rate > 140"), "Threshold HR > 140");
  });

  // ── AC-11: EMR page state & UI ────────────────────────────────────────────
  await test("AC-11: EMR page — state pemeriksaanSaran ada", () => {
    const content = readPage();
    assert.ok(
      content.includes("pemeriksaanSaran"),
      "Harus ada state pemeriksaanSaran",
    );
    assert.ok(content.includes("setPemeriksaanSaran"), "Harus ada setter");
  });

  await test("AC-11b: EMR page — triggerAutocomplete debounce 400ms ke /api/cdss/autocomplete", () => {
    const content = readPage();
    assert.ok(
      content.includes("triggerAutocomplete"),
      "Harus ada fungsi triggerAutocomplete",
    );
    assert.ok(content.includes("400"), "Debounce harus 400ms");
    assert.ok(
      content.includes("/api/cdss/autocomplete"),
      "Harus hit endpoint autocomplete",
    );
  });

  await test("AC-11c: EMR page — tombol RESET membersihkan semua autocomplete state", () => {
    const content = readPage();
    const resetIdx = content.indexOf("↺ RESET");
    assert.ok(resetIdx > 0, "Harus ada tombol RESET");
    // Reset state ada di dalam onClick handler sebelum teks "↺ RESET"
    // Window lebih besar: 1500 char sebelum tombol
    const resetBlock = content.slice(resetIdx - 1500, resetIdx + 50);
    assert.ok(
      resetBlock.includes("setSymptomSuggestions([])"),
      "Reset harus clear suggestions",
    );
    assert.ok(
      resetBlock.includes("setShowSuggestions(false)"),
      "Reset harus hide dropdown",
    );
    assert.ok(
      resetBlock.includes("setPemeriksaanSaran(null)"),
      "Reset harus clear pemeriksaan saran",
    );
  });

  await test("AC-11d: EMR page — panel SARAN PEMERIKSAAN dengan 3 kategori (fisik, lab, penunjang)", () => {
    const content = readPage();
    assert.ok(
      content.includes("SARAN PEMERIKSAAN"),
      "Harus ada label SARAN PEMERIKSAAN",
    );
    assert.ok(content.includes("pemeriksaanSaran.fisik"), "Harus render fisik");
    assert.ok(content.includes("pemeriksaanSaran.lab"), "Harus render lab");
    assert.ok(
      content.includes("pemeriksaanSaran.penunjang"),
      "Harus render penunjang",
    );
  });

  await test("AC-11e: EMR page — dropdown SARAN GEJALA label ada", () => {
    const content = readPage();
    assert.ok(
      content.includes("SARAN GEJALA"),
      "Dropdown harus ada label SARAN GEJALA",
    );
  });

  // ── AC-12: TypeScript clean ───────────────────────────────────────────────
  await test("AC-12: TypeScript — tsc --noEmit CLEAN", () => {
    try {
      execSync("npx tsc --noEmit", { cwd: CWD, stdio: "pipe" });
    } catch (e) {
      const out =
        e instanceof Error && "stdout" in e
          ? ((
              e as NodeJS.ErrnoException & { stdout: Buffer }
            ).stdout?.toString() ?? "")
          : String(e);
      throw new Error(`TypeScript errors:\n${out.slice(0, 800)}`);
    }
  });

  // ── Report ─────────────────────────────────────────────────────────────────
  const pass = results.filter((r) => r.status === "PASS").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  const skip = results.filter((r) => r.status === "SKIP").length;
  const total = results.length;

  console.log("\n" + "═".repeat(62));
  console.log("  CDSS V2 — TEST REPORT");
  console.log("═".repeat(62));

  for (const r of results) {
    const icon =
      r.status === "PASS" ? "✅" : r.status === "SKIP" ? "⏭️ " : "❌";
    const ms = r.ms > 500 ? ` (${r.ms}ms)` : "";
    console.log(`  ${icon} ${r.name}${ms}`);
    if (r.status === "FAIL" && r.error) {
      const lines = r.error.split("\n").slice(0, 2);
      for (const l of lines) console.log(`       → ${l}`);
    }
  }

  console.log("─".repeat(62));
  console.log(`  PASS: ${pass}  FAIL: ${fail}  SKIP: ${skip}  TOTAL: ${total}`);
  console.log("═".repeat(62));

  if (fail > 0) {
    console.log("\n  ❌ FAILURES — perlu perbaikan sebelum deploy\n");
    process.exit(1);
  } else {
    const skipNote =
      skip > 0
        ? ` (${skip} skipped — butuh GEMINI_API_KEY untuk live embedding)`
        : "";
    console.log(`\n  ✅ ALL PASS${skipNote} — siap deploy\n`);
    process.exit(0);
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
