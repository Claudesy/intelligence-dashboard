<!-- Claudesy's vision, brought to life. -->

# Contributing to Intelligence Dashboard

_Designed and constructed by Claudesy._

Thank you for your interest in contributing to the Intelligence Dashboard — a clinical information system serving frontline healthcare workers at UPTD Puskesmas PONED Balowerti, Kota Kediri, Indonesia.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Testing](#testing)
- [Clinical Safety](#clinical-safety)

---

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

---

## Getting Started

### Prerequisites

- Node.js 22 LTS (`node --version` should show `v22.x.x`)
- npm 10+
- PostgreSQL 15+
- Git

### Local Setup

```bash
# Clone the repository
git clone <repository-url>
cd intelligence-dashboard

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your local credentials

# Set up the database
npm run db:migrate

# Seed initial data (optional)
npm run seed

# Start development server
npm run dev
```

The application will be available at `http://localhost:7000`.

---

## Development Workflow

1. **Create a feature branch** from `master`:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes** following the [Code Style](#code-style) guidelines.

3. **Write or update tests** for your changes.

4. **Run the full test suite** before committing:
   ```bash
   npm test
   npm run lint
   ```

5. **Commit your changes** following the [Commit Convention](#commit-convention).

6. **Push your branch** and open a Pull Request.

---

## Commit Convention

This project uses **Conventional Commits**. See [COMMIT_CONVENTION.md](COMMIT_CONVENTION.md) for full details.

**Format:**
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
| Type       | Description                                    |
|------------|------------------------------------------------|
| `feat`     | New feature                                    |
| `fix`      | Bug fix                                        |
| `docs`     | Documentation changes only                    |
| `style`    | Formatting, no logic change                   |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test`     | Adding or updating tests                       |
| `chore`    | Build process, dependency updates              |
| `perf`     | Performance improvement                        |
| `security` | Security fix or hardening                      |
| `clinical` | Changes to clinical logic (CDSS, protocols)   |

**Examples:**
```
feat(cdss): add drug interaction checker
fix(auth): prevent session replay on logout
clinical(cdss): update hypertension treatment protocol
security(auth): reduce session TTL to 8 hours
```

---

## Pull Request Process

1. Ensure your PR targets the `master` branch.
2. Fill in the PR template completely.
3. All CI checks must pass (lint, test, build, security-scan).
4. Request review from at least one maintainer.
5. Clinical logic changes **must** be reviewed by a clinical expert or the project medical advisor.
6. Squash-merge preferred for feature branches.

---

## Code Style

### TypeScript

- Strict mode is enforced (`tsconfig.json`)
- Use `interface` over `type` for object shapes
- Prefer `const` assertions where applicable
- No `any` types without explicit justification comment
- Follow Next.js App Router conventions for server/client components

### Naming Conventions

| Context        | Convention       | Example                    |
|----------------|------------------|----------------------------|
| Variables      | camelCase        | `patientQueue`             |
| Functions      | camelCase        | `validateDiagnosis()`      |
| React components | PascalCase     | `DiagnosisModal`           |
| Files (pages)  | kebab-case       | `appointment-booking.tsx`  |
| Constants      | SCREAMING_SNAKE  | `SESSION_TTL`              |
| Types/Interfaces | PascalCase     | `CrewAccessUser`           |

### File Organization

- Keep files under 500 lines where possible
- Extract complex logic into `src/lib/` modules
- Co-locate tests with source files (`*.test.ts` next to `*.ts`)

---

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage
```

Target: **≥80% coverage** for all new code.

Write tests for:
- All API route handlers (`route.ts` files)
- Library utility functions
- React hooks
- Clinical algorithms and ML classifiers

---

## Clinical Safety

> ⚠️ **This system is used in real clinical environments. Changes to clinical logic require extra care.**

- All changes to CDSS (`src/lib/cdss/`), ML classifiers (`src/lib/*.ts`), or treatment protocols must be reviewed by the clinical team.
- Never reduce safety thresholds without clinical approval.
- Add regression tests for any clinical algorithm change.
- Document the clinical basis (guidelines, evidence) in code comments.

---

_Architected and built by the one and only Claudesy._
