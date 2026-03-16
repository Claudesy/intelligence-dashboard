<!-- Claudesy's vision, brought to life. -->

# Contributing Guide

Thank you for contributing to the Puskesmas Intelligence Dashboard. This is an internal healthcare system for UPTD Puskesmas PONED Balowerti — contributions must meet rigorous standards for correctness, security, and patient safety.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Prerequisites](#prerequisites)
- [Development Setup](#development-setup)
- [Branching Strategy](#branching-strategy)
- [Commit Conventions](#commit-conventions)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Security Guidelines](#security-guidelines)
- [Clinical Safety Guidelines](#clinical-safety-guidelines)

---

## Code of Conduct

All contributors must read and follow our [Code of Conduct](CODE_OF_CONDUCT.md). We maintain a respectful, inclusive environment.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 20.9.0 (22.x recommended) |
| npm | ≥ 10.x |
| PostgreSQL | ≥ 15 |
| Git | ≥ 2.40 |

---

## Development Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd intelligence-dashboard

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local with your local values

# 4. Run database migrations
npm run db:migrate

# 5. (Optional) Seed test data
npm run seed

# 6. Start the development server
npm run dev
```

The app runs at `http://localhost:7000` by default.

---

## Branching Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code. Protected — direct pushes forbidden. |
| `feature/<slug>` | New features |
| `fix/<slug>` | Bug fixes |
| `chore/<slug>` | Maintenance, dependency updates |
| `docs/<slug>` | Documentation only |
| `refactor/<slug>` | Refactoring with no behaviour change |

Branch names must be lowercase, hyphen-separated, and descriptive (e.g. `feature/telemedicine-recording`).

---

## Commit Conventions

This project follows [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

```
<type>(<scope>): <short summary>

[optional body]

[optional footer(s)]
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `chore` | Build process, tooling, dependency updates |
| `docs` | Documentation changes only |
| `refactor` | Code restructuring with no behaviour change |
| `test` | Adding or correcting tests |
| `perf` | Performance improvements |
| `security` | Security hardening or vulnerability fixes |
| `ci` | CI/CD pipeline changes |

### Scopes (examples)

`auth`, `cdss`, `emr`, `telemedicine`, `dashboard`, `voice`, `lb1`, `acars`, `icdx`, `server`, `db`, `deps`

### Examples

```
feat(telemedicine): add session recording with audit trail
fix(auth): prevent timing leak in session token comparison
security(deps): upgrade xlsx to 0.20.x to patch prototype pollution
docs(api): add OpenAPI spec for /api/cdss/diagnose
```

---

## Pull Request Process

1. **Branch** off `main` using the branching convention above.
2. **Develop** with short, focused commits following the convention.
3. **Test** — all existing tests must pass, and new code must have tests.
4. **Lint** — `npm run lint` must return zero errors.
5. **Self-review** — review your own diff before requesting a review.
6. **Open PR** using the PR template. Fill in all required sections.
7. **Request review** from at least one maintainer.
8. **Squash and merge** — maintainer will squash commits on merge.

### PR Size Guidelines

- Aim for PRs under 400 lines of changes.
- Split large changes into stacked PRs where possible.
- Do not combine unrelated changes in a single PR.

---

## Testing Requirements

- All new features must include unit tests.
- All bug fixes must include a regression test.
- Clinical logic (CDSS, NEWS-2, calculators) requires exhaustive boundary-value tests.
- Run the full test suite before opening a PR:

```bash
npm test          # full suite
npm run lint      # TypeScript type-check
```

Target: **≥ 80% branch coverage** for new code in `src/lib/`.

---

## Security Guidelines

- **No hardcoded secrets** — use environment variables only.
- **No plaintext passwords** — use scrypt hashing via `hashCrewAccessPassword`.
- **Validate all inputs** — use Zod schemas at API boundaries.
- **Use parameterised queries** — Prisma handles this by default; never use raw template strings with user input.
- **Follow the principle of least privilege** — check RBAC before any data mutation.
- **Report vulnerabilities privately** — see [SECURITY.md](SECURITY.md).

---

## Clinical Safety Guidelines

This system is used in a primary healthcare facility. Clinical logic errors can directly harm patients.

- Any change to CDSS, NEWS-2, medical calculators, or drug formulary logic **requires a clinical review** from dr. Ferdi Iskandar before merge.
- Do not modify ICD-10 mappings without cross-referencing the WHO ICD-10 reference.
- Do not reduce diagnostic confidence thresholds without documented clinical justification.
- AI-generated clinical suggestions (Audrey, CDSS) must always be labelled as decision support — never as definitive diagnoses.

---

## Questions?

Contact the maintainer: dr. Ferdi Iskandar — see `README.md` for contact details.
