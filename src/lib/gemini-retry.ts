const MAX_RETRIES = 2
const BASE_DELAY_MS = 1_000
const CALL_TIMEOUT_MS = 55_000

function isRetryable(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const msg = error.message
  return (
    msg.includes('429') ||
    msg.includes('503') ||
    msg.includes('500') ||
    msg.includes('Resource exhausted') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('quota')
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function withGeminiRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini request timed out after 30s')), CALL_TIMEOUT_MS)
      )
      return await Promise.race([fn(), timeout])
    } catch (error) {
      if (attempt === MAX_RETRIES || !isRetryable(error)) throw error
      await sleep(BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 200)
    }
  }
  throw new Error('unreachable')
}
