import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'DriverNord Bemanning — bemanning för transport och logistik',
  description:
    'DriverNord Bemanning hjälper transport-, lager- och logistikföretag i Stockholm/Mälardalen att snabbt täcka tillfälliga personalbehov — med första lanseringsfokus på DriverNord Lagerlucka.',
}

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
