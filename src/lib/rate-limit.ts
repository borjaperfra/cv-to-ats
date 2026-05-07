// Simple in-memory rate limiter (per process — fine for a single-instance beta deployment)
// Limits: MAX_REQUESTS per IP within WINDOW_MS

const WINDOW_MS = 60_000      // 1 minute
const MAX_REQUESTS = 10       // requests per window per IP

interface Entry {
  count: number
  resetAt: number
}

const store = new Map<string, Entry>()

// Clean up expired entries every 5 minutes to avoid memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    store.forEach((entry, key) => {
      if (entry.resetAt < now) store.delete(key)
    })
  }, 5 * 60_000)
}

export function checkRateLimit(
  key: string,
  maxRequests = MAX_REQUESTS,
  windowMs = WINDOW_MS
): { allowed: boolean; retryAfter: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfter: 0 }
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }

  entry.count += 1
  return { allowed: true, retryAfter: 0 }
}

function isValidIp(ip: string): boolean {
  return ip.length > 0 && ip.length <= 45 && /^[\d.:a-fA-F]+$/.test(ip)
}

export function getClientIp(request: Request): string {
  const xff = (request.headers as Headers).get('x-forwarded-for')
  if (xff) {
    const ip = xff.split(',')[0].trim()
    if (isValidIp(ip)) return ip
  }
  const realIp = (request.headers as Headers).get('x-real-ip')
  if (realIp) {
    const ip = realIp.trim()
    if (isValidIp(ip)) return ip
  }
  return 'unknown'
}
