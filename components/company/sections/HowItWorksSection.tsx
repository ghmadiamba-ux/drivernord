import type { SectionDefinition, StepItemBlock, TranslationMap } from '@/lib/company/types'
import StepItem from '../blocks/StepItem'

interface Props {
  section: SectionDefinition
  t: TranslationMap
}

export default function HowItWorksSection({ section, t }: Props) {
  const steps = section.blocks.filter(
    (b): b is StepItemBlock => b.blockType === 'step-item',
  )

  return (
    <section id={section.id} className="bg-white">
      <div className="max-w-5xl mx-auto px-5 py-20 md:py-24">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-4">
          {t['how.eyebrow']}
        </p>
        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-12">
          {t['how.headline']}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0">
          {steps.map((step, i) => (
            <StepItem
              key={i}
              number={step.number}
              titleKey={step.titleKey}
              bodyKey={step.bodyKey}
              isLast={step.isLast}
              t={t}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
