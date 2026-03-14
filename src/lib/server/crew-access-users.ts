import "server-only";
import type {
  CrewAccessInstitution,
  CrewAccessProfession,
} from "@/lib/crew-access";

// ⚠️  FILE INI HANYA UNTUK LOCAL DEVELOPMENT
// Production credentials WAJIB diset via env var CREW_ACCESS_USERS_JSON
// Format JSON: [{"username":"...","password":"...","displayName":"...","role":"..."}]
// Jangan pernah commit password nyata ke file ini.

interface CrewUser {
  username: string;
  displayName: string;
  email: string;
  institution: CrewAccessInstitution;
  profession: CrewAccessProfession;
  passwordHash: string;
  role: string;
}

export const CREW_USERS: CrewUser[] = [
  {
    username: "claudesy",
    displayName: "Claudesy",
    email: "claudesy.id@gmail.com",
    institution: "Puskesmas Balowerti Kota Kediri",
    profession: "Dokter",
    role: "CEO",
    passwordHash:
      "scrypt$16384$8$1$M0mghQ0B1wI-TWzZnIIYbg$lsxBbWdqgSAhVrrev9VTDSwB_nUKdybbv6Z0eghYwse8ffFIvvpczPSp5a239NbTs6Vf8Znnte0_8iuj8jAXfw",
  },
];
