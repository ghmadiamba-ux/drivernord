import Link from 'next/link'
import type { ButtonConfig, TranslationMap } from '@/lib/company/types'

interface Props {
  button: ButtonConfig
  t: TranslationMap
  onDark?: boolean
}

const sizeClass: Record<string, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-5 py-2.5 text-base',
  lg: 'px-6 py-3 text-base',
}

function variantClass(variant: ButtonConfig['variant'], onDark: boolean): string {
  if (onDark) {
    switch (variant) {
      case 'primary':
        return 'bg-white text-blue-900 hover:bg-blue-50 font-semibold rounded-md transition-colors'
      case 'secondary':
        return 'border border-blue-400 text-blue-200 hover:border-blue-200 hover:text-white font-medium rounded-md transition-colors'
      case 'ghost':
        return 'border border-blue-600 text-blue-300 hover:text-white font-medium rounded-md transition-colors'
      case 'link':
        return 'text-blue-300 hover:text-white underline underline-offset-4 font-medium transition-colors'
    }
  }
  switch (variant) {
    case 'primary':
      return 'bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors'
    case 'secondary':
      return 'border border-blue-600 text-blue-600 hover:bg-blue-50 font-medium rounded-md transition-colors'
    case 'ghost':
      return 'border border-blue-200 text-blue-600 hover:bg-blue-50 font-medium rounded-md transition-colors'
    case 'link':
      return 'text-blue-600 hover:text-blue-800 underline underline-offset-4 font-medium transition-colors'
  }
}

export default function CTAButtonBlock({ button, t, onDark = false }: Props) {
  const label = t[button.labelKey] ?? button.labelKey
  const sz = sizeClass[button.size ?? 'md']
  const isLink = button.variant === 'link'
  const cls = `${variantClass(button.variant, onDark)}${isLink ? '' : ` ${sz}`} inline-flex items-center gap-1`

  const { href } = button

  if (href.type === 'internal') {
    return (
      <Link href={href.path} className={cls}>
        {label}
        {isLink && <span aria-hidden>→</span>}
      </Link>
    )
  }

  const hrefStr =
    href.type === 'anchor'
      ? `#${href.id}`
      : href.type === 'mailto'
      ? `mailto:${href.email}`
      : href.url

  return (
    <a
      href={hrefStr}
      className={cls}
      target={href.type === 'external' && button.openInNewTab ? '_blank' : undefined}
      rel={href.type === 'external' ? 'noopener noreferrer' : undefined}
    >
      {label}
      {isLink && <span aria-hidden>→</span>}
    </a>
  )
}
