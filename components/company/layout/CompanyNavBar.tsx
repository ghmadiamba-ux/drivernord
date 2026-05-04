import Link from 'next/link'
import type { Lang, NavConfig, TranslationMap } from '@/lib/company/types'
import LangSwitcher from './LangSwitcher'
import CTAButtonBlock from '../blocks/CTAButtonBlock'

interface Props {
  nav: NavConfig
  lang: Lang
  setLang: (lang: Lang) => void
  t: TranslationMap
}

function resolveNavHref(href: NavConfig['links'][0]['href']): string {
  if (href.type === 'internal') return href.path
  if (href.type === 'anchor') return `#${href.id}`
  if (href.type === 'mailto') return `mailto:${href.email}`
  return href.url
}

export default function CompanyNavBar({ nav, lang, setLang, t }: Props) {
  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-blue-100">
      <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link href="/company" className="text-blue-900 font-bold text-lg flex-shrink-0">
          {nav.brandName}
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          {nav.links.map((link) => (
            <a
              key={link.labelKey}
              href={resolveNavHref(link.href)}
              className="text-blue-700 hover:text-blue-900 transition-colors"
            >
              {t[link.labelKey]}
            </a>
          ))}
        </div>

        {/* Right side: lang switcher + CTA */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <LangSwitcher lang={lang} setLang={setLang} />
          <div className="hidden sm:block">
            <CTAButtonBlock button={nav.cta} t={t} />
          </div>
        </div>
      </div>
    </nav>
  )
}
