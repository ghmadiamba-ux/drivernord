import type { AudienceCardBlock, SectionDefinition, TranslationMap } from '@/lib/company/types'
import AudienceCard from '../blocks/AudienceCard'

interface Props {
  section: SectionDefinition
  t: TranslationMap
}

export default function AudienceSection({ section, t }: Props) {
  const cards = section.blocks.filter(
    (b): b is AudienceCardBlock => b.blockType === 'audience-card',
  )

  return (
    <section id={section.id} className="bg-blue-100">
      <div className="max-w-5xl mx-auto px-5 py-20 md:py-24">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-4">
          {t['audience.eyebrow']}
        </p>
        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-10">
          {t['audience.headline']}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cards.map((card, i) => (
            <AudienceCard key={i} block={card} t={t} />
          ))}
        </div>
      </div>
    </section>
  )
}
