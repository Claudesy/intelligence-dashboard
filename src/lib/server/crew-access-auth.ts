// Blueprinted & built by Claudesy.
import "server-only";

import fs from "node:fs";
import path from "node:path";
import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import {
  CREW_ACCESS_COOKIE_NAME,
  CREW_ACCESS_INSTITUTIONS,
  CREW_ACCESS_PROFESSIONS,
  CREW_ACCESS_SESSION_TTL_SECONDS,
  deriveCrewRoleFromProfession,
  isCrewAccessInstitution,
  isCrewAccessProfession,
  type CrewAccessSession,
  type CrewAccessInstitution,
  type CrewAccessProfession,
  type CrewAccessUser,
} from "@/lib/crew-access";
import { CREW_USERS } from "@/lib/server/crew-access-users";

interface CrewAccessCredential extends CrewAccessUser {
  password?: string;
  passwordHash?: string;
  role: string;
  email: string;
  institution: CrewAccessInstitution;
  profession: CrewAccessProfession;
  status?: string;
}

interface SessionPayloadV1 {
  v: 1;
  username: string;
  displayName: string;
  email: string;
  institution: CrewAccessInstitution;
  profession: CrewAccessProfession;
  role: string;
  issuedAt: number;
  expiresAt: number;
}

let cachedSecret: string | null = null;
let cachedUsers: CrewAccessCredential[] | null = null;
let cachedUsersMtimeMs = -1;
const DEFAULT_INSTITUTION = CREW_ACCESS_INSTITUTIONS[0];
const DEFAULT_PROFESSION = CREW_ACCESS_PROFESSIONS[3];
const PASSWORD_HASH_VERSION = "scrypt";
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;

type CrewAccessUserRecord = Record<string, unknown>;

function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

async function deriveScryptKey(
  password: string,
  salt: Buffer,
  keyLength: number,
  params: { N: number; r: number; p: number },
): Promise<Buffer> {
  return await new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, keyLength, params, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derivedKey as Buffer);
    });
  });
}

function getUsersFilePath(): string {
  return (
    process.env.CREW_ACCESS_USERS_FILE?.trim() ||
    path.join(process.cwd(), "runtime", "crew-access-users.json")
  );
}

function normalizeInstitution(value: unknown): CrewAccessInstitution {
  const institution = String(value ?? "").trim();
  return isCrewAccessInstitution(institution)
    ? institution
    : DEFAULT_INSTITUTION;
}

function normalizeProfession(
  value: unknown,
  roleValue: unknown,
): CrewAccessProfession {
  const profession = String(value ?? "").trim();
  if (isCrewAccessProfession(profession)) return profession;

  const normalizedRole = String(roleValue ?? "")
    .trim()
    .toUpperCase();
  switch (normalizedRole) {
    case "DOKTER":
    case "DOCTOR":
      return "Dokter";
    case "DOKTER_GIGI":
      return "Dokter Gigi";
    case "PERAWAT":
      return "Perawat";
    case "BIDAN":
      return "Bidan";
    case "APOTEKER":
      return "Apoteker";
    default:
      return DEFAULT_PROFESSION;
  }
}

function parseUsersFromJson(raw: string): CrewAccessCredential[] {
  const parsed = JSON.parse(raw) as Array<{
    username?: unknown;
    password?: unknown;
    displayName?: unknown;
  }>;

  if (!Array.isArray(parsed)) return [];

  const users: CrewAccessCredential[] = [];
  for (const item of parsed) {
    const username = String(item.username ?? "").trim();
    const password = String(item.password ?? "").trim();
    const passwordHash = String(
      (item as { passwordHash?: unknown }).passwordHash ?? "",
    ).trim();
    const displayName = String(item.displayName ?? username).trim();
    if (!username || (!password && !passwordHash) || !displayName) continue;
    const profession = normalizeProfession(
      (item as { profession?: unknown }).profession,
      (item as { role?: unknown }).role,
    );
    const status = String(
      (item as { status?: unknown }).status ?? "ACTIVE",
    ).trim();
    users.push({
      username: normalizeUsername(username),
      password: password || undefined,
      passwordHash: passwordHash || undefined,
      displayName,
      email: normalizeEmail(
        String(
          (item as { email?: unknown }).email ?? `${username}@local.invalid`,
        ),
      ),
      institution: normalizeInstitution(
        (item as { institution?: unknown }).institution,
      ),
      profession,
      role: String(
        (item as { role?: unknown }).role ??
          deriveCrewRoleFromProfession(profession),
      ).trim(),
      status,
    });
  }

  return users;
}

