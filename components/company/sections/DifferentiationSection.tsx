import type { ComparisonTableBlock, SectionDefinition, TranslationMap } from '@/lib/company/types'
import ComparisonTable from '../blocks/ComparisonTable'

interface Props {
  section: SectionDefinition
  t: TranslationMap
}

export default function DifferentiationSection({ section, t }: Props) {
  const tableBlock = section.blocks.find(
    (b): b is ComparisonTableBlock => b.blockType === 'comparison-table',
  )

  return (
    <section id={section.id} className="bg-blue-900">
      <div className="max-w-5xl mx-auto px-5 py-20 md:py-24">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-300 mb-4">
          {t['diff.eyebrow']}
        </p>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
          {t['diff.headline']}
        </h2>
        <p className="text-blue-200 mb-10 max-w-2xl">{t['diff.subtext']}</p>

        {tableBlock && <ComparisonTable block={tableBlock} t={t} />}
      </div>
    </section>
  )
}
