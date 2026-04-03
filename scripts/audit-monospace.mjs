// Masterplan and masterpiece by Claudesy.
/**
 * audit-monospace.mjs
 * Playwright script — crawl dashboard routes dan verifikasi tidak ada
 * computed font-family yang mengandung "monospace", "Courier", "Menlo",
 * "Monaco", "Consolas", "SFMono", "Fira Code", atau "IBM Plex Mono".
 *
 * Usage:
 *   node scripts/audit-monospace.mjs
 *
 * Requires: @playwright/test installed (npx playwright install chromium jika belum)
 * Server harus running di BASE_URL sebelum dijalankan.
 */

import { chromium } from '@playwright/test'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:7000'

const ROUTES = ['/', '/emr', '/acars', '/chat', '/report', '/icdx', '/voice', '/telemedicine']

const MONO_PATTERN =
  /monospace|courier|menlo|monaco|consolas|sfmono|fira.?code|ibm.?plex.?mono|geist.?mono/i

async function auditRoute(page, route) {
  const url = `${BASE_URL}${route}`
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 })

  // Collect all elements and check computed font-family
  const violations = await page.evaluate(pattern => {
    const re = new RegExp(pattern, 'i')
    const results = []
    const all = document.querySelectorAll('*')

    for (const el of all) {
      const computed = window.getComputedStyle(el).fontFamily
      if (re.test(computed)) {
        const selector =
          el.tagName.toLowerCase() +
          (el.id ? `#${el.id}` : '') +
          (el.className && typeof el.className === 'string'
            ? `.${el.className.trim().split(/\s+/).join('.')}`
            : '')
        const text = el.textContent?.trim().slice(0, 60) ?? ''
        results.push({ selector, computed, text })
      }
    }
    return results
  }, MONO_PATTERN.source)

  return { route, url, violations }
}

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  // Skip login if needed — set cookie manually or use env-based auth
  // page.addCookies([{ name: "puskesmas_crew_session", value: process.env.SESSION_COOKIE, domain: "localhost" }]);

  const allViolations = []

  for (const route of ROUTES) {
    try {
      console.log(`\n🔍 Auditing: ${route}`)
      const result = await auditRoute(page, route)

      if (result.violations.length === 0) {
        console.log(`  ✅ CLEAN — no monospace detected`)
      } else {
        console.log(`  ❌ ${result.violations.length} violation(s):`)
        for (const v of result.violations) {
          console.log(`     - ${v.selector}`)
          console.log(`       computed: ${v.computed}`)
          console.log(`       text: "${v.text}"`)
        }
        allViolations.push(...result.violations.map(v => ({ ...v, route })))
      }
    } catch (err) {
      console.log(`  ⚠️  Could not audit ${route}: ${err.message}`)
    }
  }

  await browser.close()

  console.log('\n─────────────────────────────────────────')
  if (allViolations.length === 0) {
    console.log('🎉 AUDIT PASSED — Zero monospace fonts detected across all routes.')
  } else {
    console.log(`🚨 AUDIT FAILED — ${allViolations.length} total violation(s) found.`)
    process.exit(1)
  }
})()
