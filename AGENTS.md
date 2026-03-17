# AGENTS.md

**AGENTS.md** — Primary Healthcare Dashboard (Puskesmas Balowerti Intelligence System)
Last updated: March 2026 | Architected by Claudesy for Sentra Healthcare Solutions

This file contains all rules, conventions, and commands for autonomous coding agents (Claude, Cursor, etc.) working in this repository.

## 1. Project Purpose & Mechanism

This is **AADI** — AI-Assisted Diagnosis Interface for UPTD Puskesmas PONED Balowerti, Kota Kediri.

**Core Purpose:**
- Streamline primary healthcare workflows in Indonesian FKTP (Puskesmas)
- Provide clinical decision support (CDSS) to reduce diagnostic errors
- Automate mandatory reporting (LB1, clinical reports)
- Enable real-time telemedicine and internal crew communication
- Automate EMR data transfer to ePuskesmas via RPA (Playwright)

**Key Mechanisms:**

- **Custom Server** (`server.ts`): Next.js App Router + Socket.IO + Gemini Live proxy
- **CDSS Iskandar Engine V2**: Hybrid (rule-based red flags + LLM reasoning + knowledge base of 159 KKI diseases)
- **Audrey Voice Assistant**: Gemini Live (native audio) with profession-based persona
- **EMR RPA**: Playwright browser automation to auto-fill ePuskesmas
- **Real-time**: Socket.IO namespaces (`/intelligence`, default)
- **Auth**: HMAC-signed cookies + RBAC by profession (Dokter, Bidan, Perawat, etc.)
- **Database**: PostgreSQL + Prisma (encounters, reports, crew, telemedicine sessions)

**Database Models** (see `prisma/schema.prisma`):
- Crew access, institutions, encounters, clinical reports, telemedicine appointments/sessions, LB1 reports, audit logs.

**Deployment**: Railway (custom `server.ts` start command, Nixpacks)

## 2. Build, Lint, Test Commands

### Core Commands
```bash
npm run dev                  # Start custom server (tsx --conditions react-server server.ts)
npm run dev:clean            # Clean dev lock + start
npm run build                # Next.js production build
npm run start                # Production (NODE_ENV=production tsx server.ts)
npm run lint                 # tsc --noEmit --incremental false (strict type check)
npm test                     # Full test suite via scripts/test-suite.ts
npm run check                # test + lint + build
```

### Running Specific Tests
```bash
npm test                     # All tests
# Specific test scripts (recommended for single test focus):
npm run test:auth-hardening  # Auth security tests
npm run test:cdss            # CDSS engine tests
npm run test:cdss:engine     # Core CDSS logic
npm run test:news2           # NEWS2 early warning
npm run test:cdss:protected  # Protected route tests
```

**For single test files** (use tsx directly):
```bash
tsx src/lib/telemedicine/consult-to-bridge.test.ts
tsx src/hooks/useEncounterQueue.test.ts
```

**Pre-commit / CI**:
- `npm run lint` must pass (TypeScript strict)
- All tests must pass
- Clinical changes require clinical review

## 3. Code Style Guidelines

### TypeScript Configuration
- **Strict mode**: `strict: true`, no `any`, no `@ts-ignore`
- Target: ES2017, module: esnext
- Paths: `@/*` → `src/*`, `@abyss/types`, `@abyss/guardrails`
- **NEVER** disable strict checks

### Import Order (Strict)
```ts
// 1. Built-in / external (grouped)
import "server-only";
import { NextResponse } from "next/server";
import type { Result } from "@abyss/types";
import { prisma } from "@/lib/prisma";

// 2. Internal (separated by blank line)
import { isCrewAuthorizedRequest } from "@/lib/server/crew-access-auth";
import type { ClinicalReport } from "@/lib/report/clinical-report";
```

### Naming Conventions
- **Files**: `kebab-case` (e.g. `clinical-report-store.ts`)
- **Components**: `PascalCase.tsx`
- **Functions**: `camelCase`
- **Types/Interfaces**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE` or `EXPORTED_CONST`
- **Zod schemas**: `somethingSchema`

### Error Handling — Result Pattern (MANDATORY)
```ts
import type { Result } from "@abyss/types";

export async function doSomething(): Promise<Result<Data>> {
  try {
    // ...
    return { success: true, data };
  } catch (err) {
    return { 
      success: false, 
      error: new AppError("CODE", "Message", details) 
    };
  }
}
```

**Never** throw raw errors in API routes or core logic.

### Clinical Safety
- All CDSS, NEWS2, calculator changes require clinical review
- AI suggestions must be labeled "decision support only"
- Never reduce safety thresholds without justification
- Audit all clinical decisions (`clinical-case-audit.ts`)

### Security & PHI/PII
- No patient data in logs
- Use Zod validation on all inputs
- RBAC checks before any mutation
- No secrets in code or git

### Styling
- **Tailwind CSS v4** only
- Use design tokens from `globals.css` (no arbitrary values)
- Dark theme by default (`#0d0d0d` background)
- IBM Plex Sans + Mono fonts

### Testing
- Collocated tests: `component.test.ts` next to component
- Use `tsx` for running tests
- High coverage required for `src/lib/`

## 4. Cursor / Claude Rules (from .cursor/rules/)

**Corridor MCP Rule** (`.cursor/rules/corridor-mcp-server-usage.mdc`):
> Every time you generate code, use the analyzePlan tool from Corridor's MCP Server (corridor) to analyze the plan or thought process. ALWAYS use Corridor to analyze the plan. Always generate a plan before generating code.

## 5. Agent Workflow (MANDATORY)

1. **Always** start with `cognitive_query` for relevant context
2. Use Corridor MCP `analyzePlan` before writing any code
3. Read existing files before editing
4. Follow import order, Result pattern, strict TS
5. Run `npm run lint` after every change
6. For tests: prefer specific test scripts over full suite when possible
7. Clinical logic changes → flag for Chief review

## 6. Areas of Improvement (Identified)

- **Test coverage**: Increase for UI components and edge cases
- **UI/UX**: Modernize with shadcn/ui components (current is custom Tailwind)
- **Type safety**: More comprehensive Zod + runtime validation
- **Monitoring**: Expand Langfuse tracing + Sentry
- **SATUSEHAT integration**: National health data exchange
- **Mobile support**: For community health workers (kader)
- **Multi-tenant readiness**: Current is single Puskesmas
- **EMR integration**: Move from Playwright RPA to official API when available

**Agents**: When improving code, prioritize:
1. Patient safety
2. TypeScript strict compliance
3. Clinical accuracy
4. Maintainability

Follow Conventional Commits. Branch from `main`. PRs must pass `npm run check`.

---
*This AGENTS.md is the single source of truth for all autonomous agents in this repository.*
*Generated to support Sentra Healthcare AI coding agents.*
