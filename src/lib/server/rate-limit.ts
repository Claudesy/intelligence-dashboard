import 'server-only'

interface RateLimitEntry {
  count: number
  windowStart: number
}

interface RateLimiterOptions {
  maxRequests: number
  windowMs: number
}

class RateLimiter {
  private readonly store = new Map<string, RateLimitEntry>()
  private readonly maxRequests: number
  private readonly windowMs: number

  constructor(options: RateLimiterOptions) {
    this.maxRequests = options.maxRequests
    this.windowMs = options.windowMs
  }

  check(key: string): { allowed: boolean; retryAfterMs: number } {
    const now = Date.now()
    const entry = this.store.get(key)

    if (!entry || now - entry.windowStart >= this.windowMs) {
      this.store.set(key, { count: 1, windowStart: now })
      return { allowed: true, retryAfterMs: 0 }
    }

    if (entry.count >= this.maxRequests) {
      const retryAfterMs = this.windowMs - (now - entry.windowStart)
      return { allowed: false, retryAfterMs }
    }

    entry.count += 1
    return { allowed: true, retryAfterMs: 0 }
  }

  reset(key: string): void {
    this.store.delete(key)
  }
}

/** 5 login attempts per 15 minutes per IP */
export const loginRateLimiter = new RateLimiter({
  maxRequests: 5,
  windowMs: 15 * 60 * 1000,
})

/** 3 registration attempts per hour per IP */
export const registerRateLimiter = new RateLimiter({
  maxRequests: 3,
  windowMs: 60 * 60 * 1000,
})

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}
