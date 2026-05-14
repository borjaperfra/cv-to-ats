const NAN_BASE = 'https://api.nan.builders/v1'
const NAN_MODEL = 'gemma4'
const FETCH_TIMEOUT_MS = 80_000

export async function nanComplete(prompt: string): Promise<string> {
  if (!process.env.NAN_API_KEY) {
    throw new Error('NAN_API_KEY environment variable is not set.')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(`${NAN_BASE}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NAN_API_KEY}`,
      },
      body: JSON.stringify({
        model: NAN_MODEL,
        temperature: 0,
        seed: 42,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`NaN API error ${res.status}: ${body}`)
    }

    const data = await res.json() as { choices: Array<{ message: { content: string } }> }
    return data.choices[0].message.content
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('NaN API request timed out after 80s')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}
