import type { Metadata } from 'next'
import { Source_Serif_4, Big_Shoulders_Display, Montserrat } from 'next/font/google'
import dynamic from 'next/dynamic'
import './globals.css'

const FeedbackWidget = dynamic(() => import('@/components/FeedbackWidget'), { ssr: false })

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['700', '900'],
  variable: '--font-heading',
  display: 'swap',
})

const bigShoulders = Big_Shoulders_Display({
  subsets: ['latin'],
  weight: ['700', '900'],
  variable: '--font-display',
  display: 'swap',
})

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '800', '900'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ATSKiller — Manfred',
  description: 'Analiza tu CV y descubre si está optimizado para los sistemas ATS de selección de personal. Feedback concreto, puntuación por categorías y recomendaciones accionables.',
  openGraph: {
    title: 'ATSKiller — Manfred',
    description: 'Analiza tu CV. Prepáralo para los ATS. Descubre qué ven los reclutadores antes de que llegues a la primera entrevista.',
    url: 'https://cv-to-ats-production.up.railway.app',
    siteName: 'ATSKiller by Manfred',
    images: [
      {
        url: 'https://cv-to-ats-production.up.railway.app/api/og',
        width: 1200,
        height: 630,
        alt: 'ATSKiller — Analiza tu CV y prepáralo para los ATS',
      },
    ],
    locale: 'es_ES',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ATSKiller — Manfred',
    description: 'Analiza tu CV. Prepáralo para los ATS.',
    images: ['https://cv-to-ats-production.up.railway.app/api/og'],
  },
}

function Footer() {
  return (
    <footer className="no-print border-t py-5 sm:py-8 px-6" style={{ borderColor: '#e5e0d8', backgroundColor: '#f0ede8' }}>
      <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <p className="font-sans font-[700] text-xs uppercase tracking-widest" style={{ color: '#092c64' }}>
            Una herramienta gratuita de{' '}
            <a href="https://getmanfred.com" target="_blank" rel="noopener noreferrer"
              className="underline underline-offset-2 hover:opacity-70 transition-opacity">
              Manfred
            </a>
            {' '}para la comunidad
          </p>
          <p className="font-sans text-xs leading-relaxed" style={{ color: '#9ca3af' }}>
            Manfred es una agencia de recruiting con sentido común y salarios públicos.
            <br />
            Tus datos son tuyos — nada de lo que subas se almacena en nuestros servidores.
          </p>
          <a href="/privacidad"
            className="font-sans text-xs underline underline-offset-2 hover:opacity-70 transition-opacity mt-1 inline-block"
            style={{ color: '#9ca3af' }}>
            Política de privacidad
          </a>
        </div>
        <a href="https://getmanfred.com" target="_blank" rel="noopener noreferrer"
          className="flex-shrink-0 hover:opacity-70 transition-opacity duration-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-manfred.svg" alt="Manfred" style={{ height: 20, width: 'auto', opacity: 0.5 }} />
        </a>
      </div>
    </footer>
  )
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${sourceSerif.variable} ${bigShoulders.variable} ${montserrat.variable}`}>
      <body className="antialiased bg-white text-purple-dark">
        <FeedbackWidget />
        {children}
        <Footer />
      </body>
    </html>
  )
}
