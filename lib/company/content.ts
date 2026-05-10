import type { CompanyPageContent, SectionDefinition } from './types'

const sections: SectionDefinition[] = [
  // 1. Hero
  {
    id: 'hero',
    type: 'hero',
    visible: true,
    background: 'gradient-hero',
    blocks: [
      {
        blockType: 'cta-button',
        button: {
          labelKey: 'hero.cta.primary',
          href: { type: 'anchor', id: 'cta' },
          variant: 'primary',
          size: 'lg',
        },
      },
      {
        blockType: 'cta-button',
        button: {
          labelKey: 'hero.cta.secondary',
          href: { type: 'internal', path: '/chat' },
          variant: 'secondary',
          size: 'lg',
        },
      },
      {
        blockType: 'cta-button',
        button: {
          labelKey: 'hero.cta.tertiary',
          href: { type: 'anchor', id: 'how-it-works' },
          variant: 'link',
        },
      },
    ],
  },

  // 2. Market problem
  {
    id: 'problem',
    type: 'problem',
    visible: true,
    background: 'blue-50',
    blocks: [
      {
        blockType: 'feature-card',
        icon: 'phone',
        titleKey: 'problem.card1.title',
        bodyKey: 'problem.card1.body',
      },
      {
        blockType: 'feature-card',
        icon: 'clock',
        titleKey: 'problem.card2.title',
        bodyKey: 'problem.card2.body',
      },
      {
        blockType: 'feature-card',
        icon: 'users',
        titleKey: 'problem.card3.title',
        bodyKey: 'problem.card3.body',
      },
    ],
  },

  // 3. DriverNord system — autonomous agent architecture
  {
    id: 'system',
    type: 'system',
    visible: true,
    background: 'blue-50',
    blocks: [
      {
        blockType: 'step-item',
        number: 1,
        titleKey: 'system.step1.title',
        bodyKey: 'system.step1.body',
      },
      {
        blockType: 'step-item',
        number: 2,
        titleKey: 'system.step2.title',
        bodyKey: 'system.step2.body',
      },
      {
        blockType: 'step-item',
        number: 3,
        titleKey: 'system.step3.title',
        bodyKey: 'system.step3.body',
      },
      {
        blockType: 'step-item',
        number: 4,
        titleKey: 'system.step4.title',
        bodyKey: 'system.step4.body',
      },
      {
        blockType: 'step-item',
        number: 5,
        titleKey: 'system.step5.title',
        bodyKey: 'system.step5.body',
      },
      {
        blockType: 'step-item',
        number: 6,
        titleKey: 'system.step6.title',
        bodyKey: 'system.step6.body',
        isLast: true,
      },
    ],
  },

  // 4. Why transport only — credential depth
  {
    id: 'why-transport',
    type: 'why-transport',
    visible: true,
    background: 'white',
    blocks: [
      {
        blockType: 'feature-card',
        icon: 'license',
        titleKey: 'why.card1.title',
        bodyKey: 'why.card1.body',
      },
      {
        blockType: 'feature-card',
        icon: 'truck',
        titleKey: 'why.card2.title',
        bodyKey: 'why.card2.body',
      },
      {
        blockType: 'feature-card',
        icon: 'id-card',
        titleKey: 'why.card3.title',
        bodyKey: 'why.card3.body',
      },
      {
        blockType: 'feature-card',
        icon: 'clipboard',
        titleKey: 'why.card4.title',
        bodyKey: 'why.card4.body',
      },
      {
        blockType: 'feature-card',
        icon: 'calendar',
        titleKey: 'why.card5.title',
        bodyKey: 'why.card5.body',
      },
      {
        blockType: 'feature-card',
        icon: 'map-pin',
        titleKey: 'why.card6.title',
        bodyKey: 'why.card6.body',
      },
    ],
  },

  // 5. How it works — user-facing 6-step flow
  {
    id: 'how-it-works',
    type: 'how-it-works',
    visible: true,
    background: 'white',
    blocks: [
      {
        blockType: 'step-item',
        number: 1,
        titleKey: 'how.step1.title',
        bodyKey: 'how.step1.body',
      },
      {
        blockType: 'step-item',
        number: 2,
        titleKey: 'how.step2.title',
        bodyKey: 'how.step2.body',
        isLast: true,
      },
      {
        blockType: 'step-item',
        number: 3,
        titleKey: 'how.step3.title',
        bodyKey: 'how.step3.body',
      },
      {
        blockType: 'step-item',
        number: 4,
        titleKey: 'how.step4.title',
        bodyKey: 'how.step4.body',
        isLast: true,
      },
      {
        blockType: 'step-item',
        number: 5,
        titleKey: 'how.step5.title',
        bodyKey: 'how.step5.body',
      },
      {
        blockType: 'step-item',
        number: 6,
        titleKey: 'how.step6.title',
        bodyKey: 'how.step6.body',
        isLast: true,
      },
    ],
  },

  // 6. Cockpit — supervision layer
  {
    id: 'cockpit',
    type: 'cockpit',
    visible: true,
    background: 'blue-900',
    blocks: [
      {
        blockType: 'feature-card',
        icon: 'eye',
        titleKey: 'cockpit.observe.title',
        bodyKey: 'cockpit.observe.body',
      },
      {
        blockType: 'feature-card',
        icon: 'check-circle',
        titleKey: 'cockpit.validate.title',
        bodyKey: 'cockpit.validate.body',
      },
      {
        blockType: 'feature-card',
        icon: 'shield',
        titleKey: 'cockpit.override.title',
        bodyKey: 'cockpit.override.body',
      },
      {
        blockType: 'feature-card',
        icon: 'list',
        titleKey: 'cockpit.audit.title',
        bodyKey: 'cockpit.audit.body',
      },
    ],
  },

  // 7. Driver value + company audience
  {
    id: 'audience',
    type: 'audience',
    visible: true,
    background: 'blue-100',
    blocks: [
      {
        blockType: 'audience-card',
        audience: 'driver',
        eyebrowKey: 'audience.driver.eyebrow',
        titleKey: 'audience.driver.title',
        bodyKey: 'audience.driver.body',
        tags: ['CE', 'C', 'D', 'YKB', '2 min', 'Mobil'],
        cta: {
          labelKey: 'audience.driver.cta',
          href: { type: 'internal', path: '/chat' },
          variant: 'link',
        },
      },
      {
        blockType: 'audience-card',
        audience: 'company',
        eyebrowKey: 'audience.company.eyebrow',
        titleKey: 'audience.company.title',
        bodyKey: 'audience.company.body',
        tags: ['YKB-klassificering', 'Scoringsmotor', 'Cockpit-supervision'],
        cta: {
          labelKey: 'audience.company.cta',
          href: { type: 'anchor', id: 'cta' },
          variant: 'link',
        },
      },
    ],
  },

  // 8. Differentiation — comparison table
  {
    id: 'differentiation',
    type: 'differentiation',
    visible: true,
    background: 'blue-900',
    blocks: [
      {
        blockType: 'comparison-table',
        leftHeaderKey: 'diff.left.header',
        rightHeaderKey: 'diff.right.header',
        rows: [
          { labelKey: 'diff.row1.label', leftKey: 'diff.row1.left', rightKey: 'diff.row1.right' },
          { labelKey: 'diff.row2.label', leftKey: 'diff.row2.left', rightKey: 'diff.row2.right' },
          { labelKey: 'diff.row3.label', leftKey: 'diff.row3.left', rightKey: 'diff.row3.right' },
          { labelKey: 'diff.row4.label', leftKey: 'diff.row4.left', rightKey: 'diff.row4.right' },
          { labelKey: 'diff.row5.label', leftKey: 'diff.row5.left', rightKey: 'diff.row5.right' },
        ],
      },
    ],
  },

  // 9. Credibility markers
  {
    id: 'credibility',
    type: 'credibility',
    visible: true,
    background: 'white',
    blocks: [
      { blockType: 'stat-card', value: 'Stockholm', labelKey: 'cred.stat1.label' },
      { blockType: 'stat-card', value: 'C · CE · D', labelKey: 'cred.stat2.label' },
      { blockType: 'stat-card', value: 'YKB', labelKey: 'cred.stat3.label' },
    ],
  },

  // 10. Final CTA
  {
    id: 'cta',
    type: 'cta',
    visible: true,
    background: 'blue-900',
    blocks: [
      {
        blockType: 'cta-button',
        button: {
          labelKey: 'cta.primary',
          href: { type: 'mailto', email: 'hej@drivernord.se' },
          variant: 'primary',
          size: 'lg',
        },
      },
      {
        blockType: 'cta-button',
        button: {
          labelKey: 'cta.secondary',
          href: { type: 'internal', path: '/chat' },
          variant: 'secondary',
          size: 'lg',
        },
      },
    ],
  },

  // Hidden — media placeholder
  {
    id: 'media',
    type: 'media',
    visible: false,
    background: 'white',
    blocks: [],
  },
]

export const companyPageContent: CompanyPageContent = {
  meta: {
    titleKey: 'meta.title',
    descriptionKey: 'meta.description',
  },
  nav: {
    brandName: 'DriverNord',
    links: [
      { labelKey: 'nav.link.how', href: { type: 'anchor', id: 'system' } },
      { labelKey: 'nav.link.drivers', href: { type: 'anchor', id: 'audience' } },
      { labelKey: 'nav.link.companies', href: { type: 'anchor', id: 'audience' } },
    ],
    cta: {
      labelKey: 'nav.cta',
      href: { type: 'anchor', id: 'cta' },
      variant: 'primary',
      size: 'sm',
    },
  },
  sections,
  footer: {
    brand: 'DriverNord',
    year: 2026,
    links: [
      { labelKey: 'footer.privacy', href: { type: 'anchor', id: 'top' } },
      { labelKey: 'footer.contact', href: { type: 'mailto', email: 'hej@drivernord.se' } },
    ],
  },
}