function credentialToUserRecord(
  user: CrewAccessCredential,
): CrewAccessUserRecord {
  const record: CrewAccessUserRecord = {
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    institution: user.institution,
    profession: user.profession,
    role: user.role,
    status: String(user.status ?? "ACTIVE").trim(),
  };

  if (user.passwordHash) record.passwordHash = user.passwordHash;
  if (user.password) record.password = user.password;

  return record;
}

function tryParseUsersJson(raw: string): CrewAccessCredential[] {
  // Pass 1: parse langsung
  const parsed = JSON.parse(raw);
  // Pass 2: Railway kadang wrap array dalam string — double-parse
  if (typeof parsed === "string") return parseUsersFromJson(parsed);
  return parseUsersFromJson(raw);
}

function loadUsersFromEnv(): CrewAccessCredential[] {
  const json = process.env.CREW_ACCESS_USERS_JSON?.trim() ?? "";
  if (!json) return [];

  // Attempt 1: parse as-is
  try {
    return tryParseUsersJson(json);
  } catch (err1) {
    console.error(
      "[crew-access] Parse attempt 1 failed:",
      (err1 as Error).message,
    );
  }

  // Attempt 2: unescape \" → " (Railway kadang escape quotes)
  try {
    const unescaped = json.replace(/\\"/g, '"');
    const result = tryParseUsersJson(unescaped);
    console.log(
      "[crew-access] Parse berhasil setelah unescape. Users:",
      result.length,
    );
    return result;
  } catch (err2) {
    console.error(
      "[crew-access] Parse attempt 2 (unescape) failed:",
      (err2 as Error).message,
    );
  }

  // Attempt 3: strip outer quotes jika Railway wrap dengan "..."
  try {
    const stripped = json.replace(/^["']|["']$/g, "");
    const result = tryParseUsersJson(stripped);
    console.log(
      "[crew-access] Parse berhasil setelah strip outer quotes. Users:",
      result.length,
    );
    return result;
  } catch (err3) {
    console.error(
      "[crew-access] Parse attempt 3 (strip quotes) failed:",
      (err3 as Error).message,
    );
    console.error("[crew-access] CREW_ACCESS_USERS_JSON length:", json.length);
    return [];
  }
}

function loadUsersFromFile(): CrewAccessCredential[] {
  const filePath = getUsersFilePath();
  if (!fs.existsSync(filePath)) return [];

  const stat = fs.statSync(filePath);
  if (cachedUsers && cachedUsersMtimeMs === stat.mtimeMs) {
    return cachedUsers;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const users = parseUsersFromJson(content);
  cachedUsers = users;
  cachedUsersMtimeMs = stat.mtimeMs;
  return users;
}

function getCrewAccessUsers(): CrewAccessCredential[] {
  const envUsers = loadUsersFromEnv();
  const fileUsers = loadUsersFromFile();

  // Merge: env users as base, then add file-only users (e.g. approved registrations)
  if (envUsers.length > 0) {
    if (fileUsers.length === 0) return envUsers;
    const envUsernames = new Set(envUsers.map((u) => u.username));
    const extra = fileUsers.filter((u) => !envUsernames.has(u.username));
    return extra.length > 0 ? [...envUsers, ...extra] : envUsers;
  }

  if (fileUsers.length > 0) return fileUsers;
  if (process.env.NODE_ENV === "production") return [];
  // Fallback: gunakan users yang di-compile ke dalam kode
  return CREW_USERS;
}

function getMergedUserRecords(): CrewAccessUserRecord[] {
  const merged = new Map<string, CrewAccessUserRecord>();

  for (const user of loadUsersFromEnv()) {
    merged.set(user.username, credentialToUserRecord(user));
  }

  for (const record of readUsersFileRaw()) {
    const username = normalizeUsername(String(record.username ?? ""));
    if (!username) continue;

    const existing = merged.get(username) ?? {};
    merged.set(username, {
      ...existing,
      ...record,
      username,
    });
  }

  if (merged.size > 0) {
    return Array.from(merged.values());
  }

  if (process.env.NODE_ENV === "production") return [];
  return CREW_USERS.map((user) =>
    credentialToUserRecord({
      ...user,
      status: "ACTIVE",
    }),
  );
}

function getSecret(): string {
  if (cachedSecret) return cachedSecret;

  const envSecret = process.env.CREW_ACCESS_SECRET?.trim();
  if (envSecret) {
    cachedSecret = envSecret;
    return envSecret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("CREW_ACCESS_SECRET belum diatur untuk production.");
  }

  cachedSecret = randomBytes(48).toString("hex");
  return cachedSecret;
}

function createSignature(payloadBase64: string): string {
  return createHmac("sha256", getSecret())
    .update(payloadBase64)
    .digest("base64url");
}

function parseCookie(cookieHeader: string, cookieName: string): string | null {
  const pairs = cookieHeader.split(";").map((p) => p.trim());
  for (const pair of pairs) {
    if (!pair) continue;
    const eqIdx = pair.indexOf("=");
    if (eqIdx <= 0) continue;
    const key = pair.slice(0, eqIdx).trim();
    const value = pair.slice(eqIdx + 1).trim();
    if (key === cookieName) return value;
  }
  return null;
}

function toSession(payload: SessionPayloadV1): CrewAccessSession {
  return {
    username: payload.username,
    displayName: payload.displayName,
    email: payload.email,
    institution: payload.institution,
    profession: payload.profession,
    role: payload.role ?? "PERAWAT",
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
  };
}

function parsePasswordHash(storedHash: string): {
  salt: Buffer;
  derivedKey: Buffer;
  N: number;
  r: number;
  p: number;
} | null {
  const parts = storedHash.split("$");
  if (parts.length !== 6 || parts[0] !== PASSWORD_HASH_VERSION) return null;

  const [, n, r, p, salt, derived] = parts;
  const parsedN = Number(n);
  const parsedR = Number(r);
  const parsedP = Number(p);
  if (
    !Number.isFinite(parsedN) ||
    !Number.isFinite(parsedR) ||
    !Number.isFinite(parsedP)
  )
    return null;

  try {
    return {
      salt: Buffer.from(salt, "base64url"),
      derivedKey: Buffer.from(derived, "base64url"),
      N: parsedN,
      r: parsedR,
      p: parsedP,
    };
  } catch {
    return null;
  }
}

export async function hashCrewAccessPassword(
  password: string,
): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = await deriveScryptKey(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });

  return [
    PASSWORD_HASH_VERSION,
    String(SCRYPT_N),
    String(SCRYPT_R),
    String(SCRYPT_P),
    salt.toString("base64url"),
    Buffer.from(derivedKey).toString("base64url"),
  ].join("$");
}

async function verifyCrewAccessPassword(
  password: string,
  credential: CrewAccessCredential,
): Promise<boolean> {
  if (credential.passwordHash) {
    const parsed = parsePasswordHash(credential.passwordHash);
    if (!parsed) return false;

    const derivedKey = await deriveScryptKey(
      password,
      parsed.salt,
      parsed.derivedKey.length,
      {
        N: parsed.N,
        r: parsed.r,
        p: parsed.p,
      },
    );

    if (derivedKey.length !== parsed.derivedKey.length) return false;
    return timingSafeEqual(derivedKey, parsed.derivedKey);
  }

  if (!credential.password) return false;
  return credential.password === password;
}

export function listCrewAccessUsers(): CrewAccessUser[] {
  return getCrewAccessUsers().map((user) => ({
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    institution: user.institution,
    profession: user.profession,
    role: user.role,
  }));
}

export async function validateCrewAccess(
  username: string,
  password: string,
): Promise<CrewAccessUser | null> {
  const normalizedUsername = normalizeUsername(username);
  const normalizedEmail = normalizeEmail(username);
  const users = getCrewAccessUsers();
  const found = users.find(
    (u) => u.username === normalizedUsername || u.email === normalizedEmail,
  );
  if (!found) return null;
  if (!(await verifyCrewAccessPassword(password, found))) return null;
  return {
    username: found.username,
    displayName: found.displayName,
    email: found.email,
    institution: found.institution,
    profession: found.profession,
    role: found.role,
  };
}

export function createCrewSession(user: CrewAccessUser): {
  token: string;
  session: CrewAccessSession;
} {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload: SessionPayloadV1 = {
    v: 1,
    username: normalizeUsername(user.username),
    displayName: user.displayName,
    email: normalizeEmail(user.email ?? `${user.username}@local.invalid`),
    institution: normalizeInstitution(user.institution),
    profession: isCrewAccessProfession(user.profession ?? "")
      ? (user.profession ?? DEFAULT_PROFESSION)
      : DEFAULT_PROFESSION,
    role: user.role ?? "PERAWAT",
    issuedAt: nowSeconds,
    expiresAt: nowSeconds + CREW_ACCESS_SESSION_TTL_SECONDS,
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload), "utf-8").toString(
    "base64url",
  );
  const signature = createSignature(payloadBase64);
  return {
    token: `${payloadBase64}.${signature}`,
    session: toSession(payload),
  };
}

/**
 * Verify crew session from raw cookie header string.
 * Used by Socket.IO middleware where no Request object is available.
 */
export function getCrewSessionFromCookieHeader(
  cookieHeader: string,
): CrewAccessSession | null {
  try {
    const token = parseCookie(cookieHeader, CREW_ACCESS_COOKIE_NAME);
    if (!token) return null;

    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [payloadBase64, signature] = parts;
    const expectedSignature = createSignature(payloadBase64);
    const actualSigBuffer = Buffer.from(signature, "utf-8");
    const expectedSigBuffer = Buffer.from(expectedSignature, "utf-8");

    if (actualSigBuffer.length !== expectedSigBuffer.length) return null;
    if (!timingSafeEqual(actualSigBuffer, expectedSigBuffer)) return null;

    const payload = JSON.parse(
      Buffer.from(payloadBase64, "base64url").toString("utf-8"),
    ) as SessionPayloadV1;

    if (payload.v !== 1) return null;
    if (!payload.username || !payload.displayName) return null;
    if (
      !Number.isInteger(payload.issuedAt) ||
      !Number.isInteger(payload.expiresAt)
    )
      return null;
    if (payload.expiresAt <= Math.floor(Date.now() / 1000)) return null;
    const users = getCrewAccessUsers();
    const found = users.find(
      (u) => u.username === normalizeUsername(payload.username),
    );
    if (!found) return null;
    if (found.status === "INACTIVE") return null;

    return {
      username: found.username,
      displayName: found.displayName,
      email: found.email,
      institution: found.institution,
      profession: found.profession,
      role: found.role,
      issuedAt: payload.issuedAt,
      expiresAt: payload.expiresAt,
    };
  } catch {
    return null;
  }
}

export function getCrewSessionFromRequest(
  request: Request,
): CrewAccessSession | null {
  return getCrewSessionFromCookieHeader(request.headers.get("cookie") ?? "");
}

function safeTokenEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf-8");
  const rightBuffer = Buffer.from(right, "utf-8");
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function getAutomationTokenFromRequest(request: Request): string {
  const tokenFromHeader =
    request.headers.get("x-crew-access-token")?.trim() ?? "";
  if (tokenFromHeader) return tokenFromHeader;

  const authorization = request.headers.get("authorization")?.trim() ?? "";
  if (/^bearer\s+/i.test(authorization)) {
    return authorization.replace(/^bearer\s+/i, "").trim();
  }
  return "";
}

export function isCrewAuthorizedRequest(request: Request): boolean {
  const session = getCrewSessionFromRequest(request);
  if (session) return true;

  const automationToken = getAutomationTokenFromRequest(request);
  const expectedAutomationToken =
    process.env.CREW_ACCESS_AUTOMATION_TOKEN?.trim() ?? "";
  if (!automationToken || !expectedAutomationToken) return false;

  return safeTokenEqual(automationToken, expectedAutomationToken);
}

export function getSessionCookieOptions() {
  return {
    name: CREW_ACCESS_COOKIE_NAME,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CREW_ACCESS_SESSION_TTL_SECONDS,
  };
}

export function invalidateCrewAccessUserCache(): void {
  cachedUsers = null;
  cachedUsersMtimeMs = -1;
}

export function appendCrewAccessUserToFile(user: {
  username: string;
  displayName: string;
  email: string;
  institution: string;
  profession: string;
  role: string;
  passwordHash: string;
}): void {
  const filePath = getUsersFilePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let users: Record<string, unknown>[] = [];
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, "utf-8").trim();
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) users = parsed;
    }
  }

  users.push({
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    institution: user.institution,
    profession: user.profession,
    role: user.role,
    passwordHash: user.passwordHash,
  });

  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(users, null, 2), "utf-8");
  fs.renameSync(tempPath, filePath);

  invalidateCrewAccessUserCache();
}

