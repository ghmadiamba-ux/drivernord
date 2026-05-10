import type { SectionDefinition, StepItemBlock, TranslationMap } from '@/lib/company/types'

interface Props {
  section: SectionDefinition
  t: TranslationMap
}

function AgentDot({ number, isLast }: { number: number; isLast: boolean }) {
  return (
    <div className="flex flex-col items-center flex-shrink-0">
      <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm z-10 ring-2 ring-blue-200">
        {number}
      </div>
      {!isLast && <div className="w-px flex-1 min-h-8 bg-blue-200 mt-2" />}
    </div>
  )
}

export default function SystemSection({ section, t }: Props) {
  const steps = section.blocks.filter(
    (b): b is StepItemBlock => b.blockType === 'step-item',
  )

  const lastIndex = steps.length - 1

  return (
    <section id={section.id} className="bg-blue-50">
      <div className="max-w-5xl mx-auto px-5 py-20 md:py-24">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-4">
          {t['system.eyebrow']}
        </p>
        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-3">
          {t['system.headline']}
        </h2>
        <p className="text-gray-700 mb-12 max-w-2xl">{t['system.subtext']}</p>

        <div className="flex flex-col gap-0 md:grid md:grid-cols-2 md:gap-x-12 md:gap-y-0">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-4 mb-0">
              <AgentDot number={step.number} isLast={i === lastIndex || (i % 2 === 1 && i < lastIndex - 1)} />
              <div className="pb-8 flex-1 min-w-0">
                <h3 className="text-blue-900 font-semibold text-base mb-1 pt-1.5">
                  {t[step.titleKey]}
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed">{t[step.bodyKey]}</p>
              </div>
            </div>
          ))}
        </div>

        {/* System status line */}
        <div className="mt-4 border-t border-blue-100 pt-6">
          <p className="text-xs text-blue-400 font-mono">{t['system.status'] ?? 'system_status: operational · agents: active · logs: system_actions'}</p>
        </div>
      </div>
    </section>
  )
}
