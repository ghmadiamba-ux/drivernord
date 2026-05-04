import type { FeatureCardBlock, SectionDefinition, TranslationMap } from '@/lib/company/types'
import FeatureCard from '../blocks/FeatureCard'

interface Props {
  section: SectionDefinition
  t: TranslationMap
}

export default function ProblemSection({ section, t }: Props) {
  const cards = section.blocks.filter(
    (b): b is FeatureCardBlock => b.blockType === 'feature-card',
  )

  return (
    <section id={section.id} className="bg-blue-50">
      <div className="max-w-5xl mx-auto px-5 py-20 md:py-24">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-4">
          {t['problem.eyebrow']}
        </p>
        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-3">
          {t['problem.headline']}
        </h2>
        <p className="text-gray-700 mb-10 max-w-2xl">{t['problem.subtext']}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {cards.map((card, i) => (
            <FeatureCard
              key={i}
              icon={card.icon}
              titleKey={card.titleKey}
              bodyKey={card.bodyKey}
              t={t}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