/* ── File locking for user writes ── */

function getUsersLockFilePath(): string {
  return `${getUsersFilePath()}.lock`;
}

async function withUserFileLock<T>(task: () => Promise<T>): Promise<T> {
  const lockPath = getUsersLockFilePath();
  const dir = path.dirname(lockPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const startedAt = Date.now();
  const staleMs = 30_000;

  while (true) {
    try {
      const handle = fs.openSync(lockPath, "wx");
      try {
        return await task();
      } finally {
        fs.closeSync(handle);
        fs.rmSync(lockPath, { force: true });
      }
    } catch (error) {
      const isLockBusy =
        error instanceof Error &&
        "code" in error &&
        (error as NodeJS.ErrnoException).code === "EEXIST";
      if (!isLockBusy) throw error;

      try {
        const stat = fs.statSync(lockPath);
        if (Date.now() - stat.mtimeMs > staleMs) {
          fs.rmSync(lockPath, { force: true });
          continue;
        }
      } catch {
        continue;
      }

      if (Date.now() - startedAt > 2000) {
        throw new Error("Data user sedang diperbarui. Silakan coba lagi.");
      }
      await new Promise((r) => setTimeout(r, 50));
    }
  }
}

function readUsersFileRaw(): CrewAccessUserRecord[] {
  const filePath = getUsersFilePath();
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf-8").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeUsersFile(records: CrewAccessUserRecord[]): void {
  const filePath = getUsersFilePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(records, null, 2), "utf-8");
  fs.renameSync(tmp, filePath);
  invalidateCrewAccessUserCache();
}

