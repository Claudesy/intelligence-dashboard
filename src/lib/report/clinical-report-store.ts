// Structured with care by Claudesy.
import "server-only";

import { existsSync } from "fs";
import { mkdir, readFile, readdir, writeFile } from "fs/promises";
import { join } from "path";

import { Prisma } from "@prisma/client";

import {
  appendClinicalCaseAuditEvent,
  CLINICAL_CASE_AUDIT_EVENTS,
} from "@/lib/audit/clinical-case-audit";
import { prisma } from "@/lib/prisma";
import type {
  ClinicalReport,
  ClinicalReportAnamnesa,
  ClinicalReportAssessment,
  ClinicalReportClosing,
  ClinicalReportDraftInput,
  ClinicalReportPhysicalExam,
  ClinicalReportPlan,
  ClinicalReportPatient,
} from "@/lib/report/clinical-report";

export const REPORTS_DIR = join(process.cwd(), "runtime", "clinical-reports");
export const REPORTS_PDF_DIR = join(REPORTS_DIR, "pdf");
const COUNTER_FILE = join(REPORTS_DIR, "_counter.json");

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function readJsonSection<T>(value: Prisma.JsonValue, fallback: T): T {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as unknown as T;
  }
  return fallback;
}

function buildSourceRefs(source: {
  appointmentId?: string | null;
  consultId?: string | null;
  origin?: string | null;
}): ClinicalReport["sourceRefs"] | undefined {
  const appointmentId = source.appointmentId ?? undefined;
  const consultId = source.consultId ?? undefined;
  const origin = source.origin ?? undefined;

  if (!appointmentId && !consultId && !origin) {
    return undefined;
  }

  return {
    appointmentId,
    consultId,
    origin,
  };
}

async function ensureReportsDir(): Promise<void> {
  if (!existsSync(REPORTS_DIR)) {
    await mkdir(REPORTS_DIR, { recursive: true });
  }
  if (!existsSync(REPORTS_PDF_DIR)) {
    await mkdir(REPORTS_PDF_DIR, { recursive: true });
  }
}

async function getNextCounterFromFile(): Promise<number> {
  await ensureReportsDir();
  try {
    const raw = await readFile(COUNTER_FILE, "utf-8");
    const data = JSON.parse(raw) as { next?: number };
    return data.next ?? 1;
  } catch {
    return 1;
  }
}

async function updateCounterFile(nextValue: number): Promise<void> {
  await ensureReportsDir();
  await writeFile(COUNTER_FILE, JSON.stringify({ next: nextValue }), "utf-8");
}

async function readReportsFromFile(): Promise<ClinicalReport[]> {
  await ensureReportsDir();
  const files = await readdir(REPORTS_DIR);
  const reports: ClinicalReport[] = [];

  for (const file of files) {
    if (file.startsWith("_") || !file.endsWith(".json")) continue;
    try {
      const content = JSON.parse(
        await readFile(join(REPORTS_DIR, file), "utf-8"),
      ) as ClinicalReport;
      reports.push(content);
    } catch {
      // skip corrupt files
    }
  }

  return reports.sort((a, b) => b.nomor - a.nomor);
}

async function readReportByIdFromFile(
  id: string,
): Promise<ClinicalReport | null> {
  await ensureReportsDir();
  try {
    const raw = await readFile(join(REPORTS_DIR, `${id}.json`), "utf-8");
    return JSON.parse(raw) as ClinicalReport;
  } catch {
    return null;
  }
}

