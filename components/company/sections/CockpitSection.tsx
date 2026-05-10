import type { FeatureCardBlock, SectionDefinition, TranslationMap } from '@/lib/company/types'
import Icon from '../blocks/Icon'

interface Props {
  section: SectionDefinition
  t: TranslationMap
}

function CockpitCard({ icon, titleKey, bodyKey, t }: FeatureCardBlock & { t: TranslationMap }) {
  return (
    <div className="bg-blue-800 border border-blue-700 rounded-xl p-6 flex flex-col gap-3">
      <div className="text-blue-400">
        <Icon name={icon} className="w-6 h-6" />
      </div>
      <h3 className="text-white font-semibold text-base">{t[titleKey]}</h3>
      <p className="text-blue-200 text-sm leading-relaxed">{t[bodyKey]}</p>
    </div>
  )
}

export default function CockpitSection({ section, t }: Props) {
  const cards = section.blocks.filter(
    (b): b is FeatureCardBlock => b.blockType === 'feature-card',
  )

  return (
    <section id={section.id} className="bg-blue-900">
      <div className="max-w-5xl mx-auto px-5 py-20 md:py-24">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-4">
              {t['cockpit.eyebrow']}
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              {t['cockpit.headline']}
            </h2>
            <p className="text-blue-200 max-w-xl">{t['cockpit.subtext']}</p>
          </div>
          {/* System badge */}
          <div className="flex-shrink-0">
            <span className="inline-flex items-center gap-2 bg-blue-800 border border-blue-700 text-blue-300 text-xs font-mono px-3 py-2 rounded-md">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              {t['cockpit.badge'] ?? 'system_status: active'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cards.map((card, i) => (
            <CockpitCard key={i} {...card} t={t} />
          ))}
        </div>

        <p className="text-blue-500 text-xs mt-8 max-w-xl">{t['cockpit.note']}</p>
      </div>
    </section>
  )
}
