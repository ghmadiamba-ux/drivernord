import type { CTAButtonBlock as CTAButtonBlockType, SectionDefinition, TranslationMap } from '@/lib/company/types'
import CTAButtonBlock from '../blocks/CTAButtonBlock'

interface Props {
  section: SectionDefinition
  t: TranslationMap
}

function HeroSVG() {
  return (
    <svg
      viewBox="0 0 280 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-xs"
      aria-hidden
    >
      {/* Left node */}
      <circle cx="44" cy="100" r="20" fill="#60a5fa" fillOpacity="0.9" />
      <circle cx="44" cy="100" r="30" stroke="#93c5fd" strokeWidth="1" strokeOpacity="0.4" />
      {/* Right node */}
      <circle cx="236" cy="100" r="20" fill="#60a5fa" fillOpacity="0.9" />
      <circle cx="236" cy="100" r="30" stroke="#93c5fd" strokeWidth="1" strokeOpacity="0.4" />
      {/* Dashed arc */}
      <path
        d="M 64 100 Q 140 32 216 100"
        stroke="#bfdbfe"
        strokeWidth="2"
        strokeDasharray="7 5"
      />
      {/* Central matching node */}
      <circle cx="140" cy="58" r="12" fill="#2563eb" />
      <circle cx="140" cy="58" r="20" stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.5" />
      {/* Connector lines to central node */}
      <line x1="64" y1="100" x2="128" y2="66" stroke="#60a5fa" strokeWidth="1" strokeOpacity="0.4" />
      <line x1="216" y1="100" x2="152" y2="66" stroke="#60a5fa" strokeWidth="1" strokeOpacity="0.4" />
    </svg>
  )
}

export default function HeroSection({ section, t }: Props) {
  const ctaBlocks = section.blocks.filter(
    (b): b is CTAButtonBlockType => b.blockType === 'cta-button',
  )

  return (
    <section
      id={section.id}
      className="bg-gradient-to-br from-white via-blue-50 to-blue-100"
    >
      <div className="max-w-5xl mx-auto px-5 py-20 md:py-28">
        <div className="flex flex-col md:flex-row md:items-center md:gap-16">
          {/* Left: text + CTAs */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-5">
              {t['hero.eyebrow']}
            </p>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight text-blue-900 mb-6">
              {t['hero.headline']}
            </h1>
            <p className="text-lg text-gray-700 leading-relaxed mb-8 max-w-xl">
              {t['hero.subtext']}
            </p>
            <div className="flex flex-col items-start gap-3">
              {ctaBlocks.map((block, i) => (
                <CTAButtonBlock key={i} button={block.button} t={t} />
              ))}
            </div>
          </div>

          {/* Right: SVG illustration (desktop only) */}
          <div className="hidden md:flex flex-shrink-0 w-72 justify-center items-center">
            <HeroSVG />
          </div>
        </div>
      </div>
    </section>
  )
}
