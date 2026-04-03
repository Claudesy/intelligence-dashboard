import 'server-only'
import type { CrewAccessInstitution, CrewAccessProfession } from '@/lib/crew-access'

// ⚠️  FILE INI HANYA UNTUK LOCAL DEVELOPMENT
// Production credentials WAJIB diset via env var CREW_ACCESS_USERS_JSON
// Format JSON: [{"username":"...","password":"...","displayName":"...","role":"..."}]
// Jangan pernah commit password nyata ke file ini.

interface CrewUser {
  username: string
  displayName: string
  email: string
  institution: CrewAccessInstitution
  profession: CrewAccessProfession
  passwordHash: string
  role: string
}

// Placeholder user — passwordHash ini bukan hash asli.
// Set CREW_ACCESS_USERS_JSON atau runtime/crew-access-users.json untuk dev yang nyata.
export const CREW_USERS: CrewUser[] = [
  {
    username: 'dev-user',
    displayName: 'Dev User',
    email: 'dev@local.invalid',
    institution: 'Puskesmas Balowerti Kota Kediri',
    profession: 'Dokter',
    role: 'CEO',
    passwordHash: 'PLACEHOLDER_NOT_A_REAL_HASH',
  },
]
