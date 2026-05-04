import type { Lang } from '@/lib/company/types'

interface Props {
  lang: Lang
  setLang: (lang: Lang) => void
}

const LANGS: { code: Lang; label: string; short: string }[] = [
  { code: 'sv', label: 'Svenska', short: 'SV' },
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'fr', label: 'Français', short: 'FR' },
]

export default function LangSwitcher({ lang, setLang }: Props) {
  return (
    <div className="flex items-center gap-1 text-sm">
      {LANGS.map((l, i) => (
        <span key={l.code} className="flex items-center gap-1">
          {i > 0 && <span className="text-blue-200 select-none">|</span>}
          <button
            onClick={() => setLang(l.code)}
            className={
              lang === l.code
                ? 'text-blue-900 font-semibold cursor-default'
                : 'text-blue-400 hover:text-blue-700 cursor-pointer transition-colors'
            }
          >
            <span className="hidden sm:inline">{l.label}</span>
            <span className="sm:hidden">{l.short}</span>
          </button>
        </span>
      ))}
    </div>
  )
}
