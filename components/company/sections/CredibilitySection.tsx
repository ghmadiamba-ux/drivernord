import type { SectionDefinition, StatCardBlock, TranslationMap } from '@/lib/company/types'
import StatCard from '../blocks/StatCard'

interface Props {
  section: SectionDefinition
  t: TranslationMap
}

export default function CredibilitySection({ section, t }: Props) {
  const stats = section.blocks.filter(
    (b): b is StatCardBlock => b.blockType === 'stat-card',
  )

  return (
    <section id={section.id} className="bg-white">
      <div className="max-w-5xl mx-auto px-5 py-16 md:py-20">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-10 text-center">
          {t['cred.eyebrow']}
        </p>

        <div className="flex flex-col md:flex-row items-center justify-center divide-y md:divide-y-0 md:divide-x divide-blue-100">
          {stats.map((stat, i) => (
            <StatCard key={i} value={stat.value} labelKey={stat.labelKey} t={t} />
          ))}
        </div>

        <p className="text-xs text-blue-400 text-center mt-10">{t['cred.disclaimer']}</p>
      </div>
    </section>
  )
}
