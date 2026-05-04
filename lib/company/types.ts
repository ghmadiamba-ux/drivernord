export type Lang = 'sv' | 'en' | 'fr'
export type TranslationMap = Record<string, string>
export type Translations = Record<Lang, TranslationMap>

export type LinkTarget =
  | { type: 'internal'; path: string }
  | { type: 'external'; url: string }
  | { type: 'mailto'; email: string }
  | { type: 'anchor'; id: string }

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonConfig {
  labelKey: string
  href: LinkTarget
  variant: ButtonVariant
  size?: ButtonSize
  openInNewTab?: boolean
}

export type MediaSource =
  | { type: 'local'; path: string }
  | { type: 'external'; url: string }
  | { type: 'embed'; platform: 'youtube' | 'vimeo'; id: string }

export interface ImageConfig {
  src: MediaSource
  alt: string
  aspectRatio?: '16/9' | '4/3' | '1/1' | 'auto'
  objectFit?: 'cover' | 'contain'
}

export interface VideoConfig {
  src: MediaSource
  poster?: MediaSource
  autoplay?: boolean
  muted?: boolean
  loop?: boolean
}

export interface TextBlock {
  blockType: 'text'
  role: 'eyebrow' | 'heading' | 'subheading' | 'body' | 'disclaimer' | 'label'
  contentKey: string
}

export interface ImageBlock {
  blockType: 'image'
  image: ImageConfig
  caption?: string
}

export interface VideoBlock {
  blockType: 'video'
  video: VideoConfig
  caption?: string
}

export interface CTAButtonBlock {
  blockType: 'cta-button'
  button: ButtonConfig
}

export interface FeatureCardBlock {
  blockType: 'feature-card'
  icon: string
  titleKey: string
  bodyKey: string
}

export interface ComparisonRow {
  labelKey: string
  leftKey: string
  rightKey: string
}

export interface ComparisonTableBlock {
  blockType: 'comparison-table'
  leftHeaderKey: string
  rightHeaderKey: string
  rows: ComparisonRow[]
}

export interface StatCardBlock {
  blockType: 'stat-card'
  value: string
  labelKey: string
}

export interface StepItemBlock {
  blockType: 'step-item'
  number: number
  titleKey: string
  bodyKey: string
  isLast?: boolean
}

export interface AudienceCardBlock {
  blockType: 'audience-card'
  audience: 'driver' | 'company'
  eyebrowKey: string
  titleKey: string
  bodyKey: string
  tags: string[]
  cta: ButtonConfig
}

export interface TestimonialPlaceholderBlock {
  blockType: 'testimonial-placeholder'
  visible: false
}

export type Block =
  | TextBlock
  | ImageBlock
  | VideoBlock
  | CTAButtonBlock
  | FeatureCardBlock
  | ComparisonTableBlock
  | StatCardBlock
  | StepItemBlock
  | AudienceCardBlock
  | TestimonialPlaceholderBlock

export type SectionType =
  | 'hero'
  | 'problem'
  | 'how-it-works'
  | 'differentiation'
  | 'audience'
  | 'media'
  | 'credibility'
  | 'cta'

export type SectionBackground =
  | 'white'
  | 'blue-50'
  | 'blue-100'
  | 'blue-900'
  | 'gradient-hero'

export interface SectionDefinition {
  id: string
  type: SectionType
  visible: boolean
  background: SectionBackground
  blocks: Block[]
  paddingY?: 'sm' | 'md' | 'lg'
}

export interface NavLink {
  labelKey: string
  href: LinkTarget
}

export interface NavConfig {
  brandName: string
  links: NavLink[]
  cta: ButtonConfig
}

export interface FooterLink {
  labelKey: string
  href: LinkTarget
}

export interface FooterConfig {
  brand: string
  year: number
  links: FooterLink[]
}

export interface CompanyPageContent {
  meta: {
    titleKey: string
    descriptionKey: string
  }
  nav: NavConfig
  sections: SectionDefinition[]
  footer: FooterConfig
}