function mapRecordToReport(record: {
  id: string;
  nomor: number;
  createdAt: Date;
  pdfStoragePath?: string | null;
  pdfGeneratedAt?: Date | null;
  sourceAppointmentId?: string | null;
  sourceConsultId?: string | null;
  sourceOrigin?: string | null;
  auditTrail: Prisma.JsonValue;
  pasien: Prisma.JsonValue;
  anamnesa: Prisma.JsonValue;
  pemeriksaanFisik: Prisma.JsonValue;
  asesmen: Prisma.JsonValue;
  tataLaksana: Prisma.JsonValue;
  penutup: Prisma.JsonValue;
}): ClinicalReport {
  return {
    id: record.id,
    nomor: record.nomor,
    createdAt: record.createdAt.toISOString(),
    pdfAvailable: Boolean(record.pdfStoragePath),
    pdfGeneratedAt: record.pdfGeneratedAt?.toISOString() ?? null,
    sourceRefs: buildSourceRefs({
      appointmentId: record.sourceAppointmentId,
      consultId: record.sourceConsultId,
      origin: record.sourceOrigin,
    }),
    auditTrail: readJsonSection(record.auditTrail, {}),
    pasien: readJsonSection<ClinicalReportPatient>(record.pasien, {
      noRM: "",
      nama: "",
      umur: "",
      jenisKelamin: "L",
      alamat: "",
    }),
    anamnesa: readJsonSection<ClinicalReportAnamnesa>(record.anamnesa, {
      keluhanUtama: "",
      rps: "",
      rpd: "",
      rpk: "",
      alergi: "",
    }),
    pemeriksaanFisik: readJsonSection<ClinicalReportPhysicalExam>(
      record.pemeriksaanFisik,
      {
        tdSistolik: "",
        tdDiastolik: "",
        nadi: "",
        suhu: "",
        napas: "",
        spo2: "",
        bb: "",
        tb: "",
        keadaanUmum: "Baik",
        kesadaran: "Compos Mentis",
        pemeriksaanLain: "",
      },
    ),
    asesmen: readJsonSection<ClinicalReportAssessment>(record.asesmen, {
      diagnosisKerja: "",
      icd10: "",
      diagnosisBanding: "",
      prognosis: "Dubia ad bonam",
    }),
    tataLaksana: readJsonSection<ClinicalReportPlan>(record.tataLaksana, {
      terapi: "",
      tindakan: "",
      edukasi: "",
      tindakLanjut: "",
    }),
    penutup: readJsonSection<ClinicalReportClosing>(record.penutup, {
      dokter: "",
      perawat: "",
      tanggalPemeriksaan: "",
      jamPemeriksaan: "",
    }),
  };
}

function buildReportId(counter: number, createdAt: Date): string {
  const dateStr = createdAt.toISOString().slice(0, 10).replace(/-/g, "");
  return `RPT-${dateStr}-${String(counter).padStart(4, "0")}`;
}

export async function getNextClinicalReportNumber(): Promise<number> {
  try {
    const result = await prisma.clinicalReport.aggregate({
      _max: { nomor: true },
    });
    return (result._max.nomor ?? 0) + 1;
  } catch {
    return getNextCounterFromFile();
  }
}

export async function listClinicalReports(options?: {
  dokter?: string | null;
  limit?: number | null;
}): Promise<{ reports: ClinicalReport[]; nextNumber: number }> {
  const dokter = options?.dokter?.trim() || null;
  const limit = options?.limit && options.limit > 0 ? options.limit : null;

  try {
    const rows = await prisma.clinicalReport.findMany({
      where: dokter
        ? {
            doctorName: {
              contains: dokter,
              mode: "insensitive",
            },
          }
        : undefined,
      orderBy: { nomor: "desc" },
      take: limit ?? undefined,
    });

    return {
      reports: rows.map(mapRecordToReport),
      nextNumber: await getNextClinicalReportNumber(),
    };
  } catch {
    let reports = await readReportsFromFile();
    if (dokter) {
      reports = reports.filter((report) =>
        report.penutup.dokter.toLowerCase().includes(dokter.toLowerCase()),
      );
    }
    if (limit) {
      reports = reports.slice(0, limit);
    }
    return {
      reports,
      nextNumber: await getNextCounterFromFile(),
    };
  }
}

export async function findClinicalReportById(
  id: string,
): Promise<ClinicalReport | null> {
  try {
    const row = await prisma.clinicalReport.findUnique({ where: { id } });
    return row ? mapRecordToReport(row) : null;
  } catch {
    return readReportByIdFromFile(id);
  }
}

