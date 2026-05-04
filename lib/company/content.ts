import type { CompanyPageContent, SectionDefinition } from './types'

const sections: SectionDefinition[] = [
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
  {
    id: 'problem',
    type: 'problem',
    visible: true,
    background: 'blue-50',
    blocks: [
      {
        blockType: 'feature-card',
        icon: 'clipboard',
        titleKey: 'problem.card1.title',
        bodyKey: 'problem.card1.body',
      },
      {
        blockType: 'feature-card',
        icon: 'users',
        titleKey: 'problem.card2.title',
        bodyKey: 'problem.card2.body',
      },
      {
        blockType: 'feature-card',
        icon: 'eye-off',
        titleKey: 'problem.card3.title',
        bodyKey: 'problem.card3.body',
      },
    ],
  },
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
      },
      {
        blockType: 'step-item',
        number: 3,
        titleKey: 'how.step3.title',
        bodyKey: 'how.step3.body',
        isLast: true,
      },
    ],
  },
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
        tags: ['C', 'CE', 'D', 'C+D', 'CE+D'],
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
        tags: ['YKB', 'Regelbaserad matchning', 'Rankat urval'],
        cta: {
          labelKey: 'audience.company.cta',
          href: { type: 'anchor', id: 'cta' },
          variant: 'link',
        },
      },
    ],
  },
  {
    id: 'media',
    type: 'media',
    visible: false,
    background: 'white',
    blocks: [],
  },
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
]

export const companyPageContent: CompanyPageContent = {
  meta: {
    titleKey: 'meta.title',
    descriptionKey: 'meta.description',
  },
  nav: {
    brandName: 'DriverNord',
    links: [
      { labelKey: 'nav.link.how', href: { type: 'anchor', id: 'how-it-works' } },
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
