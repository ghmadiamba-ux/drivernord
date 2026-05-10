import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'DriverNord — Hitta kvalificerade chaufförer snabbare',
  description:
    'DriverNord samlar in och kvalificerar chaufförsprofiler med körkort C/CE/D och YKB. Du får ett strukturerat underlag — redo för kontakt.',
}

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