export async function saveClinicalReport(
  body: ClinicalReportDraftInput,
): Promise<ClinicalReport> {
  const counter = await getNextClinicalReportNumber();
  const now = new Date();
  const report: ClinicalReport = {
    id: buildReportId(counter, now),
    nomor: counter,
    createdAt: now.toISOString(),
    pdfAvailable: false,
    pdfGeneratedAt: null,
    sourceRefs: body.sourceRefs ?? {},
    auditTrail: body.auditTrail ?? {},
    pasien: {
      noRM: `PKM-BLW-${String(counter).padStart(4, "0")}`,
      nama: `Pasien ${String(counter).padStart(3, "0")}`,
      umur: "",
      jenisKelamin: "L",
      alamat: "",
      ...(body.pasien ?? {}),
    },
    anamnesa: {
      keluhanUtama: "",
      rps: "",
      rpd: "",
      rpk: "",
      alergi: "",
      ...(body.anamnesa ?? {}),
    },
    pemeriksaanFisik: {
      tdSistolik: "",
      tdDiastolik: "",
      nadi: "",
      suhu: "",
      napas: "",
      spo2: "",
      bb: "",
      tb: "",
      keadaanUmum: "Baik",
      kesadaran: "Compos Mentis",
      pemeriksaanLain: "",
      ...(body.pemeriksaanFisik ?? {}),
    },
    asesmen: {
      diagnosisKerja: "",
      icd10: "",
      diagnosisBanding: "",
      prognosis: "Dubia ad bonam",
      ...(body.asesmen ?? {}),
    },
    tataLaksana: {
      terapi: "",
      tindakan: "",
      edukasi: "",
      tindakLanjut: "",
      ...(body.tataLaksana ?? {}),
    },
    penutup: {
      dokter: "",
      perawat: "",
      tanggalPemeriksaan: now.toISOString().slice(0, 10),
      jamPemeriksaan: now.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      ...(body.penutup ?? {}),
    },
  };

  try {
    await prisma.clinicalReport.create({
      data: {
        id: report.id,
        nomor: report.nomor,
        doctorName: report.penutup.dokter || null,
        patientMrn: null,
        patientName: null,
        diagnosisKerja: report.asesmen.diagnosisKerja || null,
        sourceAppointmentId: report.sourceRefs?.appointmentId || null,
        sourceConsultId: report.sourceRefs?.consultId || null,
        sourceOrigin: report.sourceRefs?.origin || null,
        auditTrail: asJson(report.auditTrail),
        pasien: asJson(report.pasien),
        anamnesa: asJson(report.anamnesa),
        pemeriksaanFisik: asJson(report.pemeriksaanFisik),
        asesmen: asJson(report.asesmen),
        tataLaksana: asJson(report.tataLaksana),
        penutup: asJson(report.penutup),
      },
    });

    await appendClinicalCaseAuditEvent({
      eventType: CLINICAL_CASE_AUDIT_EVENTS.CASE_FINALIZED,
      actorUserId: report.sourceRefs?.actorUserId ?? null,
      actorName: report.sourceRefs?.actorName ?? report.penutup.dokter ?? null,
      appointmentId: report.sourceRefs?.appointmentId ?? null,
      consultId: report.sourceRefs?.consultId ?? null,
      reportId: report.id,
      sourceOrigin: report.sourceRefs?.origin ?? "clinical-report",
      payload: asJson({
        reportId: report.id,
        nomor: report.nomor,
        doctorName: report.penutup.dokter,
        patientMrn: null,
        patientName: null,
        diagnosisKerja: report.asesmen.diagnosisKerja,
        diagnosisBanding: report.asesmen.diagnosisBanding,
        prognosis: report.asesmen.prognosis,
        icd10: report.asesmen.icd10,
        generatedAt: report.auditTrail.generatedAt ?? report.createdAt,
        careMode: report.auditTrail.careMode ?? null,
        diagnosisSource: report.auditTrail.diagnosisSource ?? null,
      }),
    });
  } catch (err) {
    console.error("[ClinicalReport] Failed to save to Prisma:", err);
  } finally {
    await ensureReportsDir();
    await writeFile(
      join(REPORTS_DIR, `${report.id}.json`),
      JSON.stringify(report, null, 2),
      "utf-8",
    );
    await updateCounterFile(report.nomor + 1);
  }

  return report;
}

export async function deleteClinicalReport(id: string): Promise<boolean> {
  let deleted = false;
  try {
    await prisma.clinicalReport.delete({ where: { id } });
    deleted = true;
  } catch (err) {
    console.error(`[ClinicalReport] Failed to delete from Prisma (id: ${id}):`, err);
  }
  // Also remove file-based copy
  const filePath = join(REPORTS_DIR, `${id}.json`);
  if (existsSync(filePath)) {
    const { unlink } = await import("fs/promises");
    await unlink(filePath);
    deleted = true;
  }
  // Remove PDF if exists
  const pdfPath = join(REPORTS_PDF_DIR, `${id}.pdf`);
  if (existsSync(pdfPath)) {
    const { unlink } = await import("fs/promises");
    await unlink(pdfPath);
  }
  return deleted;
}

export async function markClinicalReportPdfGenerated(
  id: string,
  pdfStoragePath: string,
): Promise<void> {
  const generatedAt = new Date();

  try {
    await prisma.clinicalReport.update({
      where: { id },
      data: {
        pdfStoragePath,
        pdfGeneratedAt: generatedAt,
      },
    });
  } catch (err) {
    console.error(`[ClinicalReport] Failed to update PDF status (id: ${id}):`, err);
    const fileReport = await readReportByIdFromFile(id);
    if (!fileReport) return;
    const updatedReport: ClinicalReport = {
      ...fileReport,
      pdfAvailable: true,
      pdfGeneratedAt: generatedAt.toISOString(),
    };
    await writeFile(
      join(REPORTS_DIR, `${id}.json`),
      JSON.stringify(updatedReport, null, 2),
      "utf-8",
    );
  }
}
