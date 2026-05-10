import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI-agenter — DriverNord',
  description:
    'Hur DriverNords autonoma agenter kvalificerar, matchar och loggar CE-förare inom tung transport — utan manuell handpåläggning.',
}

export default function AiAgenterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
