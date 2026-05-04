import type { FooterConfig, TranslationMap } from '@/lib/company/types'

interface Props {
  footer: FooterConfig
  t: TranslationMap
}

function resolveHref(href: FooterConfig['links'][0]['href']): string {
  if (href.type === 'internal') return href.path
  if (href.type === 'anchor') return `#${href.id}`
  if (href.type === 'mailto') return `mailto:${href.email}`
  return href.url
}

export default function CompanySiteFooter({ footer, t }: Props) {
  return (
    <footer className="bg-blue-900 border-t border-blue-800">
      <div className="max-w-5xl mx-auto px-5 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-blue-400 text-sm">
          {footer.brand} © {footer.year}
        </p>
        <div className="flex items-center gap-4 text-sm">
          {footer.links.map((link) => (
            <a
              key={link.labelKey}
              href={resolveHref(link.href)}
              className="text-blue-300 hover:text-white transition-colors"
            >
              {t[link.labelKey]}
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
