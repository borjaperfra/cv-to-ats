'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAnon = pathname === '/admin'

  return (
    <>
      <header className="bg-white border-b sticky top-0 z-10" style={{ borderColor: '#e5e0d8' }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-manfred.svg" alt="Manfred" className="h-7 w-auto" />
            <span className="w-px h-5 bg-gray-200 mx-1" />
            <span className="font-sans font-[900] text-base uppercase tracking-widest" style={{ color: '#092c64' }}>
              ATS Killer
            </span>
            <span
              className="font-sans font-[700] text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: '#01FFC6', color: '#092c64' }}
            >
              Admin
            </span>
          </div>
          <nav className="flex gap-2">
            <Link
              href="/admin"
              className="font-sans font-[700] text-xs uppercase tracking-widest px-4 py-2 rounded-full transition-colors"
              style={isAnon
                ? { backgroundColor: '#092c64', color: '#ffffff' }
                : { backgroundColor: '#f3f4f6', color: '#6b7280' }}
            >
              Anonimizador
            </Link>
            <Link
              href="/admin/feedback"
              className="font-sans font-[700] text-xs uppercase tracking-widest px-4 py-2 rounded-full transition-colors"
              style={!isAnon
                ? { backgroundColor: '#092c64', color: '#ffffff' }
                : { backgroundColor: '#f3f4f6', color: '#6b7280' }}
            >
              Feedback
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </>
  )
}
