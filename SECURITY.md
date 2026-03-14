<!-- Claudesy's vision, brought to life. -->

# Security Policy

_Blueprinted & built by Claudesy._

---

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest  | ✅ Yes     |
| < 0.5.0 | ❌ No      |

---

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in the Intelligence Dashboard, please report it responsibly:

1. **Email**: Send details to the project maintainer (see README.md for contact information).
2. **Subject**: `[SECURITY] <brief description>`
3. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Suggested remediation (if known)

You will receive an acknowledgment within **48 hours** and a detailed response within **7 business days**.

We follow a **90-day coordinated disclosure** policy. We will work with you to remediate and disclose the vulnerability responsibly.

---

## Security Architecture

### Authentication

- **Session Management**: HMAC-SHA256 signed session cookies — tamper-proof, no server-side session storage required
- **Password Hashing**: scrypt key derivation (N=16384, r=8, p=1) with random salt — resistant to GPU/ASIC attacks
- **Timing-Safe Comparison**: All credential comparisons use `crypto.timingSafeEqual()` to prevent timing oracle attacks
- **Session Cookies**: `HttpOnly`, `Secure` (production), `SameSite=Strict` flags enforced
- **Session TTL**: 12 hours (43,200 seconds) — review for reduction to 4-8h in future versions
- **Password Policy**: Minimum 15 characters enforced client and server side

### Transport Security

- **HTTPS**: All production traffic served over TLS (enforced by Railway.app infrastructure)
- **CORS**: Restricted to specific allowed origins in production (`server.ts`)
- **WebSocket Auth**: All Socket.IO connections verified via HMAC session cookie middleware

### Data Protection

- **No Secrets in Source**: All credentials and API keys externalized to environment variables
- **Parameterized Queries**: All database operations use Prisma ORM — no raw query string construction
- **Clinical Audit Logs**: All CDSS decisions and clinical case events are audit-logged
- **PII Handling**: Patient data handled per applicable Indonesian healthcare privacy regulations (UU No. 17 Tahun 2023)

### Infrastructure

- **Deployment**: Railway.app managed infrastructure with environment variable secrets
- **Database**: PostgreSQL with connection over TLS
- **No Hardcoded Credentials**: Verified via codebase audit — all credentials in env vars

---

## Known Security Considerations

### EMR Integration Credentials
- **Description**: ePuskesmas EMR login credentials are stored as environment variables (`EMR_USERNAME`, `EMR_PASSWORD`) for Playwright RPA automation.
- **Mitigation**: Credentials are isolated to server-side environment, never exposed to client.
- **Rotation**: Credentials should be rotated quarterly. Notify the DevOps team and update Railway secrets.

### Session Duration
- **Description**: Current session TTL is 12 hours — longer than the recommended ≤15-minute standard for high-sensitivity healthcare systems.
- **Mitigation**: Clinical workflow requirements necessitate longer sessions. Staff are advised to lock their workstations when stepping away.
- **Planned**: TTL reduction to 4-8h with sliding expiry under evaluation.

### Socket.IO Development CORS
- **Description**: Development mode allows all WebSocket origins.
- **Mitigation**: Production `NODE_ENV=production` is enforced on Railway. Never deploy without this env var.

---

## Security Checklist for Contributors

Before submitting a pull request that touches security-sensitive code:

- [ ] No hardcoded credentials, API keys, or tokens in source
- [ ] No secrets in log statements or error messages
- [ ] Input validated with Zod schemas before processing
- [ ] New API routes use `src/lib/server/crew-access-auth.ts` for session verification
- [ ] Database queries use Prisma (no raw SQL string construction)
- [ ] Clinical data access is audit-logged
- [ ] Error responses do not leak internal stack traces or system information

---

## Dependency Security

Dependencies are audited with:

```bash
npm audit --audit-level=moderate
```

This runs automatically in the CI/CD pipeline on every pull request. Pull requests introducing vulnerable dependencies will fail the security-scan job.

For reporting vulnerabilities in third-party dependencies, please report to the respective upstream project and notify us so we can plan an upgrade.

---

_Architected and built by the one and only Claudesy._