/** List ALL users including inactive — for admin views */
export function listCrewAccessUsersAll(): (CrewAccessUser & {
  status?: string;
})[] {
  return getMergedUserRecords().map((item) => ({
    username: String(item.username ?? "").trim(),
    displayName: String(item.displayName ?? "").trim(),
    email: String(item.email ?? "").trim(),
    institution: String(item.institution ?? "").trim() as CrewAccessInstitution,
    profession: String(item.profession ?? "").trim() as CrewAccessProfession,
    role: String(item.role ?? "").trim(),
    status: String(item.status ?? "ACTIVE").trim(),
  }));
}

/** Update auth-level fields for a user (admin operation) */
export async function updateCrewAccessUser(
  username: string,
  updates: {
    displayName?: string;
    email?: string;
    institution?: string;
    profession?: string;
    role?: string;
  },
): Promise<void> {
  return withUserFileLock(async () => {
    const records = getMergedUserRecords();
    const index = records.findIndex(
      (r) => String(r.username ?? "").toLowerCase() === username.toLowerCase(),
    );
    if (index < 0) throw new Error("User tidak ditemukan.");

    if (updates.displayName)
      records[index].displayName = updates.displayName.trim();
    if (updates.email)
      records[index].email = updates.email.trim().toLowerCase();
    if (updates.institution)
      records[index].institution = updates.institution.trim();
    if (updates.profession)
      records[index].profession = updates.profession.trim();
    if (updates.role) records[index].role = updates.role.trim();

    writeUsersFile(records);
  });
}

