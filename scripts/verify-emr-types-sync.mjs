/**
 * Verify EMR bridge types stay in sync between Dashboard (canonical) and Ghost Protocol.
 * Run: node scripts/verify-emr-types-sync.mjs
 *
 * Checks that key shared type names exist in both files.
 * Does NOT require identical code — only that both define the same exported types.
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const CANONICAL = resolve(__dirname, '../src/lib/emr/types.ts')
const MIRROR = resolve(__dirname, '../../../ghost-protocols/utils/types.ts')

const SHARED_TYPES = [
  'PageType',
  'AturanPakai',
  'DiagnosaJenis',
  'DiagnosaKasus',
  'Prioritas',
  'Encounter',
  'ResepMedication',
  'AnamnesaFillPayload',
  'DiagnosaFillPayload',
  'ResepFillPayload',
  'RMETransferPayload',
  'RMETransferResult',
  'RMETransferStepResult',
  'RMETransferStepState',
  'RMETransferState',
  'RMETransferReasonCode',
]

function extractExportedNames(content) {
  const names = new Set()
  const patterns = [
    /export\s+(?:interface|type|enum)\s+(\w+)/g,
    /export\s+(?:const|function|class)\s+(\w+)/g,
  ]
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      names.add(match[1])
    }
  }
  return names
}

try {
  const canonical = readFileSync(CANONICAL, 'utf-8')
  const mirror = readFileSync(MIRROR, 'utf-8')

  const canonicalNames = extractExportedNames(canonical)
  const mirrorNames = extractExportedNames(mirror)

  const missing = []
  for (const name of SHARED_TYPES) {
    const inCanonical = canonicalNames.has(name)
    const inMirror = mirrorNames.has(name)
    if (!inCanonical) missing.push({ name, where: 'canonical (dashboard)' })
    if (!inMirror) missing.push({ name, where: 'mirror (ghost-protocols)' })
  }

  if (missing.length > 0) {
    console.error('EMR type sync check FAILED:')
    for (const m of missing) {
      console.error(`  Missing: ${m.name} in ${m.where}`)
    }
    process.exit(1)
  }

  console.log(`EMR type sync OK — ${SHARED_TYPES.length} shared types verified in both files.`)
} catch (err) {
  console.error('EMR type sync check ERROR:', err.message)
  process.exit(1)
}
