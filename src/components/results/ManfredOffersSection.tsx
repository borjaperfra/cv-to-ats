'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ManfredOffer } from '@/app/api/manfred-offers/route'

interface Props {
  skillsDetectadas: string[]
}

interface ScoredOffer {
  offer: ManfredOffer
  matched: string[]
}

function CompanyLogo({ name, logoUrl }: { name: string; logoUrl: string }) {
  const [failed, setFailed] = useState(false)
  const initials = name.slice(0, 2).toUpperCase()
  return (
    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden">
      {logoUrl && !failed ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={logoUrl}
          alt=""
          className="w-full h-full object-contain p-1"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="font-sans font-[900] text-xs text-gray-400">{initials}</span>
      )}
    </div>
  )
}

function offerUrl(offer: ManfredOffer) {
  return `https://www.getmanfred.com/ofertas-empleo/${offer.id}/${offer.slug}`
}

function formatSalary(from: number, to: number, currency: string) {
  if (!from && !to) return null
  const k = (n: number) => `${Math.round(n / 1000)}k`
  if (from && to && from !== to) return `${k(from)}–${k(to)} ${currency}`
  if (from && !to) return `desde ${k(from)} ${currency}`
  if (!from && to) return `hasta ${k(to)} ${currency}`
  return `${k(from)} ${currency}`
}

function formatLocation(remotePercentage: number, locations: string[]): string {
  const city = locations[0] ?? ''
  if (remotePercentage >= 100) return '100% remoto'
  if (remotePercentage > 0) return city ? `Híbrido · ${city}` : 'Híbrido'
  return city ? `Presencial · ${city}` : 'Presencial'
}

function preScore(offer: ManfredOffer, skills: string[]): number {
  const title = offer.position.toLowerCase()
  return skills.filter(s => title.includes(s.toLowerCase())).length
}

async function fetchMatchedSkills(offer: ManfredOffer, skills: string[]): Promise<string[]> {
  try {
    const res = await fetch(`/api/manfred-offer-text?id=${offer.id}&slug=${offer.slug}`)
    if (!res.ok) return []
    const { text } = await res.json() as { text: string }
    if (!text) return []
    const lower = text.toLowerCase()
    return skills.filter(s => lower.includes(s.toLowerCase()))
  } catch {
    return []
  }
}

export default function ManfredOffersSection({ skillsDetectadas }: Props) {
  const router = useRouter()
  const [scored, setScored] = useState<ScoredOffer[]>([])

  useEffect(() => {
    if (!skillsDetectadas.length) return

    fetch('/api/manfred-offers')
      .then(r => r.ok ? r.json() : [])
      .then(async (data: ManfredOffer[]) => {
        if (!Array.isArray(data) || data.length === 0) return

        // Pre-sort by title keyword overlap, take top 6 candidates
        const candidates = [...data]
          .sort((a, b) => preScore(b, skillsDetectadas) - preScore(a, skillsDetectadas))
          .slice(0, 6)

        // Fetch offer text for the top 6 in parallel, match skills
        const results = await Promise.all(
          candidates.map(async offer => ({
            offer,
            matched: await fetchMatchedSkills(offer, skillsDetectadas),
          }))
        )

        // Re-sort by real match count, take top 3
        const top3 = results
          .sort((a, b) => b.matched.length - a.matched.length)
          .slice(0, 3)

        setScored(top3)
      })
      .catch(() => {})
  }, [skillsDetectadas])

  if (scored.length === 0) return null

  const handleCompare = (offer: ManfredOffer) => {
    sessionStorage.setItem('pendingMatchUrl', offerUrl(offer))
    router.push('/match')
  }

  return (
    <div className="no-print">
      <p className="font-sans font-[700] text-xs uppercase tracking-widest text-gray-400 mb-3">
        Ofertas activas en Manfred
      </p>

      <div className="space-y-2">
        {scored.map(({ offer, matched }) => {
          const salary = formatSalary(offer.salaryFrom, offer.salaryTo, offer.currency)
          const pct = skillsDetectadas.length > 0
            ? Math.round((matched.length / skillsDetectadas.length) * 100)
            : 0

          const location = formatLocation(offer.remotePercentage, offer.locations ?? [])
          return (
            <div
              key={offer.id}
              className="bg-white rounded-xl p-4 flex items-center gap-3"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
            >
              <CompanyLogo name={offer.company.name} logoUrl={offer.company.logoUrl} />

              <div className="flex-1 min-w-0">
                <p className="font-sans font-[700] text-sm text-navy truncate">{offer.position}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="font-sans text-xs text-gray-400 truncate">{offer.company.name}</span>
                  {salary && (
                    <>
                      <span className="text-gray-200">·</span>
                      <span className="font-sans text-xs font-[700] text-teal">{salary}</span>
                    </>
                  )}
                  <span className="text-gray-200">·</span>
                  <span className="font-sans text-xs text-gray-400">{location}</span>
                </div>

                {matched.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span
                      className="font-sans font-[700] text-xs px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: '#e6f7f7', color: '#0DA1A4' }}
                    >
                      {pct}% match
                    </span>
                    {matched.slice(0, 4).map(skill => (
                      <span
                        key={skill}
                        className="font-sans text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500"
                      >
                        {skill}
                      </span>
                    ))}
                    {matched.length > 4 && (
                      <span className="font-sans text-xs text-gray-400">+{matched.length - 4}</span>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => handleCompare(offer)}
                className="flex-shrink-0 font-sans font-[700] text-xs px-3 py-1.5 rounded-lg bg-navy text-neon transition-opacity duration-200 hover:opacity-80"
              >
                Comparar →
              </button>
            </div>
          )
        })}
      </div>

      <div className="text-center mt-3">
        <a
          href="https://www.getmanfred.com/ofertas-empleo"
          target="_blank"
          rel="noopener noreferrer"
          className="font-sans text-xs text-gray-400 hover:text-teal transition-colors duration-200"
        >
          Ver todas las ofertas de Manfred →
        </a>
      </div>
    </div>
  )
}
