import type { AudienceCardBlock, TranslationMap } from '@/lib/company/types'
import CTAButtonBlock from './CTAButtonBlock'

interface Props {
  block: AudienceCardBlock
  t: TranslationMap
}

export default function AudienceCard({ block, t }: Props) {
  const accentColor = block.audience === 'driver' ? 'border-l-blue-600' : 'border-l-blue-900'

  return (
    <div className={`bg-white rounded-2xl shadow-sm p-8 flex flex-col gap-5 border-l-4 ${accentColor}`}>
      <span className="text-xs font-semibold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-3 py-1 self-start">
        {t[block.eyebrowKey]}
      </span>
      <div>
        <h3 className="text-blue-900 font-bold text-xl mb-2">{t[block.titleKey]}</h3>
        <p className="text-gray-700 text-sm leading-relaxed">{t[block.bodyKey]}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {block.tags.map((tag) => (
          <span
            key={tag}
            className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-3 py-1"
          >
            {tag}
          </span>
        ))}
      </div>
      <CTAButtonBlock button={block.cta} t={t} />
    </div>
  )
}