/** Soft-deactivate a user */
export async function deactivateCrewAccessUser(
  username: string,
  by: string,
): Promise<void> {
  return withUserFileLock(async () => {
    const records = getMergedUserRecords();
    const index = records.findIndex(
      (r) => String(r.username ?? "").toLowerCase() === username.toLowerCase(),
    );
    if (index < 0) throw new Error("User tidak ditemukan.");

    records[index].status = "INACTIVE";
    records[index].deactivatedAt = new Date().toISOString();
    records[index].deactivatedBy = by;

    writeUsersFile(records);
  });
}

/** Reactivate an inactive user */
export async function reactivateCrewAccessUser(
  username: string,
): Promise<void> {
  return withUserFileLock(async () => {
    const records = getMergedUserRecords();
    const index = records.findIndex(
      (r) => String(r.username ?? "").toLowerCase() === username.toLowerCase(),
    );
    if (index < 0) throw new Error("User tidak ditemukan.");

    records[index].status = "ACTIVE";
    delete records[index].deactivatedAt;
    delete records[index].deactivatedBy;

    writeUsersFile(records);
  });
}

/** Admin resets a user's password */
export async function adminResetPassword(
  username: string,
  newPassword: string,
): Promise<void> {
  if (newPassword.length < 8) throw new Error("Password minimal 8 karakter.");

  const newHash = await hashCrewAccessPassword(newPassword);

  return withUserFileLock(async () => {
    const records = getMergedUserRecords();
    const index = records.findIndex(
      (r) => String(r.username ?? "").toLowerCase() === username.toLowerCase(),
    );
    if (index < 0) throw new Error("User tidak ditemukan.");

    records[index].passwordHash = newHash;
    delete records[index].password;

    writeUsersFile(records);
  });
}

export function getCrewAccessConfigStatus(): { ok: boolean; message: string } {
  try {
    const hasEnvJson = !!process.env.CREW_ACCESS_USERS_JSON?.trim();
    const hasEnvSecret = !!process.env.CREW_ACCESS_SECRET?.trim();
    console.log(
      "[crew-access] Config check — CREW_ACCESS_USERS_JSON ada:",
      hasEnvJson,
      "| CREW_ACCESS_SECRET ada:",
      hasEnvSecret,
    );

    const users = getCrewAccessUsers();
    console.log("[crew-access] Users loaded:", users.length);

    if (users.length === 0) {
      return {
        ok: false,
        message:
          "Konfigurasi crew access belum ada. Isi CREW_ACCESS_USERS_JSON atau runtime/crew-access-users.json.",
      };
    }
    getSecret();
    return { ok: true, message: "" };
  } catch (error) {
    console.error("[crew-access] Config status error:", error);
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Konfigurasi auth tidak valid.",
    };
  }
}
