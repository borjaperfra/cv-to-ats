const NAN_BASE = 'https://api.nan.builders/v1'
const NAN_MODEL = 'gemma4'

export async function nanComplete(prompt: string): Promise<string> {
  if (!process.env.NAN_API_KEY) {
    throw new Error('NAN_API_KEY environment variable is not set.')
  }

  const res = await fetch(`${NAN_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.NAN_API_KEY}`,
    },
    body: JSON.stringify({
      model: NAN_MODEL,
      temperature: 0,
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
}
