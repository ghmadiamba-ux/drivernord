import type { SectionDefinition, TranslationMap } from '@/lib/company/types'
import HeroSection from './sections/HeroSection'
import ProblemSection from './sections/ProblemSection'
import HowItWorksSection from './sections/HowItWorksSection'
import DifferentiationSection from './sections/DifferentiationSection'
import AudienceSection from './sections/AudienceSection'
import MediaSection from './sections/MediaSection'
import CredibilitySection from './sections/CredibilitySection'
import CTASection from './sections/CTASection'

interface Props {
  section: SectionDefinition
  t: TranslationMap
}

export default function SectionRenderer({ section, t }: Props) {
  if (!section.visible) return null

  switch (section.type) {
    case 'hero':
      return <HeroSection section={section} t={t} />
    case 'problem':
      return <ProblemSection section={section} t={t} />
    case 'how-it-works':
      return <HowItWorksSection section={section} t={t} />
    case 'differentiation':
      return <DifferentiationSection section={section} t={t} />
    case 'audience':
      return <AudienceSection section={section} t={t} />
    case 'media':
      return <MediaSection section={section} t={t} />
    case 'credibility':
      return <CredibilitySection section={section} t={t} />
    case 'cta':
      return <CTASection section={section} t={t} />
    default:
      return null
  }
}
