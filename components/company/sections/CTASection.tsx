import type { CTAButtonBlock as CTAButtonBlockType, SectionDefinition, TranslationMap } from '@/lib/company/types'
import CTAButtonBlock from '../blocks/CTAButtonBlock'

interface Props {
  section: SectionDefinition
  t: TranslationMap
}

export default function CTASection({ section, t }: Props) {
  const ctaBlocks = section.blocks.filter(
    (b): b is CTAButtonBlockType => b.blockType === 'cta-button',
  )

  return (
    <section id={section.id} className="bg-blue-900">
      <div className="max-w-5xl mx-auto px-5 py-20 md:py-24">
        <div className="max-w-2xl mx-auto text-center flex flex-col items-center gap-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-300">
            {t['cta.eyebrow']}
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-white">{t['cta.headline']}</h2>
          <p className="text-blue-200 text-lg">{t['cta.subtext']}</p>
          <p className="text-blue-300 text-sm">{t['cta.urgency']}</p>

          <div className="flex flex-col sm:flex-row gap-3 mt-2 w-full sm:w-auto">
            {ctaBlocks.map((block, i) => (
              <CTAButtonBlock key={i} button={block.button} t={t} onDark />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
