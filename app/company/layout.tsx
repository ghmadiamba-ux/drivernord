import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'DriverNord — Matchning av förare och åkeriföretag',
  description:
    'DriverNord samlar in strukturerad förarinformation och matchar mot åkeriföretagens krav.',
}

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
