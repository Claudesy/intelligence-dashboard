// Architected and built by Claudesy.
import "server-only";
import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

import { ICD_MAP } from "@/lib/lb1/icd-mapping";
import {
  normalizeIcd10Code,
  transformToIcd10_2010,
} from "@/lib/lb1/icd10-2010";
import { lookupIcdDynamically } from "@/lib/icd/dynamic-db";
import { searchIcdOnline, type OnlineIcdResult } from "@/lib/icd/online-api";

export const runtime = "nodejs";

// ── Local penyakit.json (171 Indonesian diseases) ─────────────────────────────

interface PenyakitEntry {
  nama: string;
  nama_en: string;
  icd10: string;
}

let _penyakitCache: PenyakitEntry[] | null = null;

function loadPenyakit(): PenyakitEntry[] {
  if (_penyakitCache) return _penyakitCache;
  try {
    const raw = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), "public/data/penyakit.json"),
        "utf-8",
      ),
    ) as { penyakit?: PenyakitEntry[] } | PenyakitEntry[];
    _penyakitCache = Array.isArray(raw) ? raw : (raw.penyakit ?? []);
  } catch {
    _penyakitCache = [];
  }
  return _penyakitCache;
}

function searchLocalPenyakit(
  q: string,
): Array<{ code: string; name: string; nameId: string }> {
  if (!q) return [];
  const lower = q.toLowerCase();
  return loadPenyakit()
    .filter(
      (p) =>
        p.icd10?.toLowerCase().includes(lower) ||
        p.nama?.toLowerCase().includes(lower) ||
        p.nama_en?.toLowerCase().includes(lower),
    )
    .map((p) => ({ code: p.icd10, name: p.nama_en || p.nama, nameId: p.nama }));
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function inferCategory(code: string): string {
  const ch = code.trim().toUpperCase()[0];
  return ch ? `CHAPTER ${ch}` : "ICD-10";
}

function extractExplicitCodes(input: string): string[] {
  const matches =
    input.toUpperCase().match(/\b([A-Z][0-9]{2}(?:\.[0-9A-Z]{1,4})?)\b/g) ?? [];
  return Array.from(new Set(matches));
}

function searchIcdMap(q: string): Array<{ code: string; name: string }> {
  if (!q) return [];
  const lower = q.toLowerCase();
  return Object.values(ICD_MAP)
    .filter(
      (e) =>
        e.code.toLowerCase().includes(lower) ||
        e.name.toLowerCase().includes(lower),
    )
    .map((e) => ({ code: e.code, name: e.name }));
}

function mergeResults(
  local: Array<{ code: string; name: string }>,
  online: OnlineIcdResult[],
): Array<{ code: string; name: string }> {
  const seen = new Set<string>();
  const merged: Array<{ code: string; name: string }> = [];

  for (const item of local) {
    const key = item.code.toUpperCase();
    if (item.code && !seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  }
  for (const item of online) {
    const key = item.code.toUpperCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push({ code: item.code, name: item.name });
    }
  }
  return merged;
}

function buildConversionRows(
  query: string,
  allResults: Array<{ code: string; name: string }>,
) {
  const transformed = transformToIcd10_2010(query, { stripSubcode: false });
  const explicitCodes = extractExplicitCodes(query);

  let codesForRows: string[] = explicitCodes;
  if (codesForRows.length === 0 && transformed.mode === "range") {
    codesForRows = transformed.candidateCodes;
  }
  if (codesForRows.length === 0 && transformed.primaryCode) {
    codesForRows = [transformed.primaryCode];
  }
  if (codesForRows.length === 0) return [];

  const byCode = new Map(allResults.map((r) => [r.code.toUpperCase(), r]));

  return codesForRows.slice(0, 10).map((rawCode) => {
    const normFull = normalizeIcd10Code(rawCode, false) || rawCode;
    const normHead = normalizeIcd10Code(rawCode, true) || rawCode;

    const hit =
      byCode.get(rawCode.toUpperCase()) ??
      byCode.get(normFull.toUpperCase()) ??
      allResults.find((r) =>
        r.code.toUpperCase().startsWith(normHead.toUpperCase()),
      );

    const icdMapEntry =
      ICD_MAP[rawCode] ?? ICD_MAP[normFull] ?? ICD_MAP[normHead];

    const resolvedName = hit?.name ?? icdMapEntry?.name ?? "";
    const resolvedCode = hit?.code ?? normFull;
    const knownIn2010 =
      Boolean(icdMapEntry) || Boolean(normalizeIcd10Code(normHead, true));

    return {
      modern: rawCode,
      modernResolvedCode: resolvedCode,
      modernName: resolvedName,
      exactModernMatch: Boolean(hit),
      legacy: normFull,
      knownIn2010,
      knownIn2019: Boolean(hit),
      legacyName: resolvedName,
    };
  });
}

// ── Route Handler ──────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";

    // 1. Try local XML/JSON database files (when available)
    //    Only use local when results are populated — rows alone may be empty shells
    const local = lookupIcdDynamically(q);
    if (local.results.length > 0) {
      return NextResponse.json({ ok: true, ...local });
    }

    // 2. Empty query — skip API calls
    if (!q.trim()) {
      return NextResponse.json({
        ok: true,
        normalizedPrimary: "",
        results: [],
        rows: [],
        loadedFrom: {
          "2010": "PCare Mapping (local)",
          "2016": "online",
          "2019": "NLM ICD-10-CM (online)",
        },
        extensionSource: "https://clinicaltables.nlm.nih.gov",
      });
    }

    // 3. Hybrid search: local Indonesian data + NLM online
    const [penyakitResults, icdMapResults, onlineResults] = await Promise.all([
      Promise.resolve(searchLocalPenyakit(q)),
      Promise.resolve(searchIcdMap(q)),
      searchIcdOnline(q, 40).catch(() => [] as OnlineIcdResult[]),
    ]);

    const localCombined = [...penyakitResults, ...icdMapResults];
    const allResults = mergeResults(localCombined, onlineResults);

    const results = allResults.slice(0, 80).map(({ code, name }) => ({
      code,
      name,
      category: inferCategory(code),
    }));

    const transformed = transformToIcd10_2010(q, { stripSubcode: false });
    const rows = buildConversionRows(q, allResults);

    return NextResponse.json({
      ok: true,
      normalizedPrimary: transformed.primaryCode,
      results,
      rows,
      loadedFrom: {
        "2010": "PCare Mapping (local)",
        "2016": "penyakit.json (171 KKI)",
        "2019": "NLM ICD-10-CM (online)",
      },
      extensionSource: "https://clinicaltables.nlm.nih.gov",
    });
  } catch (error) {
    console.error("[ICDx]", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load ICD database",
      },
      { status: 500 },
    );
  }
}
