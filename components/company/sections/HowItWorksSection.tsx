import type { SectionDefinition, StepItemBlock, TranslationMap } from '@/lib/company/types'

interface Props {
  section: SectionDefinition
  t: TranslationMap
}

function Step({ number, titleKey, bodyKey, showConnector, t }: StepItemBlock & { showConnector: boolean; t: TranslationMap }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center mb-4 gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
          {number}
        </div>
        {showConnector && (
          <div className="flex-1 border-t-2 border-dashed border-blue-200 hidden md:block" />
        )}
      </div>
      <h3 className="text-blue-900 font-semibold text-base mb-2">{t[titleKey]}</h3>
      <p className="text-gray-700 text-sm leading-relaxed">{t[bodyKey]}</p>
    </div>
  )
}

export default function HowItWorksSection({ section, t }: Props) {
  const steps = section.blocks.filter(
    (b): b is StepItemBlock => b.blockType === 'step-item',
  )

  const useTwoCol = steps.length > 3
  const gridClass = useTwoCol
    ? 'grid grid-cols-1 md:grid-cols-2 gap-8'
    : 'grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0'

  return (
    <section id={section.id} className="bg-white">
      <div className="max-w-5xl mx-auto px-5 py-20 md:py-24">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-4">
          {t['how.eyebrow']}
        </p>
        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-12">
          {t['how.headline']}
        </h2>

        <div className={gridClass}>
          {steps.map((step, i) => {
            const isLastInRow = useTwoCol ? i % 2 === 1 : step.isLast
            return (
              <Step
                key={i}
                {...step}
                showConnector={!isLastInRow && !step.isLast}
                t={t}
              />
            )
          })}
        </div>
      </div>
    </section>
  )
}
