// Designed and constructed by Claudesy.
import 'server-only'

import path from 'node:path'

export function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value ? value : undefined
}

export function readEnv(name: string, fallback: string): string {
  return readOptionalEnv(name) ?? fallback
}

export function readBooleanEnv(name: string, fallback: boolean): boolean {
  const value = readOptionalEnv(name)
  if (!value) return fallback

  const normalized = value.toLowerCase()
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true
  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false
  return fallback
}

export function resolveRuntimePath(value: string | undefined, fallback: string): string {
  const raw = value?.trim()
  if (!raw) return path.isAbsolute(fallback) ? fallback : path.join(process.cwd(), fallback)
  return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw)
}

export function resolveRuntimePathFromEnv(name: string, fallback: string): string {
  return resolveRuntimePath(readOptionalEnv(name), fallback)
}
